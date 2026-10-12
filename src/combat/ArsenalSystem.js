import { resolveLevelBand } from './flowInteractions.js';
import { CombatEvent } from './combatEvents.js';
import { ProjectileKind } from '../config/projectilesConfig.js';
import { FighterState } from '../entities/fighterStates.js';

const FULL_TURN = Math.PI * 2;

export class ArsenalSystem {
  constructor(system) {
    this.system = system;
  }

  start(caster, power) {
    const count = resolveLevelBand(caster.flowLevel, power.objectsByTier).objects;
    caster.combat.arsenal = {
      power, time: 0, angle: power.orbit.initialAngle, launchCooldown: 0,
      objects: Array.from({ length: count }, (_, id) => ({ id, offset: id * FULL_TURN / count })),
    };
  }

  update(fighter, dt) {
    const arsenal = fighter.combat.arsenal;
    if (!arsenal) return;
    arsenal.time += dt;
    arsenal.launchCooldown = Math.max(0, arsenal.launchCooldown - dt);
    if (!fighter.isAlive || arsenal.time >= arsenal.power.duration || !arsenal.objects.length) fighter.combat.arsenal = null;
  }

  frontIndex(fighter) {
    const arsenal = fighter.combat.arsenal;
    const angle = arsenal.angle + arsenal.time * FULL_TURN / arsenal.power.orbit.period;
    let index = 0, front = -Infinity;
    for (let i = 0; i < arsenal.objects.length; i++) {
      const x = fighter.facing * Math.cos(angle + arsenal.objects[i].offset);
      if (x > front) { index = i; front = x; }
    }
    return index;
  }

  tryLaunch(fighter) {
    const arsenal = fighter.combat.arsenal;
    if (!this.system.enabled || !arsenal?.objects.length || !fighter.canAct || fighter.combat.rainActive || arsenal.launchCooldown > 0) return false;
    const index = this.frontIndex(fighter);
    const angle = arsenal.angle + arsenal.time * FULL_TURN / arsenal.power.orbit.period + arsenal.objects[index].offset;
    const x = fighter.x + Math.cos(angle) * arsenal.power.orbit.radiusX;
    const y = fighter.y - fighter.height / 2 + Math.sin(angle) * arsenal.power.orbit.radiusY;
    const projectile = this.system.combat.projectiles.spawnArsenal(fighter, arsenal.power, x, y);
    if (!projectile) return false;
    const object = arsenal.objects.splice(index, 1)[0];
    arsenal.launchCooldown = arsenal.power.launchInterval;
    fighter.clearAttack();
    fighter.combat.power = arsenal.power.launch;
    fighter.restartState(FighterState.CASTING);
    this.system.combat.emit(CombatEvent.ARSENAL_LAUNCH, { attacker: fighter, defender: null, attackType: arsenal.power.id, object: object.id, x, y });
    return true;
  }

  block(fighter, projectile, owner) {
    const arsenal = fighter.combat.arsenal;
    if (!arsenal?.objects.length) return false;
    const object = arsenal.objects.splice(this.frontIndex(fighter), 1)[0];
    const projectiles = this.system.combat.projectiles;
    if (projectile.kind === ProjectileKind.SABER) {
      projectiles.turnBack(projectile);
      projectile.hit = true;
    } else projectiles.release(projectile);
    this.system.combat.emit(CombatEvent.ARSENAL_BLOCK, { attacker: owner, defender: fighter, attackType: projectile.source, object: object.id, x: projectile.x, y: projectile.y });
    return true;
  }
}

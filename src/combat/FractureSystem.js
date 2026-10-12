import { FighterState } from '../entities/fighterStates.js';
import { PowerOutcome } from '../config/powersConfig.js';
import { CombatEvent } from './combatEvents.js';
import { getFlowDifference, resolveInteraction } from './flowInteractions.js';

export class FractureSystem {
  constructor(powers) {
    this.powers = powers;
    this.combat = powers.combat;
  }

  launch(caster, target) {
    const power = caster.combat.power;
    const direction = caster.facing;
    const start = caster.x + direction * caster.width / 2;
    const end = direction > 0 ? this.combat.arena.right : this.combat.arena.left;
    const distance = Math.max(0, direction * (end - start));
    const segments = Array.from({ length: Math.ceil(distance / power.segmentLength) }, (_, index) => {
      const near = start + direction * index * power.segmentLength;
      const far = start + direction * Math.min(distance, (index + 1) * power.segmentLength);
      const markTime = index * power.segmentLength / power.speed;
      return { left: Math.min(near, far), right: Math.max(near, far), marked: false, burst: false,
        markTime, impactTime: markTime + power.fractureWarning };
    });
    caster.combat.fracture = { power, direction, time: 0, target: this.combat.projectiles.fighters.indexOf(target), hit: false, segments };
    this.advance(caster, target);
  }

  update(caster, fighters, dt) {
    if (!caster.isAlive) { caster.combat.fracture = null; return; }
    const wave = caster.combat.fracture;
    wave.time += dt;
    this.advance(caster, fighters[wave.target] ?? null);
  }

  advance(caster, target) {
    const wave = caster.combat.fracture;
    const time = wave.time + Number.EPSILON * Math.max(1, wave.time);
    let pending = false;
    for (const segment of wave.segments) {
      if (!segment.marked && time >= segment.markTime) {
        segment.marked = true;
        this.emit(CombatEvent.FRACTURE_CRACK, caster, target, segment);
      }
      if (!segment.burst && time >= segment.impactTime) {
        segment.burst = true;
        const hit = !wave.hit && target?.isAlive && target.grounded && target.x >= segment.left && target.x <= segment.right;
        if (hit) {
          wave.hit = true;
          this.strike(caster, target, wave.power);
        }
        this.emit(CombatEvent.FRACTURE_BURST, caster, target, segment, Boolean(hit));
      }
      pending ||= !segment.burst;
    }
    if (!pending) caster.combat.fracture = null;
  }

  strike(caster, target, power) {
    const interaction = resolveInteraction(this.powers.config.interactions[power.interaction], getFlowDifference(caster, target));
    if (interaction.outcome === PowerOutcome.RESISTED) {
      this.combat.emit(CombatEvent.POWER_RESISTED, this.combat.createPowerContact(caster, target, power, 0));
      return;
    }
    if (this.combat.dealPowerDamage(caster, target, power, power.damage * caster.stats.power.potency * interaction.scale, CombatEvent.POWER_HIT)) {
      target.clearAttack();
      target.vy = -power.launchSpeed;
      target.grounded = false;
      target.combat.stunDuration = power.stagger;
      target.restartState(FighterState.STAGGERED);
    }
  }

  emit(type, caster, target, segment, hit) {
    this.combat.emit(type, { attacker: caster, defender: target, attackType: caster.combat.fracture.power.id,
      x: (segment.left + segment.right) / 2, y: this.combat.arena.floorY, impactTime: segment.impactTime, hit });
  }
}

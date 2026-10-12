import { powersConfig } from '../config/powersConfig.js';
import { projectilesConfig } from '../config/projectilesConfig.js';
import { resolveLevelBand } from '../combat/flowInteractions.js';
import { galleryConfig } from '../config/galleryConfig.js';

export class GalleryTargetController {
  constructor(scene) {
    this.scene = scene;
    this.responded = false;
    this.elapsed = 0;
    this.responseAt = null;
  }

  reset() {
    this.responded = false;
    this.elapsed = 0;
    this.responseAt = null;
  }

  updateIntent(intent, dt) {
    const { fighters, director } = this.scene;
    const [caster, target] = fighters;
    this.elapsed += dt;
    target.clearIntent();
    const behavior = director.selection.target;
    if (behavior === 'blocking') intent.block = true;
    if (behavior === 'airborne') intent.jump = target.grounded && director.phase === 'active';
    if (behavior === 'attacking' && this.scene.demonstratesEscape) {
      intent.lightAttack = director.phase === 'active' && !this.responded;
      this.responded ||= intent.lightAttack;
      return;
    }
    if (behavior === 'attacking') {
      intent.power = director.phase === 'active' && !this.responded;
      this.responded ||= intent.power;
      intent.powerHeld = this.responded && director.phase === 'active' && target.combat.power?.channel === true;
      return;
    }
    if (behavior !== 'barrier' && behavior !== 'absorb') return;
    const response = powersConfig.powers[behavior];
    const incoming = caster.combat.power ?? caster.combat.attack;
    if (incoming !== null && this.responseAt === null && director.phase === 'active') {
      const flight = incoming.projectile ? this.getFlightTime(caster, target, incoming) : 0;
      const delay = behavior === 'absorb' ? Math.max(0, incoming.startup - caster.stateTime + flight - response.startup - galleryConfig.reactionLead) : 0;
      this.responseAt = this.elapsed + delay;
    }
    if (director.phase === 'active' && !this.responded && this.responseAt !== null && this.elapsed + dt + Number.EPSILON >= this.responseAt) {
      intent.power = true;
      this.responded = true;
    }
    intent.powerHeld = behavior === 'barrier' && this.responded && director.phase === 'active';
  }

  getFlightTime(caster, target, incoming) {
    const projectile = incoming.effect === 'throw'
      ? resolveLevelBand(caster.flowLevel, projectilesConfig.throw.sizes)
      : incoming.wave ? projectilesConfig.wave : incoming.effect === 'arsenal' ? projectilesConfig.arsenal : projectilesConfig.saber;
    const gap = Math.abs(target.x - caster.x) - (caster.width + target.width) / 2;
    return Math.max(0, gap - projectile.radius) / projectile.speed;
  }
}

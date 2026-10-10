import { powersConfig } from '../config/powersConfig.js';

export class GalleryTargetController {
  constructor(scene) {
    this.scene = scene;
    this.responded = false;
  }

  reset() {
    this.responded = false;
  }

  updateIntent(intent, dt) {
    const { fighters, director } = this.scene;
    const [caster, target] = fighters;
    target.clearIntent();
    const behavior = director.selection.target;
    if (behavior === 'blocking') intent.block = true;
    if (behavior === 'airborne') intent.jump = target.grounded && director.phase === 'active';
    if (behavior !== 'barrier' && behavior !== 'redirect') return;
    const response = powersConfig.powers[behavior];
    const incoming = caster.combat.power ?? caster.combat.attack;
    const reacting = incoming !== null && director.phase === 'active';
    const delay = behavior === 'redirect' ? Math.max(0, (incoming?.startup ?? 0) - response.startup) : 0;
    if (reacting && !this.responded && caster.stateTime + dt + Number.EPSILON >= delay) {
      intent.power = true;
      this.responded = true;
    }
    intent.powerHeld = behavior === 'barrier' && this.responded && director.phase === 'active';
  }
}

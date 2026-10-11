import { FighterState } from '../entities/fighterStates.js';

export class ChokeSystem {
  constructor(powers) {
    this.powers = powers;
  }

  capture(caster, target, power, durationScale, rate) {
    const fighters = this.powers.combat.projectiles.fighters;
    caster.combat.chokeTarget = fighters.indexOf(target);
    caster.combat.chokeMaxChannel = power.maxChannel * Math.min(1, durationScale);
    target.clearAttack();
    target.combat.chokeSource = fighters.indexOf(caster);
    target.combat.chokeRelease = power.recovery;
    target.combat.chokeY = target.y;
    target.combat.chokeTime = Math.min(caster.combat.chokeMaxChannel, Math.max(0, power.startup + caster.combat.chokeMaxChannel - caster.stateTime));
    target.combat.chokeDamageRate = rate;
    target.combat.statusLevel = caster.flowLevel;
    target.combat.stunDuration = power.maxChannel + power.recovery;
    target.vx = 0;
    target.vy = 0;
    target.restartState(FighterState.STUNNED);
  }

  update(caster, target, fighters, dt) {
    const { combat, stateTime } = caster;
    const { power } = combat;
    if (stateTime < power.startup) return;
    if (combat.powerEndTime > 0) {
      if (stateTime + Number.EPSILON * Math.max(1, stateTime) >= combat.powerEndTime + power.recovery) this.powers.finish(caster);
      return;
    }
    const victim = fighters[combat.chokeTarget];
    const maxChannel = combat.chokeMaxChannel || power.maxChannel;
    if (!caster.intent.powerHeld || caster.flowMeter <= 0 || stateTime >= power.startup + maxChannel
      || target === null || victim && !victim.isAlive) {
      this.end(caster, fighters);
      return;
    }
    if (!combat.chokeAttempted) combat.chokeAttempted = this.powers.affect(caster, target, power, 'active');
    combat.powerTargeted = true;
    caster.vx = 0;
    caster.flowMeter = Math.max(0, caster.flowMeter - power.drainPerSecond * dt);
    const held = fighters[combat.chokeTarget];
    if (held?.isAlive) held.combat.chokeTime = Math.max(0, power.startup + combat.chokeMaxChannel - stateTime);
    if (caster.flowMeter === 0 || held && !held.isAlive || held && held.combat.chokeTime === 0) this.end(caster, fighters);
  }

  end(caster, fighters) {
    const victim = fighters[caster.combat.chokeTarget];
    caster.combat.powerEndTime = caster.stateTime;
    caster.combat.chokeTarget = -1;
    if (victim && victim.combat.chokeSource === fighters.indexOf(caster)) this.powers.combat.statuses.releaseChoke(victim);
  }
}

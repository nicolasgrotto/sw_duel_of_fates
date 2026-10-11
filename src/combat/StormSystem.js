import { FighterState } from '../entities/fighterStates.js';
import { CombatEvent } from './combatEvents.js';
import { resolveLevelBand } from './flowInteractions.js';
import { isInvulnerable } from './hitboxes.js';

export function isStormShieldUp(fighter) {
  const { power } = fighter.combat;
  const phases = power?.stormPhases;
  return fighter.state === FighterState.CHANNELING && phases !== undefined
    && fighter.stateTime >= phases.invocation && fighter.stateTime < phases.invocation + phases.storm;
}

export class StormSystem {
  constructor(powers) {
    this.powers = powers;
    this.combat = powers.combat;
  }

  start(caster) {
    const { combat } = caster;
    const { power } = combat;
    const count = resolveLevelBand(caster.flowLevel, power.strikesByTier).strikes;
    const interval = (power.stormPhases.storm - power.strikeWarning) / (count - 1);
    combat.stormPhase = 'invocation';
    combat.stormMarks = Array.from({ length: count }, (_, index) => ({
      active: false, marked: false, x: 0,
      markTime: power.stormPhases.invocation + index * interval,
      impactTime: power.stormPhases.invocation + power.strikeWarning + index * interval,
    }));
  }

  update(caster, target, fighters) {
    const { combat, stateTime } = caster;
    const { power } = combat;
    const phases = power.stormPhases;
    if (stateTime < phases.invocation) return;
    caster.vx = 0;
    if (!combat.powerTargeted) {
      combat.powerTargeted = true;
      combat.stormTarget = target === null ? -1 : fighters.indexOf(target);
      this.combat.emitAction(CombatEvent.POWER_ACTIVE, caster, power.id);
    }
    const opponent = fighters[combat.stormTarget] ?? null;
    for (let index = 0; index < combat.stormMarks.length; index += 1) {
      const mark = combat.stormMarks[index];
      if (!mark.marked && stateTime + Number.EPSILON * Math.max(1, stateTime) >= mark.markTime) {
        mark.marked = true;
        mark.active = opponent !== null && opponent.isAlive;
        combat.stormNextStrike = index + 1;
        if (mark.active) {
          mark.x = opponent.x + power.strikeOffsets[index % power.strikeOffsets.length];
          this.emit(CombatEvent.STORM_MARK, caster, opponent, mark, false);
        }
      }
      if (mark.active && stateTime + Number.EPSILON * Math.max(1, stateTime) >= mark.impactTime) {
        mark.active = false;
        const hit = opponent !== null && opponent.isAlive && !isInvulnerable(opponent)
          && opponent.left < mark.x + power.strikeWidth / 2 && opponent.right > mark.x - power.strikeWidth / 2;
        if (hit) this.powers.strike(caster, opponent, power, 'strike', null);
        this.emit(CombatEvent.STORM_STRIKE, caster, opponent, mark, hit);
      }
    }
    if (stateTime >= phases.invocation + phases.storm) {
      combat.stormPhase = 'recovery';
      combat.powerEndTime = phases.invocation + phases.storm;
      if (stateTime >= combat.powerEndTime + phases.recovery) this.powers.finish(caster);
    } else {
      combat.stormPhase = 'storm';
    }
  }

  emit(type, caster, target, mark, hit) {
    this.combat.emit(type, {
      attacker: caster, defender: target, attackType: caster.combat.power.id,
      x: mark.x, y: this.combat.arena.floorY, impactTime: mark.impactTime,
      hit: type === CombatEvent.STORM_STRIKE ? hit : undefined,
    });
  }
}

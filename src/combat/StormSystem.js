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
    combat.stormPhase = 'invocation';
    combat.stormMarks = this.createMarks(caster, power, power.stormPhases.invocation, power.stormPhases.storm);
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
    this.updateMarks(caster, opponent, power, combat.stormMarks, stateTime);
    if (stateTime >= phases.invocation + phases.storm) {
      combat.stormPhase = 'recovery';
      combat.powerEndTime = phases.invocation + phases.storm;
      if (stateTime >= combat.powerEndTime + phases.recovery) this.powers.finish(caster);
    } else {
      combat.stormPhase = 'storm';
    }
  }

  createMarks(caster, power, invocation, duration) {
    const count = resolveLevelBand(caster.flowLevel, power.strikesByTier).strikes;
    const interval = (duration - power.strikeWarning) / (count - 1);
    return Array.from({ length: count }, (_, index) => ({
      active: false, marked: false, x: 0,
      markTime: invocation + index * interval,
      impactTime: invocation + power.strikeWarning + index * interval,
    }));
  }

  callRain(caster, target) {
    const { combat } = caster;
    const { power } = combat;
    const phases = power.rainPhases;
    const rain = { power, time: phases.invocation, target: this.combat.projectiles.fighters.indexOf(target),
      phase: 'rain', marks: this.createMarks(caster, power, phases.invocation, phases.rain) };
    this.combat.emitAction(CombatEvent.RAIN_CALL, caster, power.id);
    this.combat.emitAction(CombatEvent.POWER_ACTIVE, caster, power.id);
    caster.clearPower();
    combat.rainActive = true;
    combat.rain = rain;
    caster.setState(FighterState.IDLE);
    this.updateMarks(caster, target, power, rain.marks, rain.time);
  }

  updateRain(caster, fighters, dt) {
    const { combat } = caster;
    const rain = combat.rain;
    if (!caster.isAlive || !rain) {
      combat.rainActive = false;
      combat.rain = null;
      return;
    }
    rain.time += dt;
    this.updateMarks(caster, fighters[rain.target] ?? null, rain.power, rain.marks, rain.time);
    const phases = rain.power.rainPhases;
    if (rain.time + Number.EPSILON * Math.max(1, rain.time) >= phases.invocation + phases.rain) rain.phase = 'recovery';
    if (rain.time + Number.EPSILON * Math.max(1, rain.time) >= phases.invocation + phases.rain + phases.recovery) {
      combat.powerCooldown = rain.power.cooldown ?? this.powers.config.cooldown;
      combat.rainActive = false;
      combat.rain = null;
    }
  }

  updateMarks(caster, opponent, power, marks, stateTime) {
    for (let index = 0; index < marks.length; index += 1) {
      const mark = marks[index];
      if (!mark.marked && stateTime + Number.EPSILON * Math.max(1, stateTime) >= mark.markTime) {
        mark.marked = true;
        mark.active = opponent !== null && opponent.isAlive;
        if (power.stormPhases) caster.combat.stormNextStrike = index + 1;
        if (mark.active) {
          mark.x = opponent.x + power.strikeOffsets[index % power.strikeOffsets.length];
          this.emit(power.markEvent, caster, opponent, mark, false, power);
        }
      }
      if (mark.active && stateTime + Number.EPSILON * Math.max(1, stateTime) >= mark.impactTime) {
        mark.active = false;
        const hit = opponent !== null && opponent.isAlive && !isInvulnerable(opponent)
          && opponent.left < mark.x + power.strikeWidth / 2 && opponent.right > mark.x - power.strikeWidth / 2;
        if (hit) this.powers.strike(caster, opponent, power, 'strike', null, mark.x);
        this.emit(power.strikeEvent, caster, opponent, mark, hit, power);
      }
    }
  }

  emit(type, caster, target, mark, hit, power = caster.combat.power) {
    this.combat.emit(type, {
      attacker: caster, defender: target, attackType: power.id,
      x: mark.x, y: this.combat.arena.floorY, impactTime: mark.impactTime,
      hit: type === power.strikeEvent ? hit : undefined,
    });
  }
}

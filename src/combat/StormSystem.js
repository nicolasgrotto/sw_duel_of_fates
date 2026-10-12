import { FighterState } from '../entities/fighterStates.js';
import { CombatEvent } from './combatEvents.js';
import { resolveLevelBand } from './flowInteractions.js';
import { isBarrierUp } from './PowerSystem.js';
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
    const waves = resolveLevelBand(caster.flowLevel, power.strikesByTier).strikes;
    combat.stormWaveHits = Array(waves).fill(false);
    combat.stormFractureHits = Array(waves).fill(false);
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
    const bolts = power.boltsByTier ? resolveLevelBand(caster.flowLevel, power.boltsByTier).bolts : 1;
    return Array.from({ length: count * bolts }, (_, index) => ({
      wave: Math.floor(index / bolts), bolt: index % bolts,
      active: false, marked: false, x: 0,
      markTime: invocation + Math.floor(index / bolts) * interval,
      impactTime: invocation + power.strikeWarning + Math.floor(index / bolts) * interval,
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
        if (power.stormPhases) caster.combat.stormNextStrike = mark.wave + 1;
        if (mark.active) {
          const wave = mark.wave ?? index;
          const mirror = wave % 2 === 0 ? 1 : -1;
          const offset = power.columnPatterns ? power.columnPatterns[resolveLevelBand(caster.flowLevel, power.boltsByTier).bolts][mark.bolt] * mirror : 0;
          mark.x = opponent.x + power.strikeOffsets[wave % power.strikeOffsets.length] + offset;
          this.emit(power.markEvent, caster, opponent, mark, false, power);
        }
      }
      if (mark.active && stateTime + Number.EPSILON * Math.max(1, stateTime) >= mark.impactTime) {
        mark.active = false;
        const hit = opponent !== null && opponent.isAlive && !isInvulnerable(opponent)
          && opponent.left < mark.x + power.strikeWidth / 2 && opponent.right > mark.x - power.strikeWidth / 2;
        const contact = hit && (!power.boltsByTier || isBarrierUp(opponent) || !caster.combat.stormWaveHits[mark.wave]);
        if (contact) {
          const shielded = isBarrierUp(opponent);
          this.powers.strike(caster, opponent, power, 'strike', null, mark.x);
          if (power.boltsByTier && !shielded) caster.combat.stormWaveHits[mark.wave] = true;
        }
        const fracture = power.fractureByLevel;
        if (fracture && caster.flowLevel >= fracture.minLevel) {
          this.powers.fractures.launchAt(caster, opponent, fracture, mark.x, -1, mark.wave);
          this.powers.fractures.launchAt(caster, opponent, fracture, mark.x, 1, mark.wave);
        }
        this.emit(power.strikeEvent, caster, opponent, mark, contact, power);
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

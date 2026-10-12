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
    caster.combat.fracture = this.createWave(caster, target, power, start, direction, end);
    if (!this.advance(caster, target, caster.combat.fracture)) caster.combat.fracture = null;
  }

  launchAt(caster, target, power, start, direction, group) {
    const end = direction > 0 ? Math.min(this.combat.arena.right, start + power.range)
      : Math.max(this.combat.arena.left, start - power.range);
    const wave = this.createWave(caster, target, power, start, direction, end, group);
    if (this.advance(caster, target, wave)) caster.combat.fractures.push(wave);
  }

  createWave(caster, target, power, start, direction, end, group = null) {
    const distance = Math.max(0, direction * (end - start));
    const segments = Array.from({ length: Math.ceil(distance / power.segmentLength) }, (_, index) => {
      const near = start + direction * index * power.segmentLength;
      const far = start + direction * Math.min(distance, (index + 1) * power.segmentLength);
      const markTime = index * power.segmentLength / power.speed;
      return { left: Math.min(near, far), right: Math.max(near, far), marked: false, burst: false,
        markTime, impactTime: markTime + power.fractureWarning };
    });
    return { power, direction, time: 0, target: this.combat.projectiles.fighters.indexOf(target), hit: false, group, segments };
  }

  update(caster, fighters, dt) {
    if (!caster.isAlive) {
      caster.combat.fracture = null;
      caster.combat.fractures.length = 0;
      return;
    }
    const primary = caster.combat.fracture;
    if (primary) {
      primary.time += dt;
      if (!this.advance(caster, fighters[primary.target] ?? null, primary)) caster.combat.fracture = null;
    }
    const waves = caster.combat.fractures;
    let remaining = 0;
    for (const wave of waves) {
      wave.time += dt;
      if (this.advance(caster, fighters[wave.target] ?? null, wave)) waves[remaining++] = wave;
    }
    waves.length = remaining;
  }

  advance(caster, target, wave) {
    const time = wave.time + Number.EPSILON * Math.max(1, wave.time);
    let pending = false;
    for (const segment of wave.segments) {
      if (!segment.marked && time >= segment.markTime) {
        segment.marked = true;
        this.emit(CombatEvent.FRACTURE_CRACK, caster, target, wave, segment);
      }
      if (!segment.burst && time >= segment.impactTime) {
        segment.burst = true;
        const hit = !wave.hit && !(wave.group !== null && caster.combat.stormFractureHits[wave.group]) && target?.isAlive && target.grounded && target.x >= segment.left && target.x <= segment.right;
        if (hit) {
          wave.hit = true;
          if (wave.group !== null) caster.combat.stormFractureHits[wave.group] = true;
          this.strike(caster, target, wave.power);
        }
        this.emit(CombatEvent.FRACTURE_BURST, caster, target, wave, segment, Boolean(hit));
      }
      pending ||= !segment.burst;
    }
    return pending;
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

  emit(type, caster, target, wave, segment, hit) {
    this.combat.emit(type, { attacker: caster, defender: target, attackType: wave.power.id,
      x: (segment.left + segment.right) / 2, y: this.combat.arena.floorY, impactTime: segment.impactTime, hit });
  }
}

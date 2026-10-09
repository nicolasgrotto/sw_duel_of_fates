import { FighterState } from '../entities/fighterStates.js';
import { spendStamina } from '../systems/StaminaSystem.js';
import { CombatEvent } from './combatEvents.js';

function interrupt(target, state, duration) {
  target.clearAttack();
  target.combat.stunDuration = duration;
  target.restartState(state);
}

function getGap(caster, target) {
  return Math.abs(target.x - caster.x) - (caster.width + target.width) / 2;
}

function applyGuarded(context, damage = context.power.damage) {
  const { combat, caster, target, power, interaction, scale } = context;
  spendStamina(target, power.guard.staminaCost * interaction.guardStamina);
  return combat.dealPowerDamage(caster, target, power, damage * scale * interaction.guardDamage, CombatEvent.POWER_BLOCKED);
}

function getStagger(context) {
  const { power, scale, interaction, air } = context;
  return power.stagger * Math.min(1, scale) * interaction.stagger * air.stagger;
}

function push(context) {
  const { combat, caster, target, power, interaction, scale, guarded } = context;
  const knockback = caster.facing * power.knockback * scale * interaction.knockback;
  if (guarded) {
    target.vx = knockback * interaction.guardSlide;
    applyGuarded(context);
    return;
  }
  target.vx = knockback;
  if (combat.dealPowerDamage(caster, target, power, power.damage * scale, CombatEvent.POWER_HIT)) {
    interrupt(target, FighterState.STAGGERED, getStagger(context));
  }
}

function pull(context) {
  const { system, combat, caster, target, power, interaction, scale, guarded } = context;
  const travel = Math.max(0, getGap(caster, target) - power.endGap);
  const speed = Math.min(power.maxSpeed, Math.sqrt(2 * system.friction * travel)) * Math.min(1, scale) * interaction.knockback;
  if (guarded) {
    target.vx = -caster.facing * speed * interaction.guardSlide;
    applyGuarded(context);
    return;
  }
  target.vx = -caster.facing * speed;
  if (combat.dealPowerDamage(caster, target, power, power.damage * scale, CombatEvent.POWER_HIT)) {
    interrupt(target, FighterState.STAGGERED, getStagger(context));
  }
}

function lightning(context) {
  const { combat, caster, target, power, interaction, air, scale, guarded } = context;
  if (guarded) {
    target.vx = caster.facing * power.knockback * interaction.guardSlide * interaction.knockback;
    applyGuarded(context);
    return;
  }
  target.vx = caster.facing * power.knockback * scale * interaction.knockback;
  if (combat.dealPowerDamage(caster, target, power, power.damage * scale, CombatEvent.POWER_HIT)) {
    interrupt(target, FighterState.HIT, power.stun * interaction.duration * air.duration);
  }
}

function throwImpact(context) {
  const { combat, caster, target, power, interaction, air, scale, guarded, projectile } = context;
  const knockback = (Math.sign(projectile.vx) || caster.facing) * projectile.knockback * scale * interaction.knockback;
  if (guarded) {
    target.vx = knockback * interaction.guardSlide;
    applyGuarded(context, projectile.damage);
    return;
  }
  target.vx = knockback;
  if (combat.dealPowerDamage(caster, target, power, projectile.damage * scale, CombatEvent.POWER_HIT)) {
    interrupt(target, FighterState.STAGGERED, projectile.stagger * Math.min(1, scale) * interaction.stagger * air.stagger);
  }
}

function holdTarget(target, duration) {
  target.vx = 0;
  interrupt(target, FighterState.STUNNED, duration);
}

function getStatusDuration(context) {
  const { power, interaction, air } = context;
  return power.duration * interaction.duration * air.duration;
}

function choke(context) {
  const { combat, caster, target, power, scale, guarded } = context;
  if (guarded) {
    applyGuarded(context);
    return;
  }
  const duration = getStatusDuration(context);
  if (combat.dealPowerDamage(caster, target, power, power.damage * scale, CombatEvent.POWER_HIT)) {
    holdTarget(target, duration);
    target.combat.chokeTime = duration;
    target.combat.chokeDamageRate = power.damagePerSecond * scale;
    target.combat.statusLevel = caster.flowLevel;
  }
}

function freeze(context) {
  const { combat, caster, target, power, guarded } = context;
  if (guarded) {
    applyGuarded(context);
    return;
  }
  const duration = getStatusDuration(context);
  if (combat.dealPowerDamage(caster, target, power, 0, CombatEvent.POWER_HIT)) {
    holdTarget(target, duration);
    target.combat.freezeTime = duration;
    target.combat.statusLevel = caster.flowLevel;
  }
}

function heal(context) {
  const { caster, power, scale } = context;
  const missing = caster.stats.maxHealth - caster.health;
  const amount = Math.min(power.amount * scale, missing * power.maxMissingFraction);
  caster.combat.healTime = power.duration;
  caster.combat.healRate = amount / power.duration;
  caster.combat.healCap = caster.health + amount;
  caster.combat.statusLevel = caster.flowLevel;
}

function focus(context) {
  const { caster, power, scale } = context;
  caster.combat.focusTime = power.duration * scale;
  caster.combat.focusScale = power.staminaScale;
  caster.combat.statusLevel = caster.flowLevel;
}

export const powerEffects = Object.freeze({
  push: { active: push },
  pull: { active: pull },
  lightning: { tick: lightning },
  barrier: {},
  throw: { impact: throwImpact },
  choke: { active: choke },
  freeze: { active: freeze },
  heal: { self: heal },
  focus: { self: focus },
});

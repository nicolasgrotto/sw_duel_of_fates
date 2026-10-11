import { FighterState } from '../entities/fighterStates.js';
import { getStaminaCost } from '../systems/StaminaSystem.js';
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
  combat.spendStamina(target, getStaminaCost(target, power.guard.staminaCost * interaction.guardStamina, 'blockDrain'), 'drain');
  return combat.dealPowerDamage(caster, target, power, damage * scale * interaction.guardDamage, CombatEvent.POWER_BLOCKED);
}

function getStagger(context) {
  const { power, scale, interaction, air } = context;
  return power.stagger * Math.min(1, scale / context.remainder) * interaction.stagger * air.stagger * context.remainder;
}

function push(context) {
  const { combat, caster, target, power, interaction, scale, guarded } = context;
  const direction = power.around ? Math.sign(target.x - caster.x) || caster.facing : caster.facing;
  const knockback = direction * power.knockback * scale * interaction.knockback;
  if (guarded) {
    target.vx = knockback * interaction.guardSlide;
    applyGuarded(context);
    return;
  }
  if (combat.dealPowerDamage(caster, target, power, power.damage * scale, CombatEvent.POWER_HIT)) {
    target.vx = knockback;
    interrupt(target, FighterState.STAGGERED, getStagger(context));
  }
}

function pull(context) {
  const { system, combat, caster, target, power, interaction, scale, guarded } = context;
  const travel = Math.max(0, getGap(caster, target) - power.endGap);
  const speed = Math.min(power.maxSpeed, Math.sqrt(2 * system.friction * travel)) * Math.min(1, scale / context.remainder) * interaction.knockback * context.remainder;
  if (guarded) {
    target.vx = -caster.facing * speed * interaction.guardSlide;
    applyGuarded(context);
    return;
  }
  if (combat.dealPowerDamage(caster, target, power, power.damage * scale, CombatEvent.POWER_HIT)) {
    target.vx = -caster.facing * speed;
    interrupt(target, FighterState.STAGGERED, getStagger(context));
  }
}

function lightning(context) {
  const { combat, caster, target, power, interaction, air, scale, guarded } = context;
  if (guarded) {
    target.vx = caster.facing * power.knockback * interaction.guardSlide * interaction.knockback * context.remainder;
    applyGuarded(context);
    return;
  }
  if (combat.dealPowerDamage(caster, target, power, power.damage * scale, CombatEvent.POWER_HIT)) {
    target.vx = caster.facing * power.knockback * scale * interaction.knockback;
    interrupt(target, FighterState.HIT, power.stun * interaction.duration * air.duration * context.remainder);
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
  if (combat.dealPowerDamage(caster, target, power, projectile.damage * scale, CombatEvent.POWER_HIT)) {
    target.vx = knockback;
    interrupt(target, FighterState.STAGGERED, projectile.stagger * Math.min(1, scale / context.remainder) * interaction.stagger * air.stagger * context.remainder);
  }
}

function holdTarget(target, duration) {
  target.vx = 0;
  interrupt(target, FighterState.STUNNED, duration);
}

function getStatusDuration(context) {
  const { power, interaction, air } = context;
  return power.duration * interaction.duration * air.duration * context.remainder;
}

function choke(context) {
  const { system, combat, caster, target, power, scale, guarded, interaction, air, remainder } = context;
  if (guarded) {
    applyGuarded(context);
    return;
  }
  if (combat.dealPowerDamage(caster, target, power, power.damage * scale, CombatEvent.POWER_HIT)) {
    system.chokes.capture(caster, target, power, interaction.duration * air.duration * remainder, power.damagePerSecond * scale);
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
  const { combat, caster, power, scale } = context;
  const missing = caster.stats.maxHealth - caster.health;
  const amount = Math.min(power.amount * scale, missing * power.maxMissingFraction);
  combat.statuses.start(caster, 'heal', power.duration);
  caster.combat.healRate = amount / power.duration;
  caster.combat.healCap = caster.health + amount;
  caster.combat.statusLevel = caster.flowLevel;
}

function focus(context) {
  const { combat, caster, power, scale } = context;
  combat.statuses.start(caster, 'focus', power.duration * scale);
  caster.combat.focusScale = power.staminaScale;
  caster.combat.statusLevel = caster.flowLevel;
}

function wrath(context) {
  const { combat, caster, power, scale } = context;
  combat.statuses.start(caster, 'wrath', power.duration * scale);
  caster.combat.wrathArmorHits = power.armorHits;
  caster.combat.wrathDamageDealtScale = power.damageDealtScale;
  caster.combat.wrathDamageTakenScale = power.damageTakenScale;
  caster.combat.statusLevel = caster.flowLevel;
}

function drain(context) {
  const { combat, caster, target, power, scale } = context;
  const taken = Math.min(target.flowMeter, power.drainFlow * scale);
  target.flowMeter -= taken;
  caster.flowMeter = Math.min(caster.stats.power.max, caster.flowMeter + taken * power.flowReturn);
  combat.spendStamina(target, power.drainStamina * scale, 'drain');
  combat.emit(CombatEvent.POWER_HIT, combat.createPowerContact(caster, target, power, 0));
}

export const powerEffects = Object.freeze({
  mindTwist: { active: (context) => {
    const { combat, caster, target, power } = context;
    target.combat.confuseTime = getStatusDuration(context);
    target.combat.confuseElapsed = 0;
    target.combat.statusLevel = caster.flowLevel;
    combat.emit(CombatEvent.POWER_HIT, combat.createPowerContact(caster, target, power, 0));
  } },
  drain: { tick: drain },
  absorb: { self: ({ caster, power }) => { caster.combat.absorbTime = power.window; } },
  storm: { strike: (context) => {
    const { combat, caster, target, power, scale, interaction } = context;
    if (combat.dealPowerDamage(caster, target, power, power.damage * scale, CombatEvent.POWER_HIT)) {
      interrupt(target, FighterState.HIT, power.stun * interaction.duration);
    }
  } },
  supremePush: { active: push },
  push: { active: push },
  pull: { active: pull },
  lightning: { tick: lightning },
  barrier: {},
  throw: { impact: throwImpact },
  choke: { active: choke },
  freeze: { active: freeze },
  heal: { self: heal },
  focus: { self: focus },
  sanctuary: { self: ({ combat, caster, power, scale }) => {
    combat.statuses.start(caster, 'sanctuary', power.duration);
    caster.combat.sanctuaryShield = power.shield * scale;
    caster.combat.statusLevel = caster.flowLevel;
  } },
  wrath: { self: wrath },
});

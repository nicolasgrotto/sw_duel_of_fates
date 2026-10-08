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

function applyGuarded(context, damage) {
  const { combat, caster, target, power } = context;
  spendStamina(target, power.guard.staminaCost);
  return combat.dealPowerDamage(caster, target, power, damage, CombatEvent.POWER_BLOCKED);
}

function push(context) {
  const { combat, caster, target, power, scale, guarded } = context;
  const knockback = caster.facing * power.knockback * scale;
  if (guarded) {
    target.vx = knockback * power.guard.knockbackScale;
    applyGuarded(context, 0);
    return;
  }
  target.vx = knockback;
  if (combat.dealPowerDamage(caster, target, power, power.damage * scale, CombatEvent.POWER_HIT)) {
    interrupt(target, FighterState.STAGGERED, power.stagger * Math.min(1, scale));
  }
}

function pull(context) {
  const { system, combat, caster, target, power, scale, guarded } = context;
  const travel = Math.max(0, getGap(caster, target) - power.endGap);
  const speed = Math.min(power.maxSpeed, Math.sqrt(2 * system.friction * travel)) * Math.min(1, scale);
  if (guarded) {
    target.vx = -caster.facing * speed * power.guard.knockbackScale;
    applyGuarded(context, 0);
    return;
  }
  target.vx = -caster.facing * speed;
  if (combat.dealPowerDamage(caster, target, power, power.damage * scale, CombatEvent.POWER_HIT)) {
    interrupt(target, FighterState.STAGGERED, power.stagger * Math.min(1, scale));
  }
}

function lightning(context) {
  const { combat, caster, target, power, scale, guarded } = context;
  if (guarded) {
    target.vx = caster.facing * power.knockback * power.guard.knockbackScale;
    applyGuarded(context, power.damage * scale * power.guard.damageScale);
    return;
  }
  target.vx = caster.facing * power.knockback * scale;
  if (combat.dealPowerDamage(caster, target, power, power.damage * scale, CombatEvent.POWER_HIT)) {
    interrupt(target, FighterState.HIT, power.stun);
  }
}

export const powerEffects = Object.freeze({
  push: { active: push },
  pull: { active: pull },
  lightning: { tick: lightning },
  barrier: {},
});

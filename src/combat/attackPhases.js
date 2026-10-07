import { FighterState } from '../entities/fighterStates.js';

export const AttackType = Object.freeze({
  LIGHT: 'light',
  HEAVY: 'heavy',
  FORWARD_HEAVY: 'forwardHeavy',
  AIR: 'air',
  RIPOSTE: 'riposte',
  SHOVE: 'shove',
});

export const AttackPhase = Object.freeze({
  STARTUP: 'startup',
  ACTIVE: 'active',
  RECOVERY: 'recovery',
  DONE: 'done',
});

export const ATTACK_STATES = Object.freeze({
  [AttackType.LIGHT]: FighterState.ATTACKING,
  [AttackType.HEAVY]: FighterState.HEAVY_ATTACK,
  [AttackType.RIPOSTE]: FighterState.ATTACKING,
  [AttackType.SHOVE]: FighterState.ATTACKING,
});

const HEAVY_ATTACKS = new Set([AttackType.HEAVY, AttackType.FORWARD_HEAVY]);
const STRONG_ATTACKS = new Set([...HEAVY_ATTACKS, AttackType.RIPOSTE]);

export function isHeavyAttack(attackType) {
  return HEAVY_ATTACKS.has(attackType);
}

export function isStrongAttack(attackType) {
  return STRONG_ATTACKS.has(attackType);
}

export function isSaberAttack(attackType) {
  return attackType !== null && attackType !== AttackType.SHOVE;
}

export function getAttackDuration(attack) {
  return attack.startup + attack.active + attack.recovery;
}

export function getAttackPhase(attack, time) {
  if (time < attack.startup) {
    return AttackPhase.STARTUP;
  }
  if (time < attack.startup + attack.active) {
    return AttackPhase.ACTIVE;
  }
  if (time < getAttackDuration(attack)) {
    return AttackPhase.RECOVERY;
  }
  return AttackPhase.DONE;
}

export function getPhaseProgress(attack, time) {
  if (time < attack.startup) {
    return time / attack.startup;
  }
  if (time < attack.startup + attack.active) {
    return (time - attack.startup) / attack.active;
  }
  if (time < getAttackDuration(attack)) {
    return (time - attack.startup - attack.active) / attack.recovery;
  }
  return 1;
}

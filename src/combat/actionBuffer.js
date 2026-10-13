export const CombatAction = Object.freeze({
  DODGE: 'dodge',
  EVADE: 'evade',
  SHOVE: 'shove',
  POWER: 'power',
  FOURTH_POWER: 'fourthPower',
  SPECIAL: 'special',
  HEAVY_ATTACK: 'heavyAttack',
  LIGHT_ATTACK: 'lightAttack',
  PARRY: 'parry',
});

export function readPressedAction(intent, ignoreAttacks = false, skipResolved = false) {
  if (!skipResolved && intent.resolvedAction) return intent.resolvedAction;
  if (intent.fourthPower) return CombatAction.FOURTH_POWER;
  if (intent.dodge) {
    return CombatAction.DODGE;
  }
  if (intent.evade) return CombatAction.EVADE;
  if (!ignoreAttacks && intent.lightAttack && intent.block) {
    return CombatAction.SHOVE;
  }
  if (intent.power && (!skipResolved || intent.resolvedAction !== 'power')) {
    return CombatAction.POWER;
  }
  if (!ignoreAttacks && intent.special && (!skipResolved || intent.resolvedAction !== 'special')) {
    return CombatAction.SPECIAL;
  }
  if (!ignoreAttacks && intent.heavyAttack) {
    return CombatAction.HEAVY_ATTACK;
  }
  if (!ignoreAttacks && intent.lightAttack) {
    return CombatAction.LIGHT_ATTACK;
  }
  if (intent.blockPressed) {
    return CombatAction.PARRY;
  }
  return null;
}

export function updateActionBuffer(fighter, dt, bufferTime) {
  const { combat } = fighter;
  const pressed = readPressedAction(fighter.intent, combat.lockReleaseGuard > 0);

  if (pressed) {
    combat.bufferedMoveX = fighter.intent.resolvedAction ? fighter.intent.actionMoveX : null;
    combat.queuedAction = fighter.intent.resolvedAction ? readPressedAction(fighter.intent, combat.lockReleaseGuard > 0, true) : null;
    combat.queuedMoveX = combat.queuedAction ? fighter.intent.moveX : null;
    combat.queuedTime = combat.queuedAction ? bufferTime : 0;
    combat.bufferedAction = pressed;
    combat.bufferTime = bufferTime;
    return;
  }

  combat.queuedTime = Math.max(0, combat.queuedTime - dt);
  if (combat.queuedTime === 0) combat.queuedAction = null;
  combat.bufferTime = Math.max(0, combat.bufferTime - dt);
  if (combat.bufferTime === 0) {
    clearActionBuffer(fighter);
  }
}

export function clearActionBuffer(fighter) {
  const { combat } = fighter;
  combat.bufferedAction = combat.queuedAction;
  combat.bufferedMoveX = combat.queuedMoveX;
  combat.bufferTime = combat.queuedTime;
  combat.queuedAction = null;
  combat.queuedMoveX = null;
  combat.queuedTime = 0;
}

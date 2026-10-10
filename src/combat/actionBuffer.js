export const CombatAction = Object.freeze({
  DODGE: 'dodge',
  EVADE: 'evade',
  SHOVE: 'shove',
  POWER: 'power',
  SPECIAL: 'special',
  HEAVY_ATTACK: 'heavyAttack',
  LIGHT_ATTACK: 'lightAttack',
  PARRY: 'parry',
});

export function readPressedAction(intent, ignoreAttacks = false) {
  if (intent.dodge) {
    return CombatAction.DODGE;
  }
  if (intent.evade) return CombatAction.EVADE;
  if (!ignoreAttacks && intent.lightAttack && intent.block) {
    return CombatAction.SHOVE;
  }
  if (intent.power) {
    return CombatAction.POWER;
  }
  if (!ignoreAttacks && intent.special) {
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
    combat.bufferedAction = pressed;
    combat.bufferTime = bufferTime;
    return;
  }

  combat.bufferTime = Math.max(0, combat.bufferTime - dt);
  if (combat.bufferTime === 0) {
    combat.bufferedAction = null;
  }
}

export function clearActionBuffer(fighter) {
  fighter.combat.bufferedAction = null;
  fighter.combat.bufferTime = 0;
}

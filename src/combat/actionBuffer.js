export const CombatAction = Object.freeze({
  DODGE: 'dodge',
  HEAVY_ATTACK: 'heavyAttack',
  LIGHT_ATTACK: 'lightAttack',
});

export function readPressedAction(intent) {
  if (intent.dodge) {
    return CombatAction.DODGE;
  }
  if (intent.heavyAttack) {
    return CombatAction.HEAVY_ATTACK;
  }
  if (intent.lightAttack) {
    return CombatAction.LIGHT_ATTACK;
  }
  return null;
}

export function updateActionBuffer(fighter, dt, bufferTime) {
  const { combat } = fighter;
  const pressed = readPressedAction(fighter.intent);

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

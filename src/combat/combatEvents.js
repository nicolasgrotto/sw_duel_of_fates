export const CombatEvent = Object.freeze({
  HIT: 'hit',
  BLOCK: 'block',
  GUARD_BREAK: 'guardBreak',
  CLASH: 'clash',
  DEATH: 'death',
});

export function createCombatEvent(type, { attacker, defender, attackType, x, y }) {
  return {
    type,
    attacker,
    defender,
    attackType,
    x,
    y,
  };
}

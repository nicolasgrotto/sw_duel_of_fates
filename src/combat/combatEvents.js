export const CombatEvent = Object.freeze({
  HIT: 'hit',
  BLOCK: 'block',
  GUARD_BREAK: 'guardBreak',
  CLASH: 'clash',
  DEATH: 'death',
  ATTACK_START: 'attackStart',
  DODGE: 'dodge',
});

const CONTACT_EVENTS = new Set([
  CombatEvent.HIT,
  CombatEvent.BLOCK,
  CombatEvent.GUARD_BREAK,
  CombatEvent.CLASH,
  CombatEvent.DEATH,
]);

export function isContactEvent(event) {
  return CONTACT_EVENTS.has(event.type);
}

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

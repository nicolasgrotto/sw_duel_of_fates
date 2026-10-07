export const CombatEvent = Object.freeze({
  HIT: 'hit',
  BLOCK: 'block',
  GUARD_BREAK: 'guardBreak',
  CLASH: 'clash',
  DEATH: 'death',
  ATTACK_START: 'attackStart',
  DODGE: 'dodge',
  ACTION_REJECTED: 'actionRejected',
  PARRY: 'parry',
  PERFECT_PARRY: 'perfectParry',
});

const CONTACT_EVENTS = new Set([
  CombatEvent.HIT,
  CombatEvent.BLOCK,
  CombatEvent.GUARD_BREAK,
  CombatEvent.CLASH,
  CombatEvent.DEATH,
  CombatEvent.PARRY,
  CombatEvent.PERFECT_PARRY,
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

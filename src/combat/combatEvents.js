export const CombatEvent = Object.freeze({
  HIT: 'hit',
  BLOCK: 'block',
  GUARD_BREAK: 'guardBreak',
  CLASH: 'clash',
  DEATH: 'death',
  ATTACK_START: 'attackStart',
  DODGE: 'dodge',
  EVADE_SUCCESS: 'evadeSuccess',
  ACTION_REJECTED: 'actionRejected',
  PARRY: 'parry',
  PERFECT_PARRY: 'perfectParry',
  SHOVE: 'shove',
  COUNTER: 'counter',
  FEINT: 'feint',
});

const CONTACT_EVENTS = new Set([
  CombatEvent.HIT,
  CombatEvent.BLOCK,
  CombatEvent.GUARD_BREAK,
  CombatEvent.CLASH,
  CombatEvent.DEATH,
  CombatEvent.PARRY,
  CombatEvent.PERFECT_PARRY,
  CombatEvent.SHOVE,
  CombatEvent.COUNTER,
]);

export function isContactEvent(event) {
  return CONTACT_EVENTS.has(event.type);
}

export function createCombatEvent(type, { attacker, defender, attackType, x, y, armored = false, damage = 0 }) {
  return {
    type,
    attacker,
    defender,
    attackType,
    x,
    y,
    armored,
    damage,
  };
}

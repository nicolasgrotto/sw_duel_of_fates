export const CombatEvent = Object.freeze({
  HIT: 'hit',
  BLOCK: 'block',
  GUARD_BREAK: 'guardBreak',
  CLASH: 'clash',
  TECHNIQUE_CLASH: 'techniqueClash',
  BLADE_LOCK_START: 'bladeLockStart',
  BLADE_LOCK_PRESS: 'bladeLockPress',
  BLADE_LOCK_END: 'bladeLockEnd',
  DEATH: 'death',
  ATTACK_START: 'attackStart',
  DODGE: 'dodge',
  EVADE_SUCCESS: 'evadeSuccess',
  EXHAUSTION: 'exhaustion',
  EXHAUSTION_RECOVERED: 'exhaustionRecovered',
  WOUND: 'wound',
  WOUND_HEALED: 'woundHealed',
  ACTION_REJECTED: 'actionRejected',
  PARRY: 'parry',
  PERFECT_PARRY: 'perfectParry',
  SHOVE: 'shove',
  COUNTER: 'counter',
  FEINT: 'feint',
  SANCTUARY_BREAK: 'sanctuaryBreak',
  SANCTUARY_END: 'sanctuaryEnd',
  WRATH_ARMOR: 'wrathArmor',
  POWER_START: 'powerStart',
  POWER_ACTIVE: 'powerActive',
  POWER_PULSE: 'powerPulse',
  POWER_HIT: 'powerHit',
  POWER_BLOCKED: 'powerBlocked',
  POWER_RESISTED: 'powerResisted',
  POWER_ABSORBED: 'powerAbsorbed',
  FRACTURE_CRACK: 'fractureCrack',
  FRACTURE_BURST: 'fractureBurst',
  RAIN_CALL: 'rainCall',
  RAIN_MARK: 'rainMark',
  RAIN_STRIKE: 'rainStrike',
  ARSENAL_LAUNCH: 'arsenalLaunch',
  ARSENAL_BLOCK: 'arsenalBlock',
  WAVE_REFLECT: 'waveReflect',
  STORM_MARK: 'stormMark',
  STORM_STRIKE: 'stormStrike',
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

export function createCombatEvent(type, { attacker, defender, attackType, x, y, armored = false, damage = 0, auto, impactTime, hit, mode, light, staggered, finisher }) {
  const event = {
    type,
    attacker,
    defender,
    attackType,
    x,
    y,
    armored,
    damage,
  };
  if (auto !== undefined) {
    event.auto = auto;
  }
  if (impactTime !== undefined) event.impactTime = impactTime;
  if (hit !== undefined) event.hit = hit;
  if (mode !== undefined) event.mode = mode;
  if (light !== undefined) event.light = light;
  if (staggered !== undefined) event.staggered = staggered;
  if (finisher) event.finisher = finisher;
  return event;
}

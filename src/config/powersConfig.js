import { colors } from './themeConfig.js';

export const PowerOutcome = Object.freeze({
  NORMAL: 'normal',
  REDUCED: 'reduced',
  RESISTED: 'resisted',
});

const NORMAL_BAND = { atLeast: -1, outcome: PowerOutcome.NORMAL, scale: 1, blockable: true, guardStamina: 1, duration: 1, stagger: 1 };
const REDUCED_BAND = { atLeast: -2, outcome: PowerOutcome.REDUCED, scale: 0.5, blockable: true, guardStamina: 1, duration: 1, stagger: 1 };
const RESISTED_BAND = { atLeast: -Infinity, outcome: PowerOutcome.RESISTED, scale: 0, blockable: true, guardStamina: 1, duration: 1, stagger: 1 };
const STRIKE_GUARD = { guardDamage: 0, guardSlide: 0.5 };
const CHANNEL_GUARD = { guardDamage: 0.25, guardSlide: 0.5 };

export const powersConfig = {
  modes: ['versus', 'local', 'training'],
  cooldown: 1.2,
  impactHeight: 0.55,
  castHeight: 0.6,
  loadouts: {
    light: { neutral: 'push', back: 'barrier' },
    dark: { neutral: 'lightning', forward: 'pull' },
  },
  powers: {
    push: {
      id: 'push', effect: 'push', channel: false, pose: 'cast', interaction: 'push',
      cost: 40, startup: 0.22, active: 0.08, recovery: 0.34, range: 320,
      damage: 5, knockback: 950, stagger: 0.45,
      guard: { staminaCost: 12 },
    },
    pull: {
      id: 'pull', effect: 'pull', channel: false, pose: 'cast', interaction: 'pull',
      cost: 40, startup: 0.24, active: 0.08, recovery: 0.3, range: 380,
      damage: 3, endGap: 30, maxSpeed: 1100, stagger: 0.42,
      guard: { staminaCost: 12 },
    },
    lightning: {
      id: 'lightning', effect: 'lightning', channel: true, pose: 'channel', interaction: 'lightning',
      cost: 15, drainPerSecond: 55, startup: 0.3, maxChannel: 1, recovery: 0.35, range: 300,
      tickInterval: 0.15, damage: 3, knockback: 70, stun: 0.12,
      guard: { staminaCost: 5 },
    },
    barrier: {
      id: 'barrier', effect: 'barrier', channel: true, pose: 'barrier',
      cost: 10, drainPerSecond: 38, startup: 0.1, maxChannel: 1.5, recovery: 0.25,
      pushSlide: 0.3, saberPushback: 0.5,
    },
  },
  meter: {
    max: 100,
    start: 20,
    regenPerSecond: 3,
    gain: { hitLanded: 7, hitTaken: 9, blocked: 4, parried: 10 },
    baseLevel: 4,
    gainPerLevel: 0.05,
    potencyPerLevel: 0.03,
  },
  interactions: {
    push: [{ ...NORMAL_BAND, ...STRIKE_GUARD }, { ...REDUCED_BAND, ...STRIKE_GUARD }, { ...RESISTED_BAND, ...STRIKE_GUARD }],
    pull: [{ ...NORMAL_BAND, ...STRIKE_GUARD }, { ...REDUCED_BAND, ...STRIKE_GUARD }, { ...RESISTED_BAND, ...STRIKE_GUARD }],
    lightning: [{ ...NORMAL_BAND, ...CHANNEL_GUARD }, { ...REDUCED_BAND, ...CHANNEL_GUARD }, { ...RESISTED_BAND, ...CHANNEL_GUARD }],
  },
  render: {
    seed: 7,
    handOffset: 8,
    chargeMinScale: 0.4,
    boltSegments: 10,
    boltJitter: 14,
    branchJitterScale: 1.6,
    boltRefresh: 0.05,
    boltGlowScale: 4,
    boltGlowAlpha: 0.3,
    branchAlpha: 0.45,
    branchWidthScale: 0.6,
    coreWidthScale: 0.4,
    impactGlowScale: 0.8,
    barrierCenter: 0.5,
    barrierRadiusX: 0.42,
    barrierRadiusY: 0.62,
    barrierGlowScale: 1.1,
    barrierGlowAlpha: 0.18,
    barrierAlpha: [0.45, 0.8],
    barrierPulseSpeed: 3,
    barrierLineWidth: 2,
    waveOffset: 40,
  },
  tiers: [
    { id: 'faint', color: colors.powerTierFaint, minLevel: 1, glowRadius: 34, glowAlpha: 0.45, boltWidth: 2, particles: [4, 6] },
    { id: 'steady', color: colors.powerTierSteady, minLevel: 3, glowRadius: 42, glowAlpha: 0.55, boltWidth: 2.5, particles: [6, 8] },
    { id: 'deep', color: colors.powerTierDeep, minLevel: 8, glowRadius: 52, glowAlpha: 0.65, boltWidth: 3, particles: [8, 10] },
    { id: 'apex', color: colors.powerTierApex, minLevel: 10, glowRadius: 64, glowAlpha: 0.75, boltWidth: 3.5, particles: [10, 12] },
  ],
};

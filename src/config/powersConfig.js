import { colors } from './themeConfig.js';

export const PowerOutcome = Object.freeze({
  NORMAL: 'normal',
  REDUCED: 'reduced',
  RESISTED: 'resisted',
});

export const powersConfig = {
  modes: ['versus', 'local', 'training'],
  maxLevel: 10,
  cooldown: 1.2,
  impactHeight: 0.55,
  castHeight: 0.6,
  loadouts: {
    light: { neutral: 'push', back: 'barrier' },
    dark: { neutral: 'lightning', forward: 'pull' },
  },
  powers: {
    push: {
      id: 'push', effect: 'push', channel: false, pose: 'cast', resistance: 'standard',
      cost: 40, startup: 0.22, active: 0.08, recovery: 0.34, range: 320,
      damage: 5, knockback: 950, stagger: 0.45,
      guard: { knockbackScale: 0.5, staminaCost: 12 },
    },
    pull: {
      id: 'pull', effect: 'pull', channel: false, pose: 'cast', resistance: 'standard',
      cost: 40, startup: 0.24, active: 0.08, recovery: 0.3, range: 380,
      damage: 3, endGap: 30, maxSpeed: 1100, stagger: 0.42,
      guard: { knockbackScale: 0.5, staminaCost: 12 },
    },
    lightning: {
      id: 'lightning', effect: 'lightning', channel: true, pose: 'channel', resistance: 'standard',
      cost: 15, drainPerSecond: 55, startup: 0.3, maxChannel: 1, recovery: 0.35, range: 300,
      tickInterval: 0.15, damage: 3, knockback: 70, stun: 0.12,
      guard: { damageScale: 0.25, staminaCost: 5, knockbackScale: 0.5 },
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
    baseLevel: 5,
    gainPerLevel: 0.05,
    potencyPerLevel: 0.03,
  },
  resistance: {
    standard: [
      { upTo: 1, scale: 1, outcome: PowerOutcome.NORMAL },
      { upTo: 2, scale: 0.5, outcome: PowerOutcome.REDUCED },
      { upTo: Infinity, scale: 0, outcome: PowerOutcome.RESISTED },
    ],
  },
  tiers: [
    { id: 'faint', color: colors.powerTierFaint, minLevel: 1, glowRadius: 34, glowAlpha: 0.45, boltWidth: 2, particles: [4, 6] },
    { id: 'steady', color: colors.powerTierSteady, minLevel: 4, glowRadius: 42, glowAlpha: 0.55, boltWidth: 2.5, particles: [6, 8] },
    { id: 'deep', color: colors.powerTierDeep, minLevel: 8, glowRadius: 52, glowAlpha: 0.65, boltWidth: 3, particles: [8, 10] },
    { id: 'apex', color: colors.powerTierApex, minLevel: 10, glowRadius: 64, glowAlpha: 0.75, boltWidth: 3.5, particles: [10, 12] },
  ],
};

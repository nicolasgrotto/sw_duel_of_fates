import { colors } from './themeConfig.js';

export const PowerOutcome = Object.freeze({
  NORMAL: 'normal',
  REDUCED: 'reduced',
  RESISTED: 'resisted',
});

const NORMAL_BAND = { atLeast: -1, outcome: PowerOutcome.NORMAL, scale: 1, knockback: 1, blockable: true, guardStamina: 1, duration: 1, stagger: 1 };
const REDUCED_BAND = { atLeast: -2, outcome: PowerOutcome.REDUCED, scale: 0.5, knockback: 1, blockable: true, guardStamina: 1, duration: 1, stagger: 1 };
const RESISTED_BAND = { atLeast: -Infinity, outcome: PowerOutcome.RESISTED, scale: 0, knockback: 1, blockable: true, guardStamina: 1, duration: 1, stagger: 1 };
const STRIKE_GUARD = { guardDamage: 0, guardSlide: 0.5 };
const CHANNEL_GUARD = { guardDamage: 0.25, guardSlide: 0.5 };

export const powersConfig = {
  modes: ['versus', 'local', 'training'],
  cooldown: 1.2,
  impactHeight: 0.55,
  castHeight: 0.6,
  airReach: 320,
  categories: {
    flow: { alignments: ['light', 'dark'], abilities: ['push', 'pull', 'throw', 'redirect'] },
    aurora: { alignments: ['light'], abilities: ['barrier', 'heal', 'focus'] },
    eclipse: { alignments: ['dark'], abilities: ['lightning', 'choke', 'freeze', 'storm'] },
    blade: { alignments: ['light', 'dark'], abilities: ['spin', 'dashSlash', 'saberThrow'] },
  },
  powers: {
    redirect: {
      id: 'redirect', effect: 'redirect', channel: false, pose: 'barrier', self: true, reaction: true, interaction: 'redirect',
      cost: 18, startup: 0.05, active: 0.3, recovery: 0.2, window: 0.3,
      returnDamage: 6, backlashDamage: 5, stagger: 0.25, meterGain: 8,
    },
    storm: {
      id: 'storm', effect: 'storm', channel: true, pose: 'channel', interaction: 'storm', around: true,
      minFlowLevel: 6, cost: 30, drainPerSecond: 35, startup: 0.35, maxChannel: 1.2, recovery: 0.4,
      range: 180, tickInterval: 0.2, damage: 4, intensity: 1, guard: { staminaCost: 6 },
    },
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
    throw: {
      id: 'throw', effect: 'throw', channel: false, pose: 'cast', interaction: 'throw', projectile: true, sizes: 'throw',
      cost: 40, startup: 0.26, active: 0.08, recovery: 0.3, range: 700,
      guard: { staminaCost: 10 },
    },
    choke: {
      id: 'choke', effect: 'choke', channel: false, pose: 'cast', interaction: 'choke',
      cost: 45, startup: 0.3, active: 0.08, recovery: 0.4, range: 240,
      damage: 2, damagePerSecond: 4, duration: 0.7,
      guard: { staminaCost: 14 },
    },
    freeze: {
      id: 'freeze', effect: 'freeze', channel: false, pose: 'cast', interaction: 'freeze',
      cost: 40, startup: 0.28, active: 0.08, recovery: 0.36, range: 340,
      damage: 0, duration: 1.1,
      guard: { staminaCost: 12 },
    },
    heal: {
      id: 'heal', effect: 'heal', channel: false, pose: 'barrier', self: true,
      cost: 50, startup: 0.35, active: 0.08, recovery: 0.4,
      amount: 14, duration: 2, maxMissingFraction: 0.35,
    },
    focus: {
      id: 'focus', effect: 'focus', channel: false, pose: 'barrier', self: true,
      cost: 35, startup: 0.25, active: 0.08, recovery: 0.3,
      duration: 4, staminaScale: 0.5,
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
    redirect: {
      air: { scale: 1, duration: 1, stagger: 1 },
      bands: [
        { ...NORMAL_BAND, ...STRIKE_GUARD, atLeast: 1, absorb: 1, reflect: 1, gain: 1.5, backlash: 0 },
        { ...NORMAL_BAND, ...STRIKE_GUARD, atLeast: 0, absorb: 1, reflect: 0.75, gain: 1, backlash: 0 },
        { ...REDUCED_BAND, ...STRIKE_GUARD, atLeast: -1, absorb: 0.5, reflect: 0.25, gain: 0, backlash: 0 },
        { ...RESISTED_BAND, ...STRIKE_GUARD, atLeast: -2, absorb: 0, reflect: 0, gain: 0, backlash: 0 },
        { ...RESISTED_BAND, ...STRIKE_GUARD, absorb: 0, reflect: 0, gain: 0, backlash: 1 },
      ],
    },
    storm: {
      air: { scale: 1, duration: 1, stagger: 1 },
      bands: [
        { ...NORMAL_BAND, ...CHANNEL_GUARD, atLeast: 3, scale: 1.2, blockable: false },
        { ...NORMAL_BAND, ...CHANNEL_GUARD },
        { ...REDUCED_BAND, ...CHANNEL_GUARD },
        { ...RESISTED_BAND, ...CHANNEL_GUARD },
      ],
    },
    push: {
      air: { scale: 1.3, duration: 1, stagger: 1.2 },
      bands: [
        { ...NORMAL_BAND, atLeast: 3, blockable: false, guardDamage: 0, guardSlide: 1 },
        { ...NORMAL_BAND, atLeast: 2, guardDamage: 0.5, guardSlide: 1, guardStamina: 1.5 },
        { ...NORMAL_BAND, atLeast: 1, guardDamage: 0.25, guardSlide: 0.75 },
        { ...NORMAL_BAND, atLeast: 0, ...STRIKE_GUARD },
        { ...NORMAL_BAND, atLeast: -1, guardDamage: 0, guardSlide: 0.35, guardStamina: 0.75 },
        { ...REDUCED_BAND, knockback: 0, stagger: 0.5, guardDamage: 0, guardSlide: 0, guardStamina: 0.5 },
        { ...RESISTED_BAND, ...STRIKE_GUARD },
      ],
    },
    pull: {
      air: { scale: 1, duration: 1, stagger: 1.2 },
      bands: [{ ...NORMAL_BAND, ...STRIKE_GUARD }, { ...REDUCED_BAND, ...STRIKE_GUARD }, { ...RESISTED_BAND, ...STRIKE_GUARD }],
    },
    throw: {
      air: { scale: 1.2, duration: 1, stagger: 1.2 },
      bands: [{ ...NORMAL_BAND, ...STRIKE_GUARD, guardDamage: 0.25 }, { ...REDUCED_BAND, ...STRIKE_GUARD, guardDamage: 0.25 }, { ...RESISTED_BAND, ...STRIKE_GUARD }],
    },
    choke: {
      air: { scale: 1, duration: 1.2, stagger: 1 },
      bands: [
        { ...NORMAL_BAND, atLeast: 3, blockable: false, scale: 1.2, duration: 1.3, ...STRIKE_GUARD },
        { ...NORMAL_BAND, atLeast: -1, ...STRIKE_GUARD },
        { ...REDUCED_BAND, duration: 0.5, ...STRIKE_GUARD },
        { ...RESISTED_BAND, ...STRIKE_GUARD },
      ],
    },
    freeze: {
      air: { scale: 1, duration: 1.2, stagger: 1 },
      bands: [
        { ...NORMAL_BAND, atLeast: 3, blockable: false, ...STRIKE_GUARD },
        { ...NORMAL_BAND, atLeast: 0, ...STRIKE_GUARD },
        { ...NORMAL_BAND, atLeast: -1, duration: 0.75, ...STRIKE_GUARD },
        { ...REDUCED_BAND, scale: 1, duration: 0.4, ...STRIKE_GUARD },
        { ...RESISTED_BAND, ...STRIKE_GUARD },
      ],
    },
    lightning: {
      air: { scale: 1, duration: 1.6, stagger: 1 },
      bands: [{ ...NORMAL_BAND, ...CHANNEL_GUARD }, { ...REDUCED_BAND, ...CHANNEL_GUARD }, { ...RESISTED_BAND, ...CHANNEL_GUARD }],
    },
  },
  render: {
    redirectGlowScale: 0.65,
    storm: { alpha: 0.25, lineWidth: 1.5, particles: 12, reducedParticles: 5, life: 0.3, speed: 65, size: 2 },
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
    status: {
      chokeHeight: 0.82,
      chokeRadius: 0.45,
      chokeAlpha: [0.35, 0.7],
      chokePulseSpeed: 9,
      freezeRadiusX: 0.4,
      freezeRadiusY: 0.58,
      freezeAlpha: 0.22,
      freezeLineAlpha: 0.7,
      freezeLineWidth: 2,
      focusHeight: 0.6,
      focusRadius: 0.55,
      focusAlpha: [0.12, 0.25],
      focusPulseSpeed: 2.5,
      healFrom: 0.25,
      healTo: 0.75,
      healRadius: 0.6,
      healAlpha: 0.3,
      healRiseSpeed: 1.5,
    },
  },
  tiers: [
    { id: 'faint', color: colors.powerTierFaint, minLevel: 1, glowRadius: 34, glowAlpha: 0.45, boltWidth: 2, particles: [4, 6] },
    { id: 'steady', color: colors.powerTierSteady, minLevel: 3, glowRadius: 42, glowAlpha: 0.55, boltWidth: 2.5, particles: [6, 8] },
    { id: 'deep', color: colors.powerTierDeep, minLevel: 8, glowRadius: 52, glowAlpha: 0.65, boltWidth: 3, particles: [8, 10] },
    { id: 'apex', color: colors.powerTierApex, minLevel: 10, glowRadius: 64, glowAlpha: 0.75, boltWidth: 3.5, particles: [10, 12] },
  ],
};

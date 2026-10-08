import { colors } from './themeConfig.js';

export const PowerOutcome = Object.freeze({
  NORMAL: 'normal',
  REDUCED: 'reduced',
  RESISTED: 'resisted',
});

export const powersConfig = {
  modes: ['versus', 'local', 'training'],
  maxLevel: 10,
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

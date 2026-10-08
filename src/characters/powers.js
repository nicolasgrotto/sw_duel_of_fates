export function resolvePowerStats(level, { meter }) {
  const steps = level - meter.baseLevel;
  return {
    max: meter.max,
    start: meter.start,
    gainScale: 1 + steps * meter.gainPerLevel,
    potency: 1 + steps * meter.potencyPerLevel,
  };
}

function resolveLoadout(alignment, { loadouts, powers }) {
  const slots = loadouts[alignment];
  if (!slots) {
    return null;
  }
  const loadout = {};
  for (const [slot, id] of Object.entries(slots)) {
    loadout[slot] = powers[id];
  }
  return loadout;
}

export function resolvePowerStats(level, config, alignment = null) {
  const { meter } = config;
  const steps = level - meter.baseLevel;
  return {
    max: meter.max,
    start: meter.start,
    gainScale: 1 + steps * meter.gainPerLevel,
    potency: 1 + steps * meter.potencyPerLevel,
    loadout: resolveLoadout(alignment, config),
  };
}

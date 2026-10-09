function resolveLoadout(alignment, { loadouts, powers }, unlockedSlots) {
  const slots = loadouts[alignment];
  if (!slots) {
    return null;
  }
  const loadout = {};
  for (const [slot, id] of Object.entries(slots)) {
    if (!unlockedSlots || unlockedSlots.includes(slot)) {
      loadout[slot] = powers[id];
    }
  }
  return loadout;
}

export function resolvePowerStats(level, config, alignment = null, unlockedSlots = null) {
  const { meter } = config;
  const steps = level - meter.baseLevel;
  return {
    max: meter.max,
    start: meter.start,
    gainScale: 1 + steps * meter.gainPerLevel,
    potency: 1 + steps * meter.potencyPerLevel,
    loadout: resolveLoadout(alignment, config, unlockedSlots),
  };
}

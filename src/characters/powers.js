function resolveLoadout(slots, { powers }, unlockedSlots) {
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

export function resolvePowerStats(level, config, slots = null, unlockedSlots = null) {
  const { meter } = config;
  const steps = level - meter.baseLevel;
  return {
    max: meter.max,
    start: meter.start,
    gainScale: 1 + steps * meter.gainPerLevel,
    potency: 1 + steps * meter.potencyPerLevel,
    loadout: resolveLoadout(slots, config, unlockedSlots),
  };
}

export function getAbilityCategory(id, { categories }) {
  for (const [category, { abilities }] of Object.entries(categories)) {
    if (abilities.includes(id)) {
      return category;
    }
  }
  return null;
}

export const POWER_SLOTS = Object.freeze(['neutral', 'forward', 'back', 'fourth']);

export function findLoadoutProblems(loadout, alignment, config, techniques, powerSlots = 3) {
  const problems = [];
  const powers = Object.entries(loadout?.powers ?? {});
  if (![3, 4].includes(powerSlots)) problems.push(`powers: invalid capacity ${powerSlots}`);
  if (powers.length > powerSlots) problems.push(`powers: exceeds capacity ${powerSlots}`);
  const check = (slot, id, known) => {
    const category = getAbilityCategory(id, config);
    if (!known || !category) {
      problems.push(`${slot}: unknown ${id}`);
    } else if (!config.categories[category].alignments.includes(alignment)) {
      problems.push(`${slot}: ${id} needs another alignment`);
    }
  };
  for (const [slot, id] of Object.entries(loadout?.powers ?? {})) {
    if (!POWER_SLOTS.slice(0, powerSlots).includes(slot)) problems.push(`powers.${slot}: invalid slot`);
    check(`powers.${slot}`, id, id in config.powers);
  }
  for (const [slot, id] of Object.entries(loadout?.techniques ?? {})) {
    if (!['forward', 'back'].includes(slot)) problems.push(`techniques.${slot}: invalid slot`);
    check(`techniques.${slot}`, id, id in techniques);
  }
  return problems;
}

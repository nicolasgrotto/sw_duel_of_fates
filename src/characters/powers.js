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

const AIR_SLOT = 'air';
const TECHNIQUE_SLOTS = ['forward', 'back', AIR_SLOT];

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
    if (!TECHNIQUE_SLOTS.includes(slot)) problems.push(`techniques.${slot}: invalid slot`);
    check(`techniques.${slot}`, id, id in techniques);
    if (id in techniques && (slot === AIR_SLOT) !== (techniques[id].airborne === true)) problems.push(`techniques.${slot}: ${id} does not fit the slot`);
  }
  return problems;
}

export function getCustomPowerCatalog(character, config) {
  const flow = character.attributes.flow;
  return Object.entries(config.categories)
    .filter(([id, category]) => id !== 'blade' && category.alignments.includes(character.alignment))
    .flatMap(([, category]) => category.abilities)
    .filter((id) => id in config.powers && (config.powers[id].minFlowLevel ?? 0) <= flow);
}

export function isValidCustomPowers(powers, character, config) {
  if (!powers || typeof powers !== 'object') return false;
  const slots = Object.keys(character.loadout?.powers ?? {});
  const catalog = getCustomPowerCatalog(character, config);
  const chosen = slots.map((slot) => powers[slot]);
  return Object.keys(powers).length === slots.length
    && chosen.every((id) => catalog.includes(id))
    && new Set(chosen).size === chosen.length;
}

export function resolveCharacterVariant(character, variantId = character.defaultVariant ?? null) {
  if (!variantId && !character.variants) return { character, variant: null };
  const variant = character.variants?.[variantId];
  if (!variant) throw new Error(`Unknown variant: ${character.id}=${variantId}`);
  return { character: { ...character, alignment: variant.alignment, loadout: variant.loadout, powerSlots: variant.powerSlots ?? character.powerSlots ?? 3 }, variant: variantId };
}

export function sanitizeVariantUnlocks(raw, characters) {
  const result = {};
  for (const [id, character] of Object.entries(characters)) {
    if (!character.variants || !Array.isArray(raw?.[id])) continue;
    result[id] = Object.keys(character.variants).filter(variant => raw[id].includes(variant));
  }
  return result;
}

export function addVariantUnlocks(current, rewards, characters) {
  const next = sanitizeVariantUnlocks(current, characters);
  for (const [id, variants] of Object.entries(sanitizeVariantUnlocks(rewards, characters))) {
    next[id] = Object.keys(characters[id].variants).filter(variant => next[id]?.includes(variant) || variants.includes(variant));
  }
  return next;
}

export function getUnlockedVariants(character, settings) {
  if (!character.variants) return [];
  const owned = settings.unlockedVariants?.[character.id];
  return Object.keys(character.variants).filter(id => Array.isArray(owned) && owned.length ? owned.includes(id) : id === character.defaultVariant);
}

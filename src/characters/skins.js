const APPEARANCE_FIELDS = ['cloakColor', 'bodyColor', 'trimColor', 'hoodUp', 'longCape', 'masked', 'pauldrons', 'scarf', 'shoulderScale'];

export function resolveAppearance(character, skinId) {
  const appearance = { ...character.appearance };
  const skin = character.skins?.find((option) => option.id === skinId);
  for (const field of APPEARANCE_FIELDS) {
    if (skin?.appearance[field] !== undefined) appearance[field] = skin.appearance[field];
  }
  return appearance;
}

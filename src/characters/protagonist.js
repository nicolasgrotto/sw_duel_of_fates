import { resolveAppearance } from './skins.js';
import { characters } from './characterData.js';

export const PROTAGONIST_ID = 'protagonist';

export function createProtagonistCharacter(profile, { protagonist }, slots = null) {
  const template = characters[protagonist.styles[profile.style].base];
  return {
    id: PROTAGONIST_ID,
    name: profile.name,
    archetype: template.archetype,
    alignment: profile.alignment,
    attributes: profile.attributes,
    selectable: false,
    moves: template.moves,
    aiProfile: template.aiProfile,
    info: template.info,
    altSaberColors: [],
    skins: protagonist.skins,
    sound: template.sound,
    powerSlots: slots,
    appearance: resolveAppearance({ appearance: { ...template.appearance, ...protagonist.appearance, saberColor: profile.saberColor }, skins: protagonist.skins }, profile.skin),
  };
}

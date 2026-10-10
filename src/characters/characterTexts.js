import { applyNames } from '../utils/textTables.js';

function applyCharacterText(character, text) {
  character.name = text.name;
  character.info = { ...text.info };
  applyNames(character.skins ?? [], text.skins ?? {});
  applyNames(character.altSaberColors ?? [], text.saberColors ?? {});
  for (const color of character.altSaberColors ?? []) {
    if (color.challenge) {
      color.challenge.text = text.challenges?.[color.id] ?? '';
    }
  }
}

export function applyCharacterTexts(characters, table) {
  for (const [id, character] of Object.entries(characters)) {
    applyCharacterText(character, table[id]);
  }
}

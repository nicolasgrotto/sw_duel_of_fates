import { fighterArchetypes } from '../config/fightersConfig.js';
import { Fighter } from '../entities/Fighter.js';
import { characters } from './characterData.js';

export function createFighter(characterId, { x, y, facing }, { saberColor = null } = {}) {
  const character = characters[characterId];
  if (!character) {
    throw new Error(`Unknown character: ${characterId}`);
  }

  const stats = fighterArchetypes[character.archetype];
  if (!stats) {
    throw new Error(`Unknown archetype: ${character.archetype}`);
  }

  const moves = {};
  for (const [id, definition] of Object.entries(character.moves)) {
    moves[id] = { ...stats.attacks[definition.attack], ...definition };
  }

  return new Fighter({
    id: character.id,
    name: character.name,
    stats: { ...stats, attacks: moves },
    appearance: saberColor ? { ...character.appearance, saberColor } : character.appearance,
    sound: character.sound,
    x,
    y,
    facing,
  });
}

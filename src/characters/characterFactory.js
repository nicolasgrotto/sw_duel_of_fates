import { fighterArchetypes } from '../config/fightersConfig.js';
import { Fighter } from '../entities/Fighter.js';
import { characters } from './characterData.js';

export function createFighter(characterId, { x, y, facing }) {
  const character = characters[characterId];
  if (!character) {
    throw new Error(`Unknown character: ${characterId}`);
  }

  const stats = fighterArchetypes[character.archetype];
  if (!stats) {
    throw new Error(`Unknown archetype: ${character.archetype}`);
  }

  return new Fighter({
    id: character.id,
    name: character.name,
    stats,
    appearance: character.appearance,
    sound: character.sound,
    x,
    y,
    facing,
  });
}

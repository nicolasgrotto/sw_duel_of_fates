import { attributesConfig } from '../config/attributesConfig.js';
import { airDashConfig } from '../config/airDashConfig.js';
import { evadeConfig } from '../config/evadeConfig.js';
import { powersConfig } from '../config/powersConfig.js';
import { applyAttributes } from './attributes.js';
import { resolvePowerStats } from './powers.js';
import { fighterArchetypes } from '../config/fightersConfig.js';
import { bladeTechniques } from '../config/movesConfig.js';
import { Fighter } from '../entities/Fighter.js';
import { resolveAppearance } from './skins.js';
import { characters } from './characterData.js';

export function createFighter(characterId, spawn, options) {
  const character = characters[characterId];
  if (!character) {
    throw new Error(`Unknown character: ${characterId}`);
  }
  return createFighterFromCharacter(character, spawn, options);
}

export function createFighterFromCharacter(character, { x, y, facing }, { saberColor = null, skin = null } = {}) {
  const stats = fighterArchetypes[character.archetype];
  if (!stats) {
    throw new Error(`Unknown archetype: ${character.archetype}`);
  }

  const moves = {};
  for (const [id, definition] of Object.entries(character.moves)) {
    moves[id] = { ...stats.attacks[definition.attack], ...definition };
  }
  const techniques = character.loadout?.techniques ?? {};
  for (const id of Object.values(techniques)) {
    moves[id] = { ...stats.attacks[bladeTechniques[id].attack], ...bladeTechniques[id] };
  }

  const scalars = attributesConfig.bases[character.archetype];
  const derived = applyAttributes({
    ...stats,
    ...scalars,
    movement: { ...stats.movement, ...scalars.movement },
    stamina: { ...stats.stamina, ...scalars.stamina },
    dodge: { ...stats.dodge, ...scalars.dodge },
    parry: { ...stats.parry, ...scalars.parry },
    evade: stats.evade ?? evadeConfig.profile,
    airDash: stats.airDash ?? airDashConfig.profile,
    attacks: moves,
  }, character.attributes, attributesConfig, { potential: character.potential ?? 0 });

  const appearance = resolveAppearance(character, skin);
  if (saberColor) appearance.saberColor = saberColor;

  return new Fighter({
    id: character.id,
    name: character.name,
    stats: { ...derived, alignment: character.alignment, techniques, power: resolvePowerStats(derived.flowLevel, powersConfig, character.loadout?.powers ?? null, character.powerSlots ?? null) },
    appearance,
    sound: character.sound,
    x,
    y,
    facing,
  });
}

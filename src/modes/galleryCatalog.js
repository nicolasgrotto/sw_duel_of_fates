import { powersConfig } from '../config/powersConfig.js';
import { bladeTechniques } from '../config/movesConfig.js';
import { galleryConfig } from '../config/galleryConfig.js';
import { characters } from '../characters/characterData.js';
import { getAbilityCategory } from '../characters/powers.js';

export function createGalleryCatalog(config = powersConfig, techniques = bladeTechniques) {
  const entries = Object.entries(config.powers).map(([id, data]) => ({ id, kind: 'power', category: getAbilityCategory(id, config), data }));
  const categories = Object.keys(config.categories);
  entries.sort((a, b) => categories.indexOf(a.category) - categories.indexOf(b.category)
    || config.categories[a.category].abilities.indexOf(a.id) - config.categories[b.category].abilities.indexOf(b.id));
  for (const [id, data] of Object.entries(techniques)) entries.push({ id, kind: 'technique', category: 'blade', data });
  return entries;
}

export const galleryCatalog = createGalleryCatalog();
export const galleryCasters = Object.keys(characters).filter((id) => characters[id].selectable);

export function sanitizeGallery(value) {
  const result = { ...galleryConfig.defaults };
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  if (galleryCatalog.some((item) => item.id === value.ability)) result.ability = value.ability;
  if (Number.isInteger(value.tier) && value.tier >= 0 && value.tier < galleryConfig.levels.length) result.tier = value.tier;
  if (galleryConfig.targets.includes(value.target)) result.target = value.target;
  if (galleryCasters.includes(value.caster)) result.caster = value.caster;
  if (typeof value.repeat === 'boolean') result.repeat = value.repeat;
  return result;
}

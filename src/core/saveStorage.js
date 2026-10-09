import { attributesConfig } from '../config/attributesConfig.js';
import { storyConfig } from '../config/storyConfig.js';
import { convertLegacyPoints, convertLegacyRatings } from '../utils/legacyRatings.js';

export const SAVE_VERSION = 5;

function migrateStoryRatings(story) {
  const attributes = story?.protagonist?.attributes;
  if (!attributes || typeof attributes !== 'object') {
    return story;
  }
  const cap = storyConfig.ratingCaps[story.difficulty] ?? attributesConfig.maxRating;
  return {
    ...story,
    points: Number.isInteger(story.points) ? convertLegacyPoints(story.points, attributesConfig) : story.points,
    protagonist: { ...story.protagonist, attributes: convertLegacyRatings(attributes, attributesConfig, cap) },
  };
}

export const saveMigrations = [
  { from: 1, to: 2, migrate: (settings) => ({ version: 2, settings }) },
  { from: 2, to: 3, migrate: (save) => ({ ...save, version: 3, story: null }) },
  { from: 3, to: 4, migrate: (save) => ({ ...save, version: 4, story: save.story ? { ...save.story, protagonist: { ...save.story.protagonist, skin: save.story.protagonist?.skin ?? 'base' } } : null }) },
  { from: 4, to: 5, migrate: (save) => ({ ...save, version: 5, story: migrateStoryRatings(save.story) }) },
];

export function loadSave(storage, key) {
  try {
    let saved = JSON.parse(storage?.getItem(key) ?? 'null');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return null;
    let version = saved.version ?? 1;
    if (!Number.isInteger(version) || version < 1 || version > SAVE_VERSION) return null;
    for (const migration of saveMigrations) {
      if (version === migration.from) {
        saved = migration.migrate(saved);
        version = migration.to;
      }
    }
    return version === SAVE_VERSION && saved.settings && typeof saved.settings === 'object' && !Array.isArray(saved.settings) ? saved : null;
  } catch {
    return null;
  }
}

export function saveSave(settings, storage, key, story = null) {
  try {
    storage?.setItem(key, JSON.stringify({ version: SAVE_VERSION, settings, story }));
    return true;
  } catch {
    return false;
  }
}

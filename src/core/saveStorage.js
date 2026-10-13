import { sanitizeStoryRun } from '../modes/story/storyRun.js';
import { attributesConfig } from '../config/attributesConfig.js';
import { storyConfig } from '../config/storyConfig.js';
import { convertLegacyPoints, convertLegacyRatings } from '../utils/legacyRatings.js';

export const SAVE_VERSION = 6;

function migrateDuskUnlock(save) {
  const story = sanitizeStoryRun(save.story, storyConfig);
  const finishedSecret = story?.ending === 'secret' && story.encounter === null
    && storyConfig.encounters.some(encounter => encounter.ending === 'secret' && story.completed.includes(encounter.id));
  if (!finishedSecret) return save;
  const owned = Array.isArray(save.settings?.unlocks?.foretold) ? save.settings.unlocks.foretold : [];
  return { ...save, settings: { ...save.settings, unlocks: { ...save.settings?.unlocks, foretold: [...new Set([...owned, 'skin-dusk'])] } } };
}

function migrateVariantUnlocks(save) {
  if (!Array.isArray(save.settings?.unlockedCharacters) || !save.settings.unlockedCharacters.includes('foretold')) return save;
  return { ...save, settings: { ...save.settings, unlockedVariants: { ...save.settings.unlockedVariants, foretold: ['aurora', 'eclipse'] } } };
}

function migrateStoryRatings(story) {
  const attributes = story?.protagonist?.attributes;
  if (!attributes || typeof attributes !== 'object') {
    return story;
  }
  const cap = storyConfig.ratingCap;
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
  { from: 5, to: 6, migrate: (save) => ({ ...migrateDuskUnlock(migrateVariantUnlocks(save)), version: 6 }) },
];

export function loadSave(storage, key) {
  try {
    let saved = JSON.parse(storage?.getItem(key) ?? 'null');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return null;
    let version = saved.version ?? 1;
    if (!Number.isInteger(version) || version < 1 || version > SAVE_VERSION) return null;
    if (version >= 2 && (!saved.settings || typeof saved.settings !== 'object' || Array.isArray(saved.settings))) return null;
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
    const existing = storage?.getItem(key);
    if (existing) {
      let saved;
      try { saved = JSON.parse(existing); } catch {}
      if (Number.isInteger(saved?.version) && saved.version > SAVE_VERSION) return false;
    }
    storage?.setItem(key, JSON.stringify({ version: SAVE_VERSION, settings, story }));
    return true;
  } catch {
    return false;
  }
}

import { loadSave, saveSave } from './saveStorage.js';

function isValid(value, defaultValue, allowedValues) {
  if (Array.isArray(defaultValue) && defaultValue.length > 0 && defaultValue.every((item) => typeof item === 'boolean')) {
    return Array.isArray(value) && value.length === defaultValue.length && value.every((item) => typeof item === 'boolean');
  }
  if (typeof value !== typeof defaultValue) {
    return false;
  }
  return !allowedValues || allowedValues.includes(value);
}

export function loadSettings(defaults, storage, key, allowed = {}) {
  const settings = { ...defaults };
  if (Array.isArray(defaults.bladeLockHold)) settings.bladeLockHold = [...defaults.bladeLockHold];

  try {
    const saved = loadSave(storage, key)?.settings;
    if (!saved || typeof saved !== 'object') {
      return settings;
    }
    for (const name of Object.keys(defaults)) {
      if (isValid(saved[name], defaults[name], allowed[name])) {
        settings[name] = Array.isArray(saved[name]) ? [...saved[name]] : saved[name];
      }
    }
  } catch {
    return settings;
  }
  return settings;
}

export function saveSettings(settings, storage, key, story = null) {
  return saveSave(settings, storage, key, story);
}

export function loadStory(storage, key) {
  const story = loadSave(storage, key)?.story;
  return story && typeof story === 'object' && !Array.isArray(story) ? story : null;
}

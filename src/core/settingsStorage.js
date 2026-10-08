import { loadSave, saveSave } from './saveStorage.js';

function isValid(value, defaultValue, allowedValues) {
  if (typeof value !== typeof defaultValue) {
    return false;
  }
  return !allowedValues || allowedValues.includes(value);
}

export function loadSettings(defaults, storage, key, allowed = {}) {
  const settings = { ...defaults };

  try {
    const saved = loadSave(storage, key)?.settings;
    if (!saved || typeof saved !== 'object') {
      return settings;
    }
    for (const name of Object.keys(defaults)) {
      if (isValid(saved[name], defaults[name], allowed[name])) {
        settings[name] = saved[name];
      }
    }
  } catch {
    return settings;
  }
  return settings;
}

export function saveSettings(settings, storage, key) {
  return saveSave(settings, storage, key);
}

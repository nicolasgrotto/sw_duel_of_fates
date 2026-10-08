export const SAVE_VERSION = 2;

export const saveMigrations = [
  { from: 1, to: 2, migrate: (settings) => ({ version: 2, settings }) },
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

export function saveSave(settings, storage, key) {
  try {
    storage?.setItem(key, JSON.stringify({ version: SAVE_VERSION, settings }));
    return true;
  } catch {
    return false;
  }
}

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadSettings, saveSettings } from '../src/core/settingsStorage.js';

const defaults = { difficulty: 'normal', sound: true };
const allowed = { difficulty: ['easy', 'normal', 'hard'] };
const KEY = 'test.settings';

function createStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

describe('settingsStorage', () => {
  it('returns the defaults when nothing is saved or there is no storage', () => {
    assert.deepEqual(loadSettings(defaults, createStorage(), KEY, allowed), defaults);
    assert.deepEqual(loadSettings(defaults, undefined, KEY, allowed), defaults);
  });

  it('saves and loads the settings', () => {
    const storage = createStorage();

    saveSettings({ difficulty: 'hard', sound: false }, storage, KEY);

    assert.deepEqual(loadSettings(defaults, storage, KEY, allowed), { difficulty: 'hard', sound: false });
  });

  it('ignores broken data, wrong types and unknown values', () => {
    assert.deepEqual(loadSettings(defaults, createStorage({ [KEY]: '{not json' }), KEY, allowed), defaults);

    const storage = createStorage({ [KEY]: JSON.stringify({ difficulty: 'impossible', sound: 'yes', extra: 1 }) });
    assert.deepEqual(loadSettings(defaults, storage, KEY, allowed), defaults);
  });

  it('does not throw when the storage fails', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };

    assert.deepEqual(loadSettings(defaults, broken, KEY, allowed), defaults);
    assert.equal(saveSettings(defaults, broken, KEY), false);
  });
});

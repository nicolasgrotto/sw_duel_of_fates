import { readFileSync } from 'node:fs';
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

it('migrates a complete v1 save without losing progress or bindings', () => {
  const legacy = readFileSync(new URL('./fixtures/save-v1.json', import.meta.url), 'utf8');
  const settings = JSON.parse(legacy);
  const storage = createStorage({ [KEY]: legacy });
  assert.deepEqual(loadSettings({ difficulty: 'normal', sound: true, music: false, reducedEffects: false, finalReplay: true, keyboardPreset: 'classic', customBindings: {}, arcadeCleared: [], unlocks: {}, survivalBest: 0, parryChallengeBest: 0 }, storage, KEY), settings);
  saveSettings(settings, storage, KEY);
  assert.deepEqual(JSON.parse(storage.data[KEY]), { version: 2, settings });
  assert.deepEqual(loadSettings({ difficulty: 'normal', sound: true, music: false, reducedEffects: false, finalReplay: true, keyboardPreset: 'classic', customBindings: {}, arcadeCleared: [], unlocks: {}, survivalBest: 0, parryChallengeBest: 0 }, storage, KEY), settings);
});

it('rejects future versions and invalid envelopes without overwriting storage', () => {
  for (const saved of [{ version: 3, settings: { sound: false } }, { version: 2, settings: [] }, { version: 0 }, []]) {
    const storage = createStorage({ [KEY]: JSON.stringify(saved) });
    assert.deepEqual(loadSettings(defaults, storage, KEY, allowed), defaults);
    assert.equal(storage.data[KEY], JSON.stringify(saved));
  }
});

it('uses coarse defaults only without a valid saved effects preference, including legacy saves', () => {
  const coarse = { reducedEffects: true };
  assert.equal(loadSettings(coarse, createStorage(), KEY).reducedEffects, true);
  for (const value of [true, false]) {
    for (const saved of [{ reducedEffects: value }, { version: 2, settings: { reducedEffects: value } }]) {
      assert.equal(loadSettings(coarse, createStorage({ [KEY]: JSON.stringify(saved) }), KEY).reducedEffects, value);
    }
  }
  assert.equal(loadSettings(coarse, createStorage({ [KEY]: JSON.stringify({ reducedEffects: 'invalid' }) }), KEY).reducedEffects, true);
});

import { SAVE_VERSION, loadSave } from '../src/core/saveStorage.js';
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
  assert.deepEqual(JSON.parse(storage.data[KEY]), { version: SAVE_VERSION, settings, story: null });
  assert.deepEqual(loadSettings({ difficulty: 'normal', sound: true, music: false, reducedEffects: false, finalReplay: true, keyboardPreset: 'classic', customBindings: {}, arcadeCleared: [], unlocks: {}, survivalBest: 0, parryChallengeBest: 0 }, storage, KEY), settings);
});

it('rejects future versions and invalid envelopes without overwriting storage', () => {
  for (const saved of [{ version: SAVE_VERSION + 1, settings: { sound: false } }, { version: 2, settings: [] }, { version: 0 }, []]) {
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

it('migrates v3 story appearance without losing settings, progress or an existing skin', () => {
  for (const skin of [undefined, 'watcher']) {
    const story = { encounter: 'mine', points: 3, protagonist: { name: 'Iria', skin } };
    const settings = { unlocks: { guardian: ['challenge'] }, arcadeCleared: ['guardian'] };
    const storage = createStorage({ [KEY]: JSON.stringify({ version: 3, settings, story }) });
    const save = loadSave(storage, KEY);
    assert.equal(save.version, SAVE_VERSION);
    assert.deepEqual(save.settings, settings);
    assert.deepEqual(save.story, { ...story, protagonist: { ...story.protagonist, skin: skin ?? 'base' } });
  }
});

it('migrates v4 protagonist ratings to the 1-7 scale with the shared rule and the difficulty cap', () => {
  const settings = { unlockedCharacters: ['sovereign'], unlocks: { guardian: ['skin-story'] } };
  const protagonist = { name: 'Kael', alignment: 'light', style: 'technique', saberColor: '#7fe4ff', skin: 'watcher', attributes: { health: 8, stamina: 4, blade: 7, defense: 3, agility: 5, flow: 8 } };
  const story = { difficulty: 'easy', encounter: 'sovereign', points: 3, slots: ['neutral', 'back'], completed: ['trial', 'forest'], ending: null, protagonist };
  const save = loadSave(createStorage({ [KEY]: JSON.stringify({ version: 4, settings, story }) }), KEY);
  assert.equal(save.version, SAVE_VERSION);
  assert.deepEqual(save.settings, settings);
  assert.deepEqual(save.story.protagonist.attributes, { health: 6, stamina: 3, blade: 6, defense: 3, agility: 4, flow: 7 });
  assert.equal(save.story.points, 2);
  assert.deepEqual({ ...save.story, protagonist: null, points: null }, { ...story, protagonist: null, points: null });
  assert.equal(save.story.protagonist.skin, 'watcher');

  const hard = loadSave(createStorage({ [KEY]: JSON.stringify({ version: 4, settings, story: { ...story, difficulty: 'hard' } }) }), KEY);
  assert.deepEqual(hard.story.protagonist.attributes, { health: 5, stamina: 3, blade: 5, defense: 3, agility: 4, flow: 5 });
  assert.equal(loadSave(createStorage({ [KEY]: JSON.stringify({ version: 4, settings, story: null }) }), KEY).story, null);
});

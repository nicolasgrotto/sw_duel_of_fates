import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { characters } from '../src/characters/characterData.js';
import { createFighter } from '../src/characters/characterFactory.js';
import { colors } from '../src/config/themeConfig.js';
import { getSkinOptions, unlockAllSkins } from '../src/modes/unlocks.js';
import { loadSave, saveSave, SAVE_VERSION } from '../src/core/saveStorage.js';
import { createStoryRun } from '../src/modes/story/storyRun.js';
import { resolveDuelOutcome } from '../src/modes/duelOutcomes.js';
import { storyConfig } from '../src/config/storyConfig.js';
import { storyTexts } from '../src/config/storyTexts.js';
import { DuelMode } from '../src/states/duelModes.js';

function store(raw) {
  let value = JSON.stringify(raw);
  return { getItem: () => value, setItem: (key, next) => { value = next; } };
}
const fixture = JSON.parse(readFileSync(new URL('./fixtures/save-v5.json', import.meta.url), 'utf8'));

it('declares dusk for both variants while preserving blade, moves, stats and base data', () => {
  const skin = characters.foretold.skins.find(skin => skin.id === 'skin-dusk');
  assert.equal(skin.unlock, 'secret');
  assert.equal(skin.appearance.cloakColor, colors.duskCloak);
  assert.equal(getSkinOptions(characters.foretold, {}).find(skin => skin.id === 'skin-dusk').unlocked, false);
  for (const variant of ['aurora', 'eclipse']) {
    const spawn = { x: 400, y: 600, facing: 1 };
    const base = createFighter('foretold', spawn, { variant });
    const dusk = createFighter('foretold', spawn, { variant, skin: 'skin-dusk', saberColor: colors.saberCore });
    assert.deepEqual(dusk.stats, base.stats);
    assert.equal(dusk.appearance.saberColor, colors.saberCore);
    assert.equal(base.appearance.hoodUp, false);
    for (const field of ['hoodUp', 'longCape', 'layeredTunic', 'gloves']) assert.equal(dusk.appearance[field], true);
    for (const field of ['masked', 'pauldrons', 'scarf']) assert.equal(dusk.appearance[field], false);
  }
});

it('unlocks dusk through wardrobe idempotently without changing blade-color unlocks', () => {
  const current = { foretold: ['skin-secret'], guardian: ['challenge'] };
  const unlocked = unlockAllSkins(current, Object.values(characters));
  assert.ok(unlocked.foretold.includes('skin-dusk'));
  assert.ok(unlocked.guardian.includes('challenge'));
  assert.deepEqual(unlockAllSkins(unlocked, Object.values(characters)), unlocked);
  assert.deepEqual(current, { foretold: ['skin-secret'], guardian: ['challenge'] });
});

for (const alignment of ['light', 'dark']) {
  it(`grants dusk after the secret ending on ${alignment}, without granting it for normal endings or defeats`, () => {
    const profile = { name: 'Iria', alignment, style: 'technique', saberColor: '#7fe4ff' };
    const run = createStoryRun(profile, 'normal', storyConfig);
    const context = { params: { story: { ...run, encounter: 'foretold' } }, settings: {}, story: { config: storyConfig, texts: storyTexts, loadouts: storyConfig.protagonist.loadouts, names: Object.fromEntries(Object.entries(characters).map(([id, c]) => [id, c.name])) } };
    const result = { mode: DuelMode.STORY, winnerSide: 0, fighters: [{ healthRatio: 0.5 }, { id: 'foretold', variant: 'aurora' }] };
    const win = resolveDuelOutcome(result, context);
    assert.ok(win.progress.unlocks.foretold.includes('skin-dusk'));
    assert.equal(win.story.ending, 'secret');
    assert.equal(win.story.encounter, null);
    assert.ok(win.story.completed.includes('foretold'));
    assert.deepEqual(resolveDuelOutcome({ ...result, winnerSide: 1 }, context).progress, {});
    const normal = resolveDuelOutcome({ ...result, fighters: [result.fighters[0], { id: 'sovereign' }] }, { ...context, params: { story: { ...run, encounter: 'sovereign' } } });
    assert.ok(!normal.progress.unlocks.foretold?.includes('skin-dusk'));
  });
  it(`migrates reliable persisted evidence on ${alignment} exactly once`, () => {
    const completedFixture = JSON.parse(readFileSync(new URL(`./fixtures/save-v5-secret-${alignment}.json`, import.meta.url), 'utf8'));
    const storage = store(completedFixture);
    const migrated = loadSave(storage, 'save');
    assert.equal(migrated.version, SAVE_VERSION);
    assert.ok(migrated.settings.unlocks.foretold.includes('skin-dusk'));
    assert.equal(migrated.settings.unlocks.foretold.filter(id => id === 'skin-dusk').length, 1);
    assert.deepEqual(migrated.story, completedFixture.story);
    assert.deepEqual(migrated.settings.customBindings, completedFixture.settings.customBindings);
    saveSave(migrated.settings, storage, 'save', migrated.story);
    assert.deepEqual(loadSave(storage, 'save'), migrated);
    const removed = { ...migrated.settings, unlocks: { ...migrated.settings.unlocks, foretold: ['skin-secret'] } };
    saveSave(removed, storage, 'save', migrated.story);
    assert.deepEqual(loadSave(storage, 'save').settings.unlocks.foretold, ['skin-secret']);
  });
}

it('does not infer dusk from the character, legacy costume, incomplete or malformed story', () => {
  const secret = { ...fixture.story, encounter: null, ending: 'secret', completed: ['foretold'] };
  for (const story of [null, fixture.story, { ...secret, ending: 'normal' }, { ...secret, encounter: 'foretold' }, { ...secret, completed: [] }, { ...secret, protagonist: null }]) {
    const loaded = loadSave(store({ ...fixture, story }), 'save');
    assert.ok(!loaded.settings.unlocks.foretold.includes('skin-dusk'));
  }
  assert.equal(loadSave(store({ version: 5, story: secret }), 'save'), null);
});

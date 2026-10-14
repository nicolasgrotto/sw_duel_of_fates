import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { characters } from '../src/characters/characterData.js';
import { createFighter } from '../src/characters/characterFactory.js';
import { findLoadoutProblems } from '../src/characters/powers.js';
import { getUnlockedVariants, sanitizeVariantUnlocks } from '../src/characters/variants.js';
import { resolveDuelOutcome } from '../src/modes/duelOutcomes.js';
import { createStoryRun } from '../src/modes/story/storyRun.js';
import { storyConfig } from '../src/config/storyConfig.js';
import { storyTexts } from '../src/config/storyTexts.js';
import { DuelMode } from '../src/states/duelModes.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { bladeTechniques } from '../src/config/movesConfig.js';
import { loadSave, saveSave, SAVE_VERSION } from '../src/core/saveStorage.js';
import { loadSettings } from '../src/core/settingsStorage.js';
import { captureFighter, restoreFighter } from '../src/simulation/ReplayBuffer.js';
import { Fighter } from '../src/entities/Fighter.js';

const spawn = { x: 400, y: 600, facing: 1 };
function storage(raw) {
  let value = typeof raw === 'string' ? raw : JSON.stringify(raw);
  return { getItem: () => value, setItem: (key, next) => { value = next; } };
}

describe('foretold variants', () => {
  it('shares attributes, moves and appearance except the technique and the hilt, with independent alignment and four-slot loadouts', () => {
    const aurora = createFighter('foretold', spawn);
    const eclipse = createFighter('foretold', spawn, { variant: 'eclipse' });
    assert.equal(aurora.variant, 'aurora');
    assert.equal(aurora.stats.alignment, 'light');
    assert.equal(eclipse.variant, 'eclipse');
    assert.equal(eclipse.stats.alignment, 'dark');
    assert.deepEqual(Object.values(aurora.stats.power.loadout).map(power => power.id), ['push', 'throw', 'barrier', 'meteorRain']);
    assert.deepEqual(Object.values(eclipse.stats.power.loadout).map(power => power.id), ['lightning', 'pull', 'choke', 'arsenal']);
    assert.deepEqual(eclipse.stats.attributes, aurora.stats.attributes);
    const { thrust, ...auroraMoves } = aurora.moves;
    const { sweep, ...eclipseMoves } = eclipse.moves;
    assert.deepEqual(eclipseMoves, auroraMoves);
    assert.ok(thrust && sweep);
    assert.deepEqual([aurora.stats.techniques, eclipse.stats.techniques], [{ forward: 'thrust' }, { forward: 'sweep' }]);
    assert.deepEqual({ ...eclipse.appearance, hiltStyle: null }, { ...aurora.appearance, hiltStyle: null });
    assert.deepEqual([aurora.appearance.hiltStyle, eclipse.appearance.hiltStyle], ['ringed', 'curved']);
    for (const character of Object.values(characters)) {
      assert.equal(character.powerSlots, character.variants ? 4 : 3);
      for (const variant of Object.values(character.variants ?? {})) {
        assert.deepEqual(findLoadoutProblems(variant.loadout, variant.alignment, powersConfig, bladeTechniques, character.powerSlots), []);
      }
    }
    assert.throws(() => createFighter('foretold', spawn, { variant: 'typo' }), /Unknown variant/);
    assert.throws(() => createFighter('guardian', spawn, { variant: 'eclipse' }), /Unknown variant/);
  });
  it('stores the variant id in snapshots and keeps it on round reset', () => {
    const original = createFighter('foretold', spawn, { variant: 'eclipse' });
    const snapshot = captureFighter(original);
    const clone = new Fighter({ id: original.id, stats: original.stats, appearance: original.appearance, ...spawn });
    restoreFighter(clone, snapshot);
    assert.equal(clone.variant, 'eclipse');
    clone.resetForRound(500, -1);
    assert.equal(clone.variant, 'eclipse');
  });
  it('grants both variants only during the migration of an existing unlocked character', () => {
    const fixture = JSON.parse(readFileSync(new URL('./fixtures/save-v5.json', import.meta.url), 'utf8'));
    const store = storage(fixture);
    const migrated = loadSave(store, 'save');
    assert.equal(migrated.version, SAVE_VERSION);
    assert.deepEqual(migrated.settings.unlockedVariants.foretold, ['aurora', 'eclipse']);
    assert.equal(migrated.story, null);
    assert.deepEqual({ ...migrated.settings, unlockedVariants: null }, { ...fixture.settings, unlockedVariants: null });
    saveSave({ ...migrated.settings, unlockedVariants: { foretold: ['aurora'] } }, store, 'save', migrated.story);
    assert.deepEqual(loadSave(store, 'save').settings.unlockedVariants.foretold, ['aurora']);
    const locked = loadSave(storage({ ...fixture, settings: { ...fixture.settings, unlockedCharacters: [] } }), 'save');
    assert.equal(locked.settings.unlockedVariants, undefined);
  });
  it('sanitizes saved variant ids without inventing unlocks or overwriting future saves', () => {
    const raw = { foretold: ['eclipse', 'typo', 'eclipse'], guardian: ['aurora'] };
    assert.deepEqual(sanitizeVariantUnlocks(raw, characters), { foretold: ['eclipse'] });
    const loaded = loadSettings({ unlockedVariants: {} }, storage({ version: SAVE_VERSION, settings: { unlockedVariants: raw } }), 'save');
    assert.deepEqual(loaded.unlockedVariants, { foretold: ['eclipse'] });
    assert.deepEqual(getUnlockedVariants(characters.foretold, loaded), ['eclipse']);
    const future = { version: SAVE_VERSION + 1, settings: { sound: false }, futureField: true };
    const store = storage(future);
    assert.equal(loadSave(store, 'save'), null);
    assert.equal(saveSave({}, store, 'save'), false);
    assert.deepEqual(JSON.parse(store.getItem()), future);
    for (const malformed of ['{broken', JSON.stringify({ version: 5, settings: [] })]) assert.equal(loadSave(storage(malformed), 'save'), null);
  });
  it('passes the variant to the simulator and matrix and rejects unknown ids', () => {
    const args = ['tools/simulate.js', '--duels', '1', '--left', 'foretold', '--right', 'guardian', '--variant', 'foretold=eclipse', '--rules', 'powers', '--maxSeconds', '1'];
    const output = execFileSync(process.execPath, args, { encoding: 'utf8' });
    assert.match(output, /foretold=eclipse/);
    assert.throws(() => execFileSync(process.execPath, [...args.slice(0, -4), '--variant', 'foretold=typo'], { stdio: 'pipe' }));
    const matrix = execFileSync(process.execPath, ['tools/matrix.js', '--characters', 'guardian,foretold', '--duels', '1', '--difficulties', 'normal', '--variant', 'foretold=eclipse', '--rules', 'powers'], { encoding: 'utf8' });
    assert.match(matrix, /foretold/);
  });
});


it('story victory unlocks only the defeated variant, while defeat unlocks neither', () => {
  const profile = { name: 'Iria', alignment: 'light', style: 'technique', saberColor: '#7fe4ff' };
  const run = { ...createStoryRun(profile, 'normal', storyConfig), encounter: 'foretoldEclipse' };
  for (const variant of ['aurora', 'eclipse']) {
    const result = { mode: DuelMode.STORY, winnerSide: 0, fighters: [{ healthRatio: 1 }, { id: 'foretold', variant }] };
    const context = { params: { story: run }, settings: {}, story: { config: storyConfig, texts: storyTexts, names: Object.fromEntries(Object.entries(characters).map(([id, c]) => [id, c.name])) } };
    const outcome = resolveDuelOutcome(result, context);
    assert.deepEqual(outcome.progress.unlockedVariants, { foretold: [variant] });
    assert.ok(outcome.progress.unlockedCharacters.includes('foretold'));
    assert.deepEqual(getUnlockedVariants(characters.foretold, outcome.progress), [variant]);
    const loss = resolveDuelOutcome({ ...result, winnerSide: 1 }, context);
    assert.deepEqual(loss.progress, {});
  }
});

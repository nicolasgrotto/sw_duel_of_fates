import { storyConfig } from '../src/config/storyConfig.js';
import { storyTexts } from '../src/config/storyTexts.js';
import { createStoryRun } from '../src/modes/story/storyRun.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { it } from 'node:test';
import assert from 'node:assert/strict';
import { createDuelResult } from '../src/modes/DuelResult.js';
import { resolveDuelOutcome } from '../src/modes/duelOutcomes.js';
import { characters } from '../src/characters/characterData.js';
import { gameConfig } from '../src/config/gameConfig.js';
import { spawnFighter } from './helpers.js';

it('captures a detached duel result with both health ratios and statistics', () => {
  const fighters = [spawnFighter(400), spawnFighter(700, -1, 'shadow')];
  fighters[0].health = fighters[0].stats.maxHealth / 2;
  const stats = [{ hits: 2 }, { hits: 3 }];
  const result = createDuelResult({ fighters, winner: fighters[1], stats, duration: 13, mode: 'versus' });
  fighters[0].health = 0;
  stats[0].hits = 99;
  assert.equal(result.winnerSide, 1);
  assert.equal(result.fighters[0].healthRatio, 0.5);
  assert.equal(result.stats[0].hits, 2);
  assert.equal(result.duration, 13);
});

it('returns survival navigation and progress without changing inputs', () => {
  const params = { mode: 'survival', survival: { playerCharacter: 'guardian', wins: 6, health: null, seed: 12 } };
  const settings = { survivalBest: 3 };
  const result = { mode: 'survival', winnerSide: 1, fighters: [{ health: 0, maxHealth: 100 }], stats: [] };
  const context = { params, settings, character: characters.guardian, survivalConfig: gameConfig.survival };
  const before = JSON.stringify(context);
  const outcome = resolveDuelOutcome(result, context);
  assert.equal(outcome.progress.survivalBest, 6);
  assert.equal(outcome.params.rematchParams.survival.wins, 0);
  assert.equal(outcome.params.rematchParams.survival.seed, 13);
  assert.equal(JSON.stringify(context), before);
  result.winnerSide = 0;
  result.fighters[0].health = 80;
  const win = resolveDuelOutcome(result, context);
  assert.equal(win.params.rematchParams.survival.health, 100);
  assert.equal(win.params.rematchParams.survival.wins, 7);
  assert.deepEqual(win.progress, {});
});

it('unlocks Arcade skins with challenge rewards and preserves ladder customization', () => {
  const params = { mode: 'arcade', arcade: { playerCharacter: 'guardian', ladder: ['shadow'], stage: 0, playerSkin: 'skin-story', playerSaberColor: 'blade' } };
  const settings = { unlocks: { guardian: ['legacy'] } };
  const result = { mode: 'arcade', winnerSide: 0, fighters: [{ name: 'Guardian' }, {}], stats: [{ perfectParries: 3 }, {}] };
  const outcome = resolveDuelOutcome(result, { params, settings, character: characters.guardian });
  assert.deepEqual(outcome.progress.unlocks.guardian, ['legacy', 'challenge', 'skin-arcade']);
  assert.deepEqual(settings.unlocks.guardian, ['legacy']);
  assert.equal(outcome.params.rematchParams.arcade.playerSkin, 'skin-story');
  assert.equal(outcome.params.rematchParams.arcade.playerSaberColor, 'blade');
  const repeat = resolveDuelOutcome(result, { params, settings: { ...settings, ...outcome.progress }, character: characters.guardian });
  assert.deepEqual(repeat.progress.unlocks.guardian, ['legacy', 'challenge', 'skin-arcade']);
});

it('unlocks roster skins at either story ending and secret skins only at the secret ending', () => {
  const profile = { name: 'Kael', alignment: 'light', style: 'technique', saberColor: storyConfig.protagonist.saberColors[0] };
  const story = { config: storyConfig, texts: storyTexts, loadouts: powersConfig.loadouts, names: Object.fromEntries(Object.values(characters).map((character) => [character.id, character.name])) };
  for (const encounter of ['trial', 'sovereign', 'foretold']) {
    const run = { ...createStoryRun(profile, 'normal', storyConfig), encounter };
    const result = { mode: 'story', winnerSide: 0, fighters: [{ healthRatio: 0.5 }, {}], stats: [{}, {}] };
    const outcome = resolveDuelOutcome(result, { params: { mode: 'story', story: run }, settings: { unlocks: { guardian: ['challenge'] } }, story });
    if (encounter === 'trial') {
      assert.equal(outcome.progress.unlocks, undefined);
      continue;
    }
    for (const character of Object.values(characters).filter((character) => character.selectable)) {
      assert.ok(outcome.progress.unlocks[character.id].includes('skin-story'));
    }
    assert.ok(outcome.progress.unlocks.guardian.includes('challenge'));
    assert.equal(outcome.progress.unlocks.sovereign?.includes('skin-secret') ?? false, encounter === 'foretold');
    assert.equal(outcome.progress.unlocks.foretold?.includes('skin-secret') ?? false, encounter === 'foretold');
  }
});

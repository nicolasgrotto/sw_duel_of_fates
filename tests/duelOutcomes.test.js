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

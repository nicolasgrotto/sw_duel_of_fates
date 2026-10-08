import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { gameConfig } from '../src/config/gameConfig.js';
import { createSurvivalRun, getSurvivalStage, nextSurvivalRun } from '../src/modes/survival.js';

const roster = ['guardian', 'shadow', 'bastion', 'wasp'];

describe('survival run', () => {
  it('raises the difficulty with wins and sends the boss every few wins', () => {
    let run = createSurvivalRun('guardian', null, 3);
    const stages = [];
    for (let i = 0; i < 6; i += 1) {
      stages.push(getSurvivalStage(run, roster, gameConfig.survival, gameConfig.duel.arenaOrder));
      run = nextSurvivalRun(run, 50, 100, gameConfig.survival.healRatio);
    }

    assert.deepEqual(stages.map((stage) => stage.difficulty), ['easy', 'easy', 'normal', 'normal', 'hard', 'hard']);
    assert.deepEqual(stages.map((stage) => stage.isBoss), [false, false, false, false, true, false]);
    assert.equal(stages[4].opponentCharacter, gameConfig.survival.boss);
    assert.ok(stages.every((stage) => stage.opponentCharacter !== 'guardian'));
  });

  it('carries the health over with a partial heal capped at the maximum', () => {
    const run = createSurvivalRun('guardian', null, 1);

    assert.equal(nextSurvivalRun(run, 40, 100, 0.3).health, 70);
    assert.equal(nextSurvivalRun(run, 90, 100, 0.3).health, 100);
    assert.equal(nextSurvivalRun(run, 40, 100, 0.3).wins, 1);
  });

  it('picks the same opponents for the same seed', () => {
    const a = getSurvivalStage(createSurvivalRun('wasp', null, 42), roster, gameConfig.survival, gameConfig.duel.arenaOrder);
    const b = getSurvivalStage(createSurvivalRun('wasp', null, 42), roster, gameConfig.survival, gameConfig.duel.arenaOrder);
    assert.equal(a.opponentCharacter, b.opponentCharacter);
  });
});

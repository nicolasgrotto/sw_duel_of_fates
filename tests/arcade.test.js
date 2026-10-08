import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { gameConfig } from '../src/config/gameConfig.js';
import { createArcadeRun, getArcadeStage, isLastStage, nextArcadeRun } from '../src/modes/arcade.js';

const roster = ['guardian', 'shadow', 'bastion', 'wasp', 'mirror'];

describe('arcade ladder', () => {
  it('faces every other character and ends with the boss', () => {
    const run = createArcadeRun('wasp', roster, gameConfig.arcade);
    assert.deepEqual(run.ladder, ['guardian', 'shadow', 'bastion', 'mirror', 'shadowAwakened']);
  });

  it('raises the difficulty, rotates the arenas and flags the boss stage', () => {
    let run = createArcadeRun('guardian', roster, gameConfig.arcade);
    const stages = [];
    for (;;) {
      stages.push(getArcadeStage(run, gameConfig.arcade, gameConfig.duel.arenaOrder));
      if (isLastStage(run)) {
        break;
      }
      run = nextArcadeRun(run);
    }

    assert.deepEqual(stages.map((stage) => stage.difficulty), ['easy', 'easy', 'normal', 'normal', 'hard']);
    assert.deepEqual(stages.map((stage) => stage.isBoss), [false, false, false, false, true]);
    assert.equal(stages[0].arena, gameConfig.duel.arenaOrder[0]);
    assert.equal(stages[1].arena, gameConfig.duel.arenaOrder[1]);
  });

  it('limits the ladder to the configured number of opponents', () => {
    const many = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const run = createArcadeRun('a', many, gameConfig.arcade);
    assert.equal(run.ladder.length, gameConfig.arcade.maxOpponents + 1);
  });
});

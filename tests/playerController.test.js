import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Action } from '../src/config/controlsConfig.js';
import { PlayerController } from '../src/controllers/PlayerController.js';
import { spawnFighter } from './helpers.js';

function createFakeInput({ down = [], pressed = [] }) {
  return {
    isDown: (action) => down.includes(action),
    wasPressed: (action) => pressed.includes(action),
  };
}

describe('PlayerController', () => {
  it('turns held direction keys into a move direction', () => {
    const fighter = spawnFighter(400);

    new PlayerController(createFakeInput({ down: [Action.MOVE_LEFT] })).updateIntent(fighter.intent);
    assert.equal(fighter.intent.moveX, -1);

    new PlayerController(createFakeInput({ down: [Action.MOVE_LEFT, Action.MOVE_RIGHT] })).updateIntent(fighter.intent);
    assert.equal(fighter.intent.moveX, 0);
  });

  it('uses presses for jump and attacks and held keys for block', () => {
    const fighter = spawnFighter(400);
    const input = createFakeInput({
      down: [Action.BLOCK],
      pressed: [Action.JUMP, Action.HEAVY_ATTACK],
    });

    new PlayerController(input).updateIntent(fighter.intent);

    assert.equal(fighter.intent.jump, true);
    assert.equal(fighter.intent.heavyAttack, true);
    assert.equal(fighter.intent.lightAttack, false);
    assert.equal(fighter.intent.block, true);
  });
});

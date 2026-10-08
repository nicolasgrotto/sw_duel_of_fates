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

  it('keeps presses captured while the simulation is frozen until the next intent update', () => {
    const fighter = spawnFighter(400);
    const pressed = [Action.LIGHT_ATTACK];
    const controller = new PlayerController({
      isDown: () => false,
      wasPressed: (action) => pressed.includes(action),
    });

    controller.captureInput();
    pressed.length = 0;
    controller.updateIntent(fighter.intent);
    assert.equal(fighter.intent.lightAttack, true);

    controller.updateIntent(fighter.intent);
    assert.equal(fighter.intent.lightAttack, false);
  });
});

it('latches evade during hit stop and clears it after one step', () => {
  const fighter = spawnFighter(400);
  let pressed = true;
  const controller = new PlayerController({ isDown: () => false, wasPressed: (action) => pressed && action === Action.EVADE });
  controller.captureInput();
  pressed = false;
  controller.updateIntent(fighter.intent);
  assert.equal(fighter.intent.evade, true);
  controller.updateIntent(fighter.intent);
  assert.equal(fighter.intent.evade, false);
});

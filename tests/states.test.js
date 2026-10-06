import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Action } from '../src/config/controlsConfig.js';
import { StateMachine } from '../src/core/StateMachine.js';
import { createState } from '../src/states/stateFactory.js';
import { StateId } from '../src/states/stateIds.js';

const STEP = 1 / 60;

function createFakeGame() {
  const pressed = new Set();
  const game = {
    states: new StateMachine(),
    input: {
      wasPressed: (action) => pressed.has(action),
      isDown: () => false,
    },
    changeState: (id) => game.states.change(createState(id, game)),
    pushState: (id) => game.states.push(createState(id, game)),
    popState: () => game.states.pop(),
    stateNames: () => game.states.stack.map((state) => state.name),
    step: (...actions) => {
      actions.forEach((action) => pressed.add(action));
      game.states.update(STEP);
      pressed.clear();
    },
  };
  return game;
}

describe('state flow', () => {
  it('goes from the menu to the duel on confirm', () => {
    const game = createFakeGame();
    game.changeState(StateId.MENU);

    game.step();
    assert.deepEqual(game.stateNames(), ['MenuState']);

    game.step(Action.CONFIRM);
    assert.deepEqual(game.stateNames(), ['DuelState']);
  });

  it('pauses the duel and resumes it', () => {
    const game = createFakeGame();
    game.changeState(StateId.DUEL);

    game.step(Action.PAUSE);
    assert.deepEqual(game.stateNames(), ['DuelState', 'PauseState']);

    game.step(Action.PAUSE);
    assert.deepEqual(game.stateNames(), ['DuelState']);
  });

  it('freezes the duel time while paused', () => {
    const game = createFakeGame();
    game.changeState(StateId.DUEL);
    const duel = game.states.current;

    game.step();
    game.step(Action.PAUSE);
    game.step();
    game.step();

    assert.equal(duel.duelTime, STEP);
  });

  it('quits from the pause to the menu', () => {
    const game = createFakeGame();
    game.changeState(StateId.DUEL);

    game.step(Action.PAUSE);
    game.step(Action.QUIT);

    assert.deepEqual(game.stateNames(), ['MenuState']);
  });

  it('throws for an unknown state id', () => {
    assert.throws(() => createState('credits', createFakeGame()), /Unknown state/);
  });
});

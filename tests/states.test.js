import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Action } from '../src/config/controlsConfig.js';
import { colors } from '../src/config/themeConfig.js';
import { layout } from '../src/config/uiConfig.js';
import { StateMachine } from '../src/core/StateMachine.js';
import { createState } from '../src/states/stateFactory.js';
import { StateId } from '../src/states/stateIds.js';

const STEP = 1 / 60;

function createFakeGame() {
  const pressed = new Set();
  const game = {
    states: new StateMachine(),
    debug: { enabled: false },
    input: {
      wasPressed: (action) => pressed.has(action),
      isDown: () => false,
    },
    changeState: (id, params) => game.states.change(createState(id, game, params)),
    pushState: (id, params) => game.states.push(createState(id, game, params)),
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

function skipIntro(game) {
  for (let time = 0; time <= layout.messages.introDuration; time += STEP) {
    game.step();
  }
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

  it('opens the controls screen from the menu and goes back', () => {
    const game = createFakeGame();
    game.changeState(StateId.MENU);

    game.step(Action.MENU_DOWN);
    game.step(Action.CONFIRM);
    assert.deepEqual(game.stateNames(), ['MenuState', 'ControlsState']);

    game.step(Action.BACK);
    assert.deepEqual(game.stateNames(), ['MenuState']);
    assert.equal(game.states.current.menu.selected.id, 'controls');
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
    skipIntro(game);
    game.step();
    const timeBeforePause = duel.duelTime;

    game.step(Action.PAUSE);
    game.step();
    game.step();

    assert.ok(timeBeforePause > 0);
    assert.equal(duel.duelTime, timeBeforePause);
  });

  it('quits from the pause to the menu', () => {
    const game = createFakeGame();
    game.changeState(StateId.DUEL);

    game.step(Action.PAUSE);
    game.step(Action.QUIT);

    assert.deepEqual(game.stateNames(), ['MenuState']);
  });

  it('ends the duel when a fighter dies and goes back to the menu after the result', () => {
    const game = createFakeGame();
    game.changeState(StateId.DUEL);
    const duel = game.states.current;
    const [player, opponent] = duel.fighters;
    opponent.x = player.x + 110;
    opponent.health = 1;
    skipIntro(game);

    game.step(Action.LIGHT_ATTACK);
    for (let i = 0; i < 30; i += 1) {
      game.step();
    }
    assert.equal(duel.outcome.winner, player);

    game.step(Action.CONFIRM);
    assert.deepEqual(game.stateNames(), ['DuelState']);

    for (let i = 0; i < 90; i += 1) {
      game.step();
    }
    game.step(Action.CONFIRM);
    assert.deepEqual(game.stateNames(), ['MenuState']);
  });

  it('cycles the training dummy only when debug is enabled', () => {
    const game = createFakeGame();
    game.changeState(StateId.DUEL);
    const duel = game.states.current;

    game.step(Action.CYCLE_DUMMY);
    assert.equal(duel.dummy.behavior, 'idle');

    game.debug.enabled = true;
    game.step(Action.CYCLE_DUMMY);
    assert.equal(duel.dummy.behavior, 'block');
  });

  it('draws hurtboxes always and the hitbox only during the active phase', () => {
    const game = createFakeGame();
    game.changeState(StateId.DUEL);
    const duel = game.states.current;
    const [player] = duel.fighters;
    const drawnColors = () => {
      const strokes = [];
      duel.renderDebug({ strokeRect: (x, y, width, height, color) => strokes.push(color) });
      return strokes;
    };

    assert.deepEqual(drawnColors(), [colors.debugBody, colors.debugBody]);

    skipIntro(game);
    game.step(Action.LIGHT_ATTACK);
    while (player.stateTime < player.stats.attacks.light.startup) {
      game.step();
    }
    assert.ok(drawnColors().includes(colors.debugHitbox));
  });

  it('locks the controls during the intro', () => {
    const game = createFakeGame();
    game.changeState(StateId.DUEL);
    const [player] = game.states.current.fighters;

    game.step(Action.LIGHT_ATTACK);
    assert.equal(player.state, 'IDLE');

    skipIntro(game);
    game.step(Action.LIGHT_ATTACK);
    assert.equal(player.state, 'ATTACKING');
  });

  it('throws for an unknown state id', () => {
    assert.throws(() => createState('credits', createFakeGame()), /Unknown state/);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Action } from '../src/config/controlsConfig.js';
import { colors } from '../src/config/themeConfig.js';
import { layout } from '../src/config/uiConfig.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { audioConfig } from '../src/config/audioConfig.js';
import { AudioManager } from '../src/core/AudioManager.js';
import { StateMachine } from '../src/core/StateMachine.js';
import { createState } from '../src/states/stateFactory.js';
import { DuelMode } from '../src/states/duelModes.js';
import { StateId } from '../src/states/stateIds.js';

const STEP = 1 / 60;

function createFakeGame() {
  const pressed = new Set();
  const game = {
    states: new StateMachine(),
    debug: { enabled: false },
    settings: { difficulty: 'normal', reducedEffects: false, sound: true, music: true },
    saved: 0,
    applySettings: () => {},
    saveSettings: () => {
      game.saved += 1;
    },
    audio: new AudioManager(audioConfig),
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

    game.step(Action.MENU_UP);
    game.step(Action.CONFIRM);
    assert.deepEqual(game.stateNames(), ['MenuState', 'ControlsState']);

    game.step(Action.BACK);
    assert.deepEqual(game.stateNames(), ['MenuState']);
    assert.equal(game.states.current.menu.selected.id, 'controls');
  });

  it('starts a training duel from the menu', () => {
    const game = createFakeGame();
    game.changeState(StateId.MENU);

    game.step(Action.MENU_DOWN);
    game.step(Action.CONFIRM);

    assert.equal(game.states.current.mode, DuelMode.TRAINING);
  });

  it('changes the options, saves them and uses the difficulty in the next duel', () => {
    const game = createFakeGame();
    game.changeState(StateId.MENU);

    game.step(Action.MENU_DOWN);
    game.step(Action.MENU_DOWN);
    game.step(Action.CONFIRM);
    assert.deepEqual(game.stateNames(), ['MenuState', 'OptionsState']);
    const options = game.states.current;

    game.step(Action.CONFIRM);
    game.step(Action.CONFIRM);
    assert.equal(game.settings.difficulty, 'easy');
    assert.equal(options.items.difficulty.label, 'Dificuldade: Fácil');

    game.step(Action.MENU_DOWN);
    game.step(Action.CONFIRM);
    assert.equal(game.settings.reducedEffects, true);
    assert.equal(options.items.effects.label, 'Efeitos: Reduzidos');

    game.step(Action.MENU_DOWN);
    game.step(Action.CONFIRM);
    game.step(Action.MENU_DOWN);
    game.step(Action.CONFIRM);
    assert.equal(game.settings.sound, false);
    assert.equal(game.settings.music, false);
    assert.equal(options.items.music.label, 'Música: Desligada');
    assert.equal(game.saved, 5);

    game.step(Action.BACK);
    game.step(Action.MENU_UP);
    game.step(Action.MENU_UP);
    game.step(Action.CONFIRM);
    const duel = game.states.current;
    assert.equal(duel.mode, DuelMode.VERSUS);
    assert.equal(duel.opponentController.difficulty.reactionTime, 0.45);
    assert.equal(duel.effects.flashScale, 0);
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
    game.step(Action.MENU_DOWN);
    game.step(Action.MENU_DOWN);
    game.step(Action.CONFIRM);

    assert.deepEqual(game.stateNames(), ['MenuState']);
  });

  it('ends the duel when a fighter dies and goes back to the menu after the result', () => {
    const game = createFakeGame();
    game.changeState(StateId.DUEL, { mode: DuelMode.TRAINING });
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
    assert.deepEqual(game.stateNames(), ['DuelState']);

    for (let i = 0; i < 90; i += 1) {
      game.step();
    }
    assert.deepEqual(game.stateNames(), ['DuelState', 'GameOverState']);
    const result = game.states.current;
    assert.equal(result.params.playerWon, true);
    assert.equal(result.params.stats.hits, 1);
    assert.equal(result.title, 'VITÓRIA');

    game.step(Action.MENU_DOWN);
    game.step(Action.CONFIRM);
    assert.deepEqual(game.stateNames(), ['MenuState']);
  });

  it('cycles the training dummy only when debug is enabled', () => {
    const game = createFakeGame();
    game.changeState(StateId.DUEL, { mode: DuelMode.TRAINING });
    const duel = game.states.current;

    game.step(Action.CYCLE_DUMMY);
    assert.equal(duel.opponentController.behavior, 'idle');

    game.debug.enabled = true;
    game.step(Action.CYCLE_DUMMY);
    assert.equal(duel.opponentController.behavior, 'block');
  });

  it('uses the AI with the chosen difficulty in versus mode', () => {
    const game = createFakeGame();
    game.settings.difficulty = 'hard';
    game.changeState(StateId.DUEL);
    const duel = game.states.current;

    assert.equal(duel.opponentController.constructor.name, 'EnemyAI');
    assert.equal(duel.opponentController.difficulty, aiConfig.difficulties.hard);
    assert.equal(duel.opponentController.profile, aiConfig.profiles.aggressive);
  });

  it('keeps the duel mode when restarting from the pause', () => {
    const game = createFakeGame();
    game.changeState(StateId.DUEL, { mode: DuelMode.TRAINING });

    game.step(Action.PAUSE);
    game.step(Action.MENU_DOWN);
    game.step(Action.CONFIRM);

    assert.equal(game.states.current.mode, DuelMode.TRAINING);
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

  it('restarts the duel from the pause menu', () => {
    const game = createFakeGame();
    game.changeState(StateId.DUEL);
    const firstDuel = game.states.current;

    game.step(Action.PAUSE);
    game.step(Action.MENU_DOWN);
    game.step(Action.CONFIRM);

    assert.deepEqual(game.stateNames(), ['DuelState']);
    assert.notEqual(game.states.current, firstDuel);
  });

  it('resumes the duel with the back key or the first option', () => {
    const game = createFakeGame();
    game.changeState(StateId.DUEL);

    game.step(Action.PAUSE);
    game.step(Action.BACK);
    assert.deepEqual(game.stateNames(), ['DuelState']);

    game.step(Action.PAUSE);
    game.step(Action.CONFIRM);
    assert.deepEqual(game.stateNames(), ['DuelState']);
  });

  it('starts a new duel with the rematch option', () => {
    const game = createFakeGame();
    game.changeState(StateId.GAME_OVER, {
      playerWon: false,
      winnerName: 'Sombra',
      stats: { time: 12.34, hits: 3, blocks: 2 },
    });
    const result = game.states.current;

    assert.equal(result.title, 'DERROTA');
    assert.equal(result.winnerLine, 'Sombra venceu o duelo');
    assert.ok(result.statsLine.includes('12,3'));

    game.step(Action.CONFIRM);
    assert.deepEqual(game.stateNames(), ['DuelState']);
  });

  it('freezes the fighters for a moment when a hit lands', () => {
    const game = createFakeGame();
    game.changeState(StateId.DUEL, { mode: DuelMode.TRAINING });
    const duel = game.states.current;
    const [player, opponent] = duel.fighters;
    opponent.x = player.x + 110;
    skipIntro(game);

    game.step(Action.LIGHT_ATTACK);
    while (opponent.state !== 'HIT') {
      game.step();
    }
    const frozenTime = opponent.stateTime;
    game.step();

    assert.equal(duel.timeControl.isFrozen, true);
    assert.equal(opponent.stateTime, frozenTime);
  });

  it('throws for an unknown state id', () => {
    assert.throws(() => createState('credits', createFakeGame()), /Unknown state/);
  });
});

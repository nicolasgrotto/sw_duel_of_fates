import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Action, keyboardPresets } from '../src/config/controlsConfig.js';
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
    assert.deepEqual(game.stateNames(), ['CharacterSelectState']);
    game.step(Action.CONFIRM);
    game.step(Action.CONFIRM);
    assert.deepEqual(game.stateNames(), ['CharacterSelectState']);
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
    game.step(Action.MENU_DOWN);
    game.step(Action.MENU_DOWN);
    game.step(Action.CONFIRM);

    assert.equal(game.states.current.mode, DuelMode.TRAINING);
  });

  it('changes the options, saves them and uses the difficulty in the next duel', () => {
    const game = createFakeGame();
    game.changeState(StateId.MENU);

    game.step(Action.MENU_DOWN);
    game.step(Action.MENU_DOWN);
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
    game.step(Action.MENU_UP);
    game.step(Action.MENU_UP);
    game.step(Action.CONFIRM);
    game.step(Action.CONFIRM);
    game.step(Action.CONFIRM);
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
    game.step(Action.MENU_DOWN);
    game.step(Action.CONFIRM);

    assert.deepEqual(game.stateNames(), ['MenuState']);
  });

  it('ends the match after the deciding round and goes back to the menu after the result', () => {
    const game = createFakeGame();
    game.changeState(StateId.DUEL);
    const duel = game.states.current;
    duel.roundWins[0] = 1;
    duel.participants[1].controller = { updateIntent: () => {} };
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

  it('cycles the training dummy and stops playback without the debug overlay', () => {
    const game = createFakeGame();
    game.changeState(StateId.DUEL, { mode: DuelMode.TRAINING });
    const duel = game.states.current;
    duel.recorder.toggleRecording();
    duel.recorder.record(duel.fighters[0].intent, 1);
    duel.recorder.stop();
    duel.recorder.startPlayback();

    game.step(Action.CYCLE_DUMMY);

    assert.equal(game.debug.enabled, false);
    assert.equal(duel.opponentController.behavior, 'block');
    assert.equal(duel.recorder.mode, 'idle');
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
      duel.renderDebug({ save: () => {}, restore: () => {}, translate: () => {}, scale: () => {}, width: 1280, strokeRect: (x, y, width, height, color) => strokes.push(color) });
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

  it('ignites the sabers during the intro and opens the letterbox when the round starts', () => {
    const game = createFakeGame();
    const played = [];
    game.audio.play = (name) => played.push(name);
    game.changeState(StateId.DUEL);
    const duel = game.states.current;

    assert.equal(duel.getBladeExtension(), 0);
    skipIntro(game);

    assert.equal(duel.getBladeExtension(), 1);
    assert.equal(played.filter((name) => name === 'ignite').length, 1);
    for (let step = 0; step < 60; step += 1) {
      game.step();
    }
    assert.equal(duel.letterbox.amount, 0);
  });

  it('restarts the duel from the pause menu', () => {
    const game = createFakeGame();
    game.changeState(StateId.DUEL);
    const firstDuel = game.states.current;

    game.step(Action.PAUSE);
    game.step(Action.MENU_DOWN);
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

describe('duel rounds', () => {
  function winRound(game) {
    const duel = game.states.current;
    skipIntro(game);
    duel.participants[1].controller = { updateIntent: (intent) => { intent.lightAttack = false; } };
    const [player, opponent] = duel.fighters;
    player.clearIntent();
    opponent.clearIntent();
    opponent.x = player.x + 110;
    opponent.health = 1;
    game.step(Action.LIGHT_ATTACK);
    for (let i = 0; i < 60 && !duel.outcome; i += 1) {
      game.step();
    }
    assert.equal(duel.outcome.winner, player);
    for (let i = 0; i < 100 && duel.outcome && game.states.current === duel; i += 1) {
      game.step();
    }
  }

  it('restores both fighters after the first win and accumulates match statistics', () => {
    const game = createFakeGame();
    game.changeState(StateId.DUEL);
    const duel = game.states.current;
    winRound(game);
    assert.equal(game.states.current, duel);
    assert.deepEqual(duel.roundWins, [1, 0]);
    assert.equal(duel.roundNumber, 2);
    assert.equal(duel.isIntroPlaying(), true);
    for (const fighter of duel.fighters) {
      assert.equal(fighter.health, fighter.stats.maxHealth);
      assert.equal(fighter.stamina, fighter.stats.maxStamina);
      assert.equal(fighter.state, 'IDLE');
      assert.equal(fighter.combat.bufferedAction, null);
    }
    assert.equal(duel.timeControl.isFrozen, false);
    assert.equal(duel.camera.zoom, 1);
    assert.equal(duel.stats.hits, 1);
    const firstRoundTime = duel.duelTime;
    winRound(game);
    assert.deepEqual(duel.roundWins, [2, 0]);
    assert.equal(game.states.current.name, 'GameOverState');
    assert.equal(game.states.current.params.stats.hits, 2);
    assert.ok(game.states.current.params.stats.time > firstRoundTime);
  });

  it('shows the final round only when each side has one win', () => {
    const game = createFakeGame();
    game.changeState(StateId.DUEL);
    const duel = game.states.current;
    duel.roundWins[1] = 1;
    winRound(game);
    assert.deepEqual(duel.roundWins, [1, 1]);
    assert.equal(duel.message.text, 'ROUND FINAL');
  });

  it('keeps training running after multiple knockouts and preserves dummy behavior', () => {
    const game = createFakeGame();
    game.changeState(StateId.DUEL, { mode: DuelMode.TRAINING });
    const duel = game.states.current;
    duel.opponentController.cycleBehavior();
    winRound(game);
    assert.equal(duel.opponentController.behavior, 'block');
    winRound(game);
    winRound(game);
    assert.equal(game.states.current, duel);
    assert.equal(duel.roundNumber, 4);
    assert.deepEqual(duel.roundWins, [0, 0]);
    assert.equal(duel.stats.hits, 3);
  });

  it('counts parries and guard breaks across rounds in the result', () => {
    const game = createFakeGame();
    game.changeState(StateId.DUEL);
    const duel = game.states.current;
    const [player, opponent] = duel.fighters;
    duel.simulation.events.push(
      { type: 'parry', attacker: opponent, defender: player },
      { type: 'perfectParry', attacker: opponent, defender: player },
      { type: 'guardBreak', attacker: player, defender: opponent },
    );
    duel.countPlayerStats();
    winRound(game);
    winRound(game);
    assert.equal(game.states.current.params.stats.parries, 1);
    assert.equal(game.states.current.params.stats.perfectParries, 1);
    assert.equal(game.states.current.params.stats.guardBreaks, 1);
    assert.equal(game.states.current.rows.find((row) => row.label === 'Parries perfeitos').left, '1');
  });
});

it('shows localized frame data only for player contacts in training', () => {
  const game = createFakeGame();
  game.changeState(StateId.DUEL, { mode: DuelMode.TRAINING });
  const duel = game.states.current;
  const [player, opponent] = duel.fighters;
  player.combat.attack = player.stats.attacks.heavy;
  player.stateTime = player.stats.attacks.heavy.startup;
  opponent.combat.blockstun = 0.28;
  opponent.restartState('BLOCKING');
  duel.simulation.events.push({ type: 'block', attackType: 'heavy', attacker: player, defender: opponent });
  duel.updateFrameData();
  assert.equal(duel.frameDataLine, 'Forte · bloqueado · −0,26 s');
  duel.startNextRound();
  assert.equal(duel.frameDataLine, '');
  duel.mode = DuelMode.VERSUS;
  duel.simulation.events.push({ type: 'block', attackType: 'heavy', attacker: player, defender: opponent });
  duel.updateFrameData();
  assert.equal(duel.frameDataLine, '');
});

it('selects the alternative keyboard preset and shows its guard combination', () => {
  const game = createFakeGame();
  game.changeState(StateId.OPTIONS);
  const options = game.states.current;
  options.toggle('keyboard');
  assert.equal(game.settings.keyboardPreset, 'arrows');
  assert.equal(game.saved, 1);
  assert.equal(options.items.keyboard.label, 'Teclado: Setas + Z/X/C/V');
  game.input.bindings = keyboardPresets.arrows;
  game.changeState(StateId.CONTROLS);
  const controls = game.states.current;
  assert.equal(controls.rows.find(row => row.label.startsWith('Empurrar')).keys, 'C  +  Z');
  assert.equal(controls.rows.find(row => row.label === 'Ataque forte').keys, 'X');
});

it('lets the player select Shadow and keeps the choice after restart and between rounds', () => {
  const game = createFakeGame();
  game.changeState(StateId.MENU);
  game.step(Action.CONFIRM);
  game.step(Action.MENU_DOWN);
  game.step(Action.CONFIRM);
  game.step(Action.MENU_UP);
  game.step(Action.MENU_UP);
  game.step(Action.CONFIRM);
  game.step(Action.MENU_DOWN);
  game.step(Action.CONFIRM);
  let duel = game.states.current;
  assert.equal(duel.arenaId, 'sanctuary');
  assert.equal(duel.player.id, 'shadow');
  assert.equal(duel.fighters[1].id, 'guardian');
  assert.equal(duel.opponentController.profile, aiConfig.profiles.balanced);
  duel.startNextRound();
  assert.equal(duel.player.id, 'shadow');
  assert.equal(duel.opponentController.profile, aiConfig.profiles.balanced);
  game.step(Action.PAUSE);
  game.step(Action.MENU_DOWN);
  game.step(Action.MENU_DOWN);
  game.step(Action.CONFIRM);
  duel = game.states.current;
  assert.equal(duel.player.id, 'shadow');
  assert.equal(duel.fighters[1].id, 'guardian');
});

it('opens the move list of the player character from the pause and goes back', () => {
  const game = createFakeGame();
  game.changeState(StateId.DUEL, { playerCharacter: 'wasp', opponentCharacter: 'guardian' });

  game.step(Action.PAUSE);
  game.step(Action.MENU_DOWN);
  game.step(Action.CONFIRM);
  assert.deepEqual(game.stateNames(), ['DuelState', 'PauseState', 'MoveListState']);
  assert.ok(game.states.current.title.includes('VESPA'));

  game.step(Action.BACK);
  assert.deepEqual(game.stateNames(), ['DuelState', 'PauseState']);
});

it('counts the stats of both fighters for the result table', () => {
  const game = createFakeGame();
  game.changeState(StateId.DUEL);
  const duel = game.states.current;
  const [player, opponent] = duel.fighters;

  duel.countEvent({ type: 'hit', attacker: opponent, defender: player, attackType: 'light3', damage: 10 });
  duel.countEvent({ type: 'shove', attacker: player, defender: opponent });

  assert.equal(duel.fighterStats[1].hits, 1);
  assert.equal(duel.fighterStats[1].damage, 10);
  assert.equal(duel.fighterStats[1].longestChain, 3);
  assert.equal(duel.fighterStats[0].shoves, 1);
});

it('runs the tutorial to the end and offers the parry challenge', () => {
  const game = createFakeGame();
  game.changeState(StateId.DUEL, { mode: DuelMode.TUTORIAL });
  const duel = game.states.current;
  assert.equal(duel.hud.rounds, null);
  assert.equal(duel.opponentController.behavior, 'idle');

  skipIntro(game);
  while (!duel.director.isFinished) {
    duel.director.advance();
  }
  game.step();

  const result = game.states.current;
  assert.deepEqual(game.stateNames(), ['DuelState', 'GameOverState']);
  assert.equal(result.title, 'TUTORIAL CONCLUÍDO');
  game.step(Action.CONFIRM);
  assert.equal(game.states.current.mode, DuelMode.CHALLENGE);
});

it('saves the best parry challenge score', () => {
  const game = createFakeGame();
  game.settings.parryChallengeBest = 2;
  game.changeState(StateId.DUEL, { mode: DuelMode.CHALLENGE });
  const duel = game.states.current;
  assert.equal(duel.opponentController.behavior, 'heavy');

  skipIntro(game);
  duel.director.score = 5;
  duel.director.update(60);
  game.step();

  assert.equal(game.settings.parryChallengeBest, 5);
  assert.ok(game.states.current.winnerLine.includes('NOVO RECORDE'));
});

it('keeps both fighters at full health in the tutorial', () => {
  const game = createFakeGame();
  game.changeState(StateId.DUEL, { mode: DuelMode.TUTORIAL });
  const duel = game.states.current;
  skipIntro(game);
  duel.fighters[1].health = 10;
  game.step();
  assert.equal(duel.fighters[1].health, duel.fighters[1].stats.maxHealth);
});

it('goes back from the opponent step to the player step', () => {
  const game = createFakeGame();
  game.changeState(StateId.CHARACTER_SELECT);
  game.step(Action.MENU_DOWN);
  game.step(Action.CONFIRM);
  const select = game.states.current;
  assert.equal(select.step, 'opponent');

  game.step(Action.BACK);
  assert.equal(select.step, 'player');
  assert.equal(select.menu.selected.id, 'shadow');
  assert.deepEqual(game.stateNames(), ['CharacterSelectState']);
});

it('returns from character selection to the menu without starting a duel', () => {
  const game = createFakeGame();
  game.changeState(StateId.CHARACTER_SELECT);
  game.step(Action.BACK);
  assert.deepEqual(game.stateNames(), ['MenuState']);
});

it('records the player and replays through dummy intents only in training', () => {
  const game = createFakeGame();
  game.changeState(StateId.DUEL, { mode: DuelMode.TRAINING });
  const duel = game.states.current;
  skipIntro(game);
  game.step(Action.RECORD_DUMMY, Action.LIGHT_ATTACK);
  game.step();
  game.step(Action.RECORD_DUMMY);
  assert.ok(duel.recorder.length >= 2);
  game.step(Action.PLAY_DUMMY);
  assert.equal(duel.recorder.mode, 'playing');
  assert.equal(duel.fighters[1].combat.attackType, 'light');
  game.step(Action.TRAINING_HITBOXES);
  assert.equal(duel.trainingHitboxes, true);
  game.step(Action.PAUSE);
  const count = duel.recorder.length;
  game.step();
  assert.equal(duel.recorder.length, count);
});

it('does not activate recording tools outside training', () => {
  const game = createFakeGame();
  game.changeState(StateId.DUEL);
  game.step(Action.RECORD_DUMMY, Action.TRAINING_HITBOXES);
  assert.equal(game.states.current.recorder.mode, 'idle');
  assert.equal(game.states.current.trainingHitboxes, false);
});

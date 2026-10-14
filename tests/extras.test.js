import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { characters } from '../src/characters/characterData.js';
import { challengesConfig } from '../src/config/challengesConfig.js';
import { Action } from '../src/config/controlsConfig.js';
import { drillsConfig } from '../src/config/drillsConfig.js';
import { en } from '../src/config/locales/en.js';
import { ptBR } from '../src/config/locales/ptBR.js';
import { storyConfig } from '../src/config/storyConfig.js';
import { storyTexts } from '../src/config/storyTexts.js';
import { gameConfig } from '../src/config/gameConfig.js';
import { AudioManager } from '../src/core/AudioManager.js';
import { audioConfig } from '../src/config/audioConfig.js';
import { StateMachine } from '../src/core/StateMachine.js';
import { createTrialParams, getTrialStage, recordTrialTime } from '../src/modes/challenges.js';
import { resolveDuelOutcome } from '../src/modes/duelOutcomes.js';
import { buildStoryGallery, createStorySeen, markStorySeen, StoryEntryKind } from '../src/modes/story/storyGallery.js';
import { createStoryRun } from '../src/modes/story/storyRun.js';
import { TutorialDirector } from '../src/modes/TutorialDirector.js';
import { DuelMode } from '../src/states/duelModes.js';
import { createState } from '../src/states/stateFactory.js';
import { StateId } from '../src/states/stateIds.js';

const STEP = 1 / 60;
const TABLES = [ptBR, en];
const NAMES = Object.fromEntries(Object.entries(characters).map(([id, character]) => [id, character.name]));

function createGame(settings = {}) {
  const pressed = new Set();
  const game = {
    states: new StateMachine(),
    debug: { enabled: false },
    settings: { difficulty: 'normal', reducedEffects: false, sound: true, music: true, finalReplay: false, powers: true, ...settings },
    story: null,
    saved: 0,
    applySettings() {},
    saveSettings() { game.saved += 1; },
    audio: new AudioManager(audioConfig),
    input: { wasPressed: (action) => pressed.has(action), isDown: () => false, setBindings() {}, lastPressedCode: null },
    secondInput: { wasPressed: () => false, isDown: () => false },
    changeState: (id, params) => game.states.change(createState(id, game, params)),
    pushState: (id, params) => game.states.push(createState(id, game, params)),
    popState: () => game.states.pop(),
    step: (...actions) => {
      actions.forEach((action) => pressed.add(action));
      game.states.update(STEP);
      pressed.clear();
    },
  };
  return game;
}

function moveTo(game, id) {
  for (let index = 0; index < 30 && game.states.current.menu.selected.id !== id; index += 1) game.step(Action.MENU_DOWN);
  assert.equal(game.states.current.menu.selected.id, id);
}

describe('guided drills', () => {
  it('describes every drill step in both languages with a valid goal', () => {
    for (const id of drillsConfig.order) {
      for (const table of TABLES) {
        assert.ok(table.ui.drills.names[id] && table.ui.drills.descriptions[id].length > 0, id);
      }
      for (const step of drillsConfig.drills[id].steps) {
        assert.ok(['event', 'streak'].includes(step.goal.type), step.id);
        assert.ok(['idle', 'block', 'attack', 'heavy', 'lock'].includes(step.dummy), step.id);
        for (const table of TABLES) assert.ok(table.ui.drills.steps[step.id], step.id);
      }
    }
  });

  it('advances streak goals from the fighter counter and resets event goals when hit', () => {
    const player = { combat: { evadeStreak: 0 }, intent: { moveX: 0 }, facing: 1 };
    const dummy = {};
    const director = new TutorialDirector(drillsConfig.drills.evade.steps);
    director.handleEvents([{ type: 'evadeSuccess', defender: player, attacker: dummy, attackType: 'light' }], player);
    assert.equal(director.step.id, 'evadeStreak');
    player.combat.evadeStreak = 2;
    director.update(STEP, player);
    assert.equal(director.progress, 2);
    player.combat.evadeStreak = 3;
    director.update(STEP, player);
    assert.equal(director.step.id, 'evadePunish');
    director.handleEvents([{ type: 'hit', attacker: player, defender: dummy, attackType: 'light' }], player);
    assert.equal(director.progress, 1);
    director.handleEvents([{ type: 'hit', attacker: dummy, defender: player, attackType: 'light' }], player);
    assert.equal(director.progress, 0);
  });

  it('counts blade lock starts on either side', () => {
    const player = { combat: {}, intent: { moveX: 0 }, facing: 1 };
    const director = new TutorialDirector(drillsConfig.drills.bladeLock.steps);
    director.handleEvents([{ type: 'bladeLockStart', attacker: {}, defender: player, attackType: 'heavy' }], player);
    assert.equal(director.step.id, 'lockWins');
  });

  it('opens drills from the list with v3 consequences on, powers off and the next drill offered at the end', () => {
    const game = createGame();
    game.changeState(StateId.DRILL_SELECT);
    assert.deepEqual(game.states.current.menu.items.map((item) => item.id), [...drillsConfig.order, 'back']);
    game.step(Action.CONFIRM);
    const duel = game.states.current;
    assert.equal(duel.name, 'DuelState');
    assert.equal(duel.mode, DuelMode.DRILL);
    assert.equal(duel.director.steps, drillsConfig.drills.evade.steps);
    assert.deepEqual({ ...duel.rules }, { powers: false, exhaustion: true, wounds: true, focusEvade: false, bladeLock: true, finishers: true, bladeLockRhythm: false });
    duel.showModeResult();
    const result = game.states.current;
    assert.equal(result.params.rematchParams.drill, 'exhaustion');
    assert.equal(result.params.menuState, StateId.DRILL_SELECT);
  });
});

describe('local challenges', () => {
  it('fixes fighters, arena, difficulty, rules and seed for every challenge', () => {
    for (const id of challengesConfig.order) {
      const challenge = challengesConfig.challenges[id];
      assert.ok(characters[challenge.player].selectable, id);
      assert.ok(characters[challenge.opponent], id);
      assert.ok(gameConfig.duel.arenaOrder.includes(challenge.arena), id);
      assert.ok(['easy', 'normal', 'hard'].includes(challenge.difficulty), id);
      for (const table of TABLES) assert.ok(table.ui.trials.names[id] && table.ui.trials.goals[id], id);
      const params = createTrialParams(id, challengesConfig);
      assert.equal(params.seed, challenge.seed);
      assert.equal(params.rules.powers, challenge.powers);
      assert.equal(params.rules.focusEvade, challenge.powers);
      assert.equal(getTrialStage(params.trial, challengesConfig).arena, challenge.arena);
    }
  });

  it('starts the duel with the fixed seed, one round and the challenge health, ignoring the options', () => {
    const game = createGame({ difficulty: 'easy', powers: false });
    const params = createTrialParams('lastStand', challengesConfig);
    game.changeState(StateId.DUEL, params);
    const first = game.states.current;
    const firstRolls = [first.random(), first.random()];
    assert.equal(first.roundsToWin, 1);
    assert.equal(first.difficultyId, 'normal');
    assert.equal(first.arenaId, 'snowPeak');
    assert.equal(first.player.id, 'bastion');
    assert.equal(first.fighters[1].id, 'forge');
    assert.equal(first.player.health, first.player.stats.maxHealth * 0.35);
    game.changeState(StateId.DUEL, params);
    const second = game.states.current;
    assert.notEqual(second, first);
    assert.deepEqual([second.random(), second.random()], firstRolls);
    const deck = createTrialParams('deckStorm', challengesConfig);
    game.changeState(StateId.DUEL, deck);
    assert.equal(game.states.current.rules.powers, true);
  });

  it('keeps only the best time and offers the list on the result', () => {
    const first = recordTrialTime({}, 'saltNoFlow', 40.2);
    assert.equal(first.improved, true);
    const slower = recordTrialTime(first.records, 'saltNoFlow', 52);
    assert.equal(slower.improved, false);
    assert.equal(slower.best, 40.2);
    const params = createTrialParams('saltNoFlow', challengesConfig);
    const result = { mode: DuelMode.TRIAL, winnerSide: 0, duration: 33.45, fighters: [{}, {}], stats: [{}, {}] };
    const win = resolveDuelOutcome(result, { params, settings: { challengeRecords: first.records } });
    assert.deepEqual(win.progress.challengeRecords.saltNoFlow, { time: 33.45 });
    assert.equal(win.params.menuState, StateId.TRIAL_SELECT);
    assert.equal(win.params.rematchParams, params);
    const loss = resolveDuelOutcome({ ...result, winnerSide: 1 }, { params, settings: {} });
    assert.deepEqual(loss.progress, {});
  });

  it('shows the record in the list detail', () => {
    const game = createGame({ challengeRecords: { saltNoFlow: { time: 41.26 } } });
    game.changeState(StateId.TRIAL_SELECT);
    const list = game.states.current;
    assert.match(list.menu.selected.detail.accent, /41,3/);
    game.step(Action.MENU_DOWN);
    assert.equal(list.menu.selected.detail.accent, game.states.current.menu.selected.detail.accent);
    game.step(Action.CONFIRM);
    assert.equal(game.states.current.mode, DuelMode.TRIAL);
  });
});

describe('story gallery', () => {
  it('hides unseen encounters and endings and lists them in route order', () => {
    const entries = buildStoryGallery(storyConfig, createStorySeen(), null);
    assert.equal(entries.length, storyConfig.encounters.length + Object.keys(storyConfig.endings).length);
    assert.ok(entries.every((entry) => entry.witness === null));
    assert.deepEqual(entries.filter((entry) => entry.kind === StoryEntryKind.ENCOUNTER).map((entry) => entry.id), storyConfig.encounters.map((encounter) => encounter.id));
    assert.ok(entries.filter((entry) => entry.kind === StoryEntryKind.ENDING).every((entry) => entry.arena));
  });

  it('remembers who saw each encounter and ending, and counts the current run', () => {
    const protagonist = { name: 'Iria', alignment: 'dark' };
    const seen = markStorySeen(createStorySeen(), { encounterId: 'elder', ending: 'eclipseNormal', protagonist });
    const run = { ...createStoryRun({ name: 'Ravi', alignment: 'light', style: 'technique', saberColor: '#7fe4ff' }, 'normal', storyConfig), completed: ['trial'] };
    const entries = buildStoryGallery(storyConfig, seen, run);
    const find = (id) => entries.find((entry) => entry.id === id);
    assert.deepEqual(find('elder').witness, protagonist);
    assert.deepEqual(find('eclipseNormal').witness, protagonist);
    assert.deepEqual(find('trial').witness, { name: 'Ravi', alignment: 'light' });
    assert.equal(find('forest').witness, null);
  });

  it('records the encounter on a story win and not on a defeat', () => {
    const profile = { name: 'Iria', alignment: 'light', style: 'technique', saberColor: '#7fe4ff' };
    const run = createStoryRun(profile, 'normal', storyConfig);
    const context = { params: { story: run }, settings: {}, story: { config: storyConfig, texts: storyTexts, names: NAMES } };
    const result = { mode: DuelMode.STORY, winnerSide: 0, fighters: [{ healthRatio: 1 }, { id: 'guardian' }] };
    const win = resolveDuelOutcome(result, context);
    assert.deepEqual(win.progress.storySeen.encounters[run.encounter], { alignment: 'light', name: 'Iria' });
    assert.equal(resolveDuelOutcome({ ...result, winnerSide: 1 }, context).progress.storySeen, undefined);
  });

  it('keeps locked entries closed and replays seen ones before returning to the gallery', () => {
    const game = createGame({ storySeen: markStorySeen(createStorySeen(), { encounterId: 'trial', ending: null, protagonist: { name: 'Iria', alignment: 'light' } }) });
    game.changeState(StateId.STORY_GALLERY);
    const gallery = game.states.current;
    moveTo(game, 'encounter:forest');
    assert.equal(gallery.menu.selected.label, '???');
    game.step(Action.CONFIRM);
    assert.equal(game.states.current, gallery);
    game.step(Action.MENU_UP);
    assert.equal(gallery.menu.selected.id, 'encounter:trial');
    game.step(Action.CONFIRM);
    const dialogue = game.states.current;
    assert.equal(dialogue.name, 'DialogueState');
    assert.equal(dialogue.params.arena, 'refinery');
    assert.ok(dialogue.lines.length > 0);
    assert.ok(dialogue.lines.every((line) => !line.text.includes('{name}')));
    game.step(Action.BACK);
    assert.equal(game.states.current.name, 'StoryGalleryState');
  });
});

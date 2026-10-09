import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createFighterFromCharacter } from '../src/characters/characterFactory.js';
import { createProtagonistCharacter } from '../src/characters/protagonist.js';
import { Action } from '../src/config/controlsConfig.js';
import { audioConfig } from '../src/config/audioConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { storyConfig } from '../src/config/storyConfig.js';
import { storyTexts } from '../src/config/storyTexts.js';
import { layout } from '../src/config/uiConfig.js';
import { AudioManager } from '../src/core/AudioManager.js';
import { StateMachine } from '../src/core/StateMachine.js';
import { evaluateCondition } from '../src/modes/story/conditions.js';
import { resolveDialogue } from '../src/modes/story/dialogue.js';
import {
  canRaiseAttribute, createStoryRun, getStoryStage, raiseAttribute, resolveStoryResult, sanitizeStoryRun,
} from '../src/modes/story/storyRun.js';
import { DuelMode } from '../src/states/duelModes.js';
import { createState } from '../src/states/stateFactory.js';
import { StateId } from '../src/states/stateIds.js';

const STEP = 1 / 60;
const PROFILE = { name: 'Kael', alignment: 'dark', style: 'technique', saberColor: '#7fe4ff' };
const ORDER = ['easy', 'normal', 'hard'];

function result(winnerSide, healthRatio = 0.5) {
  return { winnerSide, fighters: [{ healthRatio }, { healthRatio: 0 }], stats: [{}, {}] };
}

function testConfig() {
  return {
    ...storyConfig,
    encounters: [
      { id: 'a', opponent: 'guardian', arena: 'refinery', aiOffset: -1, next: 'b', reward: { powers: true } },
      { id: 'b', opponent: 'shadow', arena: 'forest', outcomes: [
        { condition: { type: 'healthRatioAbove', threshold: 0.75 }, next: 'c' },
        { condition: { type: 'always' }, ending: 'normal' },
      ] },
      { id: 'c', opponent: 'echo', arena: 'sanctuary', ending: 'secret', unlocks: ['echo'] },
    ],
    start: 'a',
    endings: { normal: { unlocks: ['shadow'] }, secret: { unlocks: ['guardian'] } },
  };
}

describe('story run', () => {
  it('starts with the base ratings, starting points and only the neutral power', () => {
    const run = createStoryRun(PROFILE, 'normal', storyConfig);
    assert.equal(run.encounter, storyConfig.start);
    assert.equal(run.points, storyConfig.startPoints);
    assert.deepEqual(run.slots, ['neutral']);
    assert.deepEqual(run.protagonist.attributes, storyConfig.startAttributes);
  });

  it('raises attributes within points, the difficulty cap and the total budget', () => {
    const cap = storyConfig.ratingCaps.hard;
    const start = storyConfig.startAttributes.flow;
    const budget = Object.values(storyConfig.startAttributes).reduce((sum, value) => sum + value, 0) + cap - start;
    const config = { ...storyConfig, budgets: { ...storyConfig.budgets, hard: budget } };
    let run = { ...createStoryRun(PROFILE, 'hard', config), points: 10 };
    for (let rating = start; rating < cap; rating += 1) {
      run = raiseAttribute(run, 'flow', config);
    }
    assert.equal(run.protagonist.attributes.flow, cap);
    assert.equal(canRaiseAttribute(run, 'health', config), false);
    run = { ...run, protagonist: { ...run.protagonist, attributes: { ...run.protagonist.attributes, flow: cap - 1 } } };
    assert.equal(canRaiseAttribute(run, 'flow', config), true);
    const capped = { ...run, protagonist: { ...run.protagonist, attributes: { ...run.protagonist.attributes, flow: cap } } };
    assert.equal(canRaiseAttribute({ ...capped, points: 5 }, 'flow', { ...config, budgets: { hard: 99 } }), false);
    assert.equal(raiseAttribute({ ...run, points: 0 }, 'health', config).points, 0);
  });

  it('keeps the encounter on a defeat and advances with points and rewards on a victory', () => {
    const config = testConfig();
    const run = createStoryRun(PROFILE, 'normal', config);
    assert.equal(resolveStoryResult(run, result(1), config, powersConfig.loadouts).run, run);
    const won = resolveStoryResult(run, result(0), config, powersConfig.loadouts);
    assert.equal(won.run.encounter, 'b');
    assert.equal(won.run.points, run.points + config.pointsPerVictory);
    assert.deepEqual(won.run.slots, ['neutral', 'forward']);
    assert.deepEqual(won.run.completed, ['a']);
  });

  it('routes the final duel by the remaining health and unlocks by ending', () => {
    const config = testConfig();
    const atB = { ...createStoryRun(PROFILE, 'normal', config), encounter: 'b' };
    const normal = resolveStoryResult(atB, result(0, 0.6), config, powersConfig.loadouts);
    assert.equal(normal.ending, 'normal');
    assert.equal(normal.run.encounter, null);
    assert.deepEqual(normal.unlocks, ['shadow']);
    const secret = resolveStoryResult(atB, result(0, 0.8), config, powersConfig.loadouts);
    assert.equal(secret.run.encounter, 'c');
    const final = resolveStoryResult(secret.run, result(0), config, powersConfig.loadouts);
    assert.equal(final.ending, 'secret');
    assert.deepEqual(final.unlocks, ['echo', 'guardian']);
  });

  it('maps encounter difficulty with the offset clamped to the order', () => {
    const config = testConfig();
    assert.equal(getStoryStage(createStoryRun(PROFILE, 'easy', config), config, ORDER).difficulty, 'easy');
    assert.equal(getStoryStage(createStoryRun(PROFILE, 'hard', config), config, ORDER).difficulty, 'normal');
  });

  it('evaluates data conditions and rejects unknown types', () => {
    const run = createStoryRun(PROFILE, 'normal', storyConfig);
    assert.equal(evaluateCondition({ type: 'alignmentIs', alignment: 'dark' }, { run }), true);
    assert.equal(evaluateCondition({ type: 'healthRatioAbove', threshold: 0.75 }, { result: result(0, 0.75) }), false);
    assert.throws(() => evaluateCondition({ type: 'nope' }, {}));
  });

  it('sanitizes saved runs', () => {
    const run = createStoryRun(PROFILE, 'normal', storyConfig);
    assert.deepEqual(sanitizeStoryRun(JSON.parse(JSON.stringify(run)), storyConfig), run);
    assert.equal(sanitizeStoryRun({ ...run, difficulty: 'boss' }, storyConfig), null);
    assert.equal(sanitizeStoryRun({ ...run, encounter: 'missing' }, storyConfig), null);
    assert.equal(sanitizeStoryRun({ ...run, protagonist: { ...run.protagonist, attributes: { health: 'x' } } }, storyConfig), null);
    assert.equal(sanitizeStoryRun(null, storyConfig), null);
  });

  it('resolves dialogue speakers, alignment variants and the name placeholder', () => {
    const lines = resolveDialogue(storyTexts.encounters.trial.before, PROFILE, { guardian: 'Guardião' });
    assert.equal(lines[0].speaker, '');
    assert.equal(lines[1].speaker, 'Guardião');
    assert.ok(lines[1].text.startsWith('Kael'));
    assert.equal(lines[2].text, storyTexts.encounters.trial.before[2].text.dark);
  });
});

describe('protagonist', () => {
  it('builds a fighter from the profile, the style base and the unlocked power slots', () => {
    const run = createStoryRun(PROFILE, 'normal', storyConfig);
    const character = createProtagonistCharacter(run.protagonist, storyConfig, run.slots);
    const fighter = createFighterFromCharacter(character, { x: 0, y: 0, facing: 1 });
    assert.equal(fighter.name, 'Kael');
    assert.equal(fighter.appearance.saberColor, PROFILE.saberColor);
    assert.equal(fighter.flowLevel, storyConfig.startAttributes.flow);
    assert.deepEqual(Object.keys(fighter.stats.power.loadout), ['neutral']);
    assert.equal(fighter.stats.power.loadout.neutral.id, 'lightning');
  });
});

function createFakeGame() {
  const pressed = new Set();
  const game = {
    states: new StateMachine(),
    debug: { enabled: false },
    settings: { difficulty: 'normal', reducedEffects: false, sound: true, music: true, finalReplay: false },
    story: null,
    saved: 0,
    applySettings: () => {},
    saveSettings: () => {
      game.saved += 1;
    },
    audio: new AudioManager(audioConfig),
    input: { wasPressed: (action) => pressed.has(action), isDown: () => false, setBindings: () => {}, lastPressedCode: null },
    secondInput: { wasPressed: () => false, isDown: () => false },
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

function winStoryDuel(game) {
  const duel = game.states.current;
  for (let time = 0; time <= layout.messages.introDuration; time += STEP) {
    game.step();
  }
  duel.participants[1].controller = { updateIntent: (intent) => { intent.lightAttack = false; } };
  const [player, opponent] = duel.fighters;
  opponent.x = player.x + 110;
  opponent.health = 1;
  game.step(Action.LIGHT_ATTACK);
  for (let i = 0; i < 400 && game.states.current === duel; i += 1) {
    game.step();
  }
}

describe('story flow', () => {
  it('creates a duelist, spends points, plays an encounter and returns to the hub', () => {
    const game = createFakeGame();
    game.changeState(StateId.STORY);
    assert.deepEqual(game.stateNames(), ['StoryState']);
    game.step(Action.CONFIRM);
    assert.deepEqual(game.stateNames(), ['ProtagonistState']);
    for (let step = 0; step < 6; step += 1) {
      game.step(Action.CONFIRM);
    }
    assert.ok(game.story);
    assert.equal(game.states.current.mode, 'upgrade');
    game.step(Action.CONFIRM);
    assert.equal(game.story.protagonist.attributes.health, storyConfig.startAttributes.health + 1);
    assert.equal(game.story.points, storyConfig.startPoints - 1);
    game.step(Action.BACK);
    assert.deepEqual(game.stateNames(), ['StoryState']);

    game.step(Action.CONFIRM);
    assert.deepEqual(game.stateNames(), ['DialogueState']);
    for (let i = 0; i < 10 && game.stateNames()[0] === 'DialogueState'; i += 1) {
      game.step(Action.CONFIRM);
    }
    const duel = game.states.current;
    assert.equal(duel.mode, DuelMode.STORY);
    assert.equal(duel.player.id, 'protagonist');
    assert.equal(duel.fighters[1].id, storyConfig.encounters[0].opponent);
    assert.equal(duel.rules.powers, true);
    assert.equal(duel.roundsToWin, 1);

    winStoryDuel(game);
    assert.equal(game.stateNames().at(-1), 'DialogueState');
    assert.equal(game.story.encounter, storyConfig.encounters[0].next);
    for (let i = 0; i < 10 && game.stateNames().at(-1) === 'DialogueState'; i += 1) {
      game.step(Action.CONFIRM);
    }
    assert.deepEqual(game.stateNames(), ['StoryState']);
    assert.ok(game.states.current.menu.items[0].label.includes('2'));
  });
});

it('applies protagonist skins independently of style, powers, ratings and blade color', () => {
  const base = createStoryRun(PROFILE, 'normal', storyConfig);
  const profile = { ...base.protagonist, skin: 'watcher' };
  const fighter = createFighterFromCharacter(createProtagonistCharacter(profile, storyConfig), { x: 0, y: 0, facing: 1 });
  assert.equal(fighter.appearance.hoodUp, true);
  assert.equal(fighter.appearance.masked, true);
  assert.equal(fighter.appearance.longCape, false);
  assert.equal(fighter.appearance.saberColor, PROFILE.saberColor);
  assert.deepEqual(fighter.stats.attributes, profile.attributes);
  assert.equal(sanitizeStoryRun({ ...base, protagonist: profile }, storyConfig).protagonist.skin, 'watcher');
  assert.equal(sanitizeStoryRun({ ...base, protagonist: { ...profile, skin: 'invalid' } }, storyConfig).protagonist.skin, 'base');
});

it('uses an injected name prompt, keeps ready names and removes the prompt on step change and exit', () => {
  const game = createFakeGame();
  let removed = 0;
  let submitted = false;
  game.createTextPrompt = () => ({ value: 'Nara', focused: false, consumeSubmit: () => { const result = submitted; submitted = false; return result; }, destroy: () => { removed += 1; } });
  game.changeState(StateId.PROTAGONIST);
  assert.ok(game.states.current.menu.items.some((item) => item.id === 'Kael'));
  submitted = true;
  game.step();
  assert.equal(game.states.current.profile.name, 'Nara');
  assert.equal(game.states.current.step, 'alignment');
  assert.equal(removed, 1);
  game.step(Action.BACK);
  game.step(Action.BACK);
  assert.equal(removed, 2);
});

describe('story secrets', () => {
  it('fights the foretold at the boss difficulty and frees the elder only on the Aurora path', () => {
    const atForetold = { ...createStoryRun(PROFILE, 'easy', storyConfig), encounter: 'foretold' };
    assert.equal(getStoryStage(atForetold, storyConfig, ORDER).difficulty, 'boss');
    const dark = resolveStoryResult(atForetold, result(0), storyConfig, powersConfig.loadouts);
    assert.equal(dark.ending, 'secret');
    assert.ok(!dark.unlocks.includes('elder'));
    const light = resolveStoryResult({ ...atForetold, protagonist: { ...atForetold.protagonist, alignment: 'light' } }, result(0), storyConfig, powersConfig.loadouts);
    assert.deepEqual(light.unlocks, ['foretold', 'elder']);
  });
});

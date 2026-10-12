import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { arenas } from '../src/arenas/arenaData.js';
import { characters } from '../src/characters/characterData.js';
import { createFighter, createFighterFromCharacter } from '../src/characters/characterFactory.js';
import { Action } from '../src/config/controlsConfig.js';
import { attributesConfig } from '../src/config/attributesConfig.js';
import { audioConfig } from '../src/config/audioConfig.js';
import { introConfig } from '../src/config/introConfig.js';
import { secretsConfig, SecretToken } from '../src/config/secretsConfig.js';
import { storyConfig } from '../src/config/storyConfig.js';
import { storyTexts } from '../src/config/storyTexts.js';
import { layout } from '../src/config/uiConfig.js';
import { AudioManager } from '../src/core/AudioManager.js';
import { StateMachine } from '../src/core/StateMachine.js';
import { SecretUnlockSystem } from '../src/modes/SecretUnlockSystem.js';
import { DuelMode } from '../src/states/duelModes.js';
import { createState } from '../src/states/stateFactory.js';
import { StateId } from '../src/states/stateIds.js';

const STEP = 1 / 60;
const keys = (word) => [...word].map((letter) => SecretToken.key(`Key${letter}`));

function feedAll(system, tokens) {
  let matched = null;
  for (const token of tokens) {
    matched = system.feed(token) ?? matched;
  }
  return matched;
}

describe('SecretUnlockSystem', () => {
  it('matches directional actions, restarts after mistakes and ignores other token kinds', () => {
    const system = new SecretUnlockSystem(secretsConfig);
    const pad = secretsConfig.sequences.find(sequence => sequence.id === 'balancePad');
    assert.equal(feedAll(system, pad.tokens.slice(0, -1)), null);
    assert.equal(system.feed(SecretToken.key('KeyO')), null);
    assert.equal(system.feed(pad.tokens.at(-1)).reward, 'balance');
    system.feed(pad.tokens[0]);
    system.feed(SecretToken.action(Action.MENU_DOWN));
    assert.equal(feedAll(system, pad.tokens).id, 'balancePad');
  });

  it('forgets an unfinished directional sequence after the timeout', () => {
    const system = new SecretUnlockSystem(secretsConfig);
    const tokens = secretsConfig.sequences.find(sequence => sequence.id === 'balancePad').tokens;
    feedAll(system, tokens.slice(0, tokens.length / 2));
    system.update(secretsConfig.timeout + STEP);
    assert.equal(feedAll(system, tokens.slice(tokens.length / 2)), null);
  });

  it('preserves both directional rewards and the wardrobe tagline taps', () => {
    for (const id of ['balancePad', 'wardrobePad', 'wardrobeTouch']) {
      const sequence = secretsConfig.sequences.find(sequence => sequence.id === id);
      assert.equal(feedAll(new SecretUnlockSystem(secretsConfig), sequence.tokens).id, id);
    }
  });

  it('rejects both removed keyboard phrases and title taps', () => {
    for (const phrase of ['EQUILIBRIO', 'GUARDAROUPA']) {
      assert.equal(feedAll(new SecretUnlockSystem(secretsConfig), keys(phrase)), null);
    }
    const system = new SecretUnlockSystem(secretsConfig);
    for (let tap = 0; tap < 7; tap++) assert.equal(system.feed(SecretToken.tap('title')), null);
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
    input: { wasPressed: (action) => pressed.has(action), isDown: () => false, setBindings: () => {}, lastPressedCode: null, touchTaps: [] },
    secondInput: { wasPressed: () => false, isDown: () => false },
    changeState: (id, params) => game.states.change(createState(id, game, params)),
    pushState: (id, params) => game.states.push(createState(id, game, params)),
    popState: () => game.states.pop(),
    stateNames: () => game.states.stack.map((state) => state.name),
    step: (...actions) => {
      actions.forEach((action) => pressed.add(action));
      game.states.update(STEP);
      pressed.clear();
      game.input.lastPressedCode = null;
      game.input.touchTaps = [];
    },
    type: (code) => {
      game.input.lastPressedCode = code;
      game.step();
    },
    tap: (x, y) => {
      game.input.touchTaps = [{ x, y }];
      game.step();
    },
  };
  return game;
}

describe('IntroState', () => {
  it('ignores the removed phrases without changing saved unlocks', () => {
    const game = createFakeGame();
    game.settings.unlockedCharacters = ['elder'];
    game.settings.unlocks = { guardian: ['skin-arcade'] };
    game.changeState(StateId.INTRO);
    for (const phrase of ['EQUILIBRIO', 'GUARDAROUPA']) {
      for (const token of keys(phrase)) game.type(token.slice('key:'.length));
    }
    assert.deepEqual(game.settings.unlockedCharacters, ['elder']);
    assert.deepEqual(game.settings.unlocks, { guardian: ['skin-arcade'] });
    assert.equal(game.saved, 0);
    assert.equal(game.states.current.messageTime, 0);
  });

  it('skips to the title, then opens the menu', () => {
    const game = createFakeGame();
    game.changeState(StateId.INTRO);
    game.step(Action.CONFIRM);
    assert.ok(game.states.current.isReady);
    game.step(Action.CONFIRM);
    assert.deepEqual(game.stateNames(), ['MenuState']);
  });

  it('unlocks and saves the secret fighters through directional actions', () => {
    const game = createFakeGame();
    game.changeState(StateId.INTRO);
    const sequence = secretsConfig.sequences.find(entry => entry.id === 'balancePad');
    for (const token of sequence.tokens) game.step(token.slice('action:'.length));
    assert.deepEqual(game.settings.unlockedCharacters, ['elder', 'sovereign', 'foretold']);
    assert.equal(game.saved, 1);
    assert.ok(game.states.current.messageTime > 0);
    assert.deepEqual(game.stateNames(), ['IntroState']);
  });

  it('ignores title taps and starts with a tap elsewhere', () => {
    const game = createFakeGame();
    game.changeState(StateId.INTRO);
    for (let index = 0; index < 7; index += 1) {
      game.tap(640, layout.intro.titleY);
    }
    assert.equal(game.settings.unlockedCharacters, undefined);
    assert.equal(game.saved, 0);
    game.tap(640, 650);
    assert.ok(game.states.current.isReady);
    game.tap(640, 650);
    assert.deepEqual(game.stateNames(), ['MenuState']);
    assert.ok(introConfig.prompt.start > 0);
  });
});

describe('secret fighters', () => {
  it('reach 8, 9 and 10 through potential while ordinary fighters stop at 7', () => {
    for (const [id, potential] of [['elder', 1], ['sovereign', 2], ['foretold', 3]]) {
      assert.equal(characters[id].selectable, false);
      const fighter = createFighter(id, { x: 0, y: 0, facing: 1 });
      assert.equal(fighter.stats.potential, potential);
      assert.ok(Object.values(fighter.stats.attributes).every((value) => value <= attributesConfig.maxRating + potential));
      assert.equal(fighter.flowLevel, attributesConfig.maxRating + potential);
    }
    for (const character of Object.values(characters).filter((entry) => !entry.secret)) {
      assert.ok(Object.values(character.attributes).every((value) => value <= attributesConfig.maxRating), character.id);
    }
    const ordinary = { ...characters.guardian, attributes: { ...characters.guardian.attributes, flow: 8 } };
    assert.throws(() => createFighterFromCharacter(ordinary, { x: 0, y: 0, facing: 1 }), RangeError);
  });

  it('unlocks every skin with tagline taps without touching blade colors', () => {
    const game = createFakeGame();
    game.changeState(StateId.INTRO);
    const sequence = secretsConfig.sequences.find(entry => entry.id === 'wardrobeTouch');
    for (const token of sequence.tokens) game.tap(640, layout.intro.taglineY + introConfig.tapAreas.tagline.height / 4);
    for (const character of Object.values(characters)) {
      for (const skin of (character.skins ?? []).filter((entry) => entry.unlock)) {
        assert.ok(game.settings.unlocks[character.id].includes(skin.id), `${character.id} ${skin.id}`);
      }
      assert.ok(!(game.settings.unlocks[character.id] ?? []).includes('arcade'));
    }
    assert.equal(game.saved, 1);
  });

  it('appear in the selection only after being unlocked and stay out of the arcade ladder', () => {
    const game = createFakeGame();
    game.changeState(StateId.CHARACTER_SELECT, { mode: DuelMode.ARCADE });
    assert.ok(!game.states.current.characterIds.includes('sovereign'));
    game.settings.unlockedCharacters = ['sovereign', 'foretold'];
    game.changeState(StateId.CHARACTER_SELECT, { mode: DuelMode.ARCADE });
    const select = game.states.current;
    assert.ok(select.characterIds.includes('foretold'));
    select.characterMenu.selectedIndex = select.characterIds.indexOf('foretold');
    game.step(Action.CONFIRM);
    const duel = game.states.current;
    assert.equal(duel.player.id, 'foretold');
    assert.ok(!duel.params.arcade.ladder.slice(0, -1).some((id) => characters[id].secret));
  });
});

describe('story content', () => {
  it('has texts, real opponents, arenas and valid routes for every encounter', () => {
    const ids = new Set(storyConfig.encounters.map((encounter) => encounter.id));
    for (const encounter of storyConfig.encounters) {
      assert.ok(storyTexts.encounters[encounter.id], encounter.id);
      assert.ok(characters[encounter.opponent], encounter.opponent);
      assert.ok(arenas[encounter.arena], encounter.arena);
      for (const target of [encounter.next, ...(encounter.outcomes ?? []).map((outcome) => outcome.next)]) {
        assert.ok(target === null || target === undefined || ids.has(target), `${encounter.id} → ${target}`);
      }
      for (const ending of [encounter.ending, ...(encounter.outcomes ?? []).map((outcome) => outcome.ending)].filter(Boolean)) {
        assert.ok(storyConfig.endings[ending] && storyTexts.endings[ending], ending);
      }
    }
    assert.ok(ids.has(storyConfig.start));
  });
});

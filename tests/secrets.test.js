import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { arenas } from '../src/arenas/arenaData.js';
import { characters } from '../src/characters/characterData.js';
import { createFighter, createFighterFromCharacter } from '../src/characters/characterFactory.js';
import { Action } from '../src/config/controlsConfig.js';
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
  it('matches the key phrase, restarts on a wrong letter and keeps kinds apart', () => {
    const system = new SecretUnlockSystem(secretsConfig);
    assert.equal(feedAll(system, keys('EQUILIBRI')), null);
    assert.equal(system.feed(SecretToken.action(Action.MENU_UP)), null);
    assert.equal(system.feed(SecretToken.key('KeyO')).reward, 'balance');
    assert.equal(feedAll(system, keys('EQUXEQUILIBRIO')).id, 'balanceKeys');
  });

  it('forgets a half-typed sequence after the timeout', () => {
    const system = new SecretUnlockSystem(secretsConfig);
    feedAll(system, keys('EQUIL'));
    system.update(secretsConfig.timeout + 0.1);
    assert.equal(feedAll(system, keys('IBRIO')), null);
  });

  it('matches the pad and touch sequences', () => {
    const pad = secretsConfig.sequences.find((sequence) => sequence.id === 'balancePad');
    const touch = secretsConfig.sequences.find((sequence) => sequence.id === 'balanceTouch');
    assert.equal(feedAll(new SecretUnlockSystem(secretsConfig), pad.tokens).id, 'balancePad');
    assert.equal(feedAll(new SecretUnlockSystem(secretsConfig), touch.tokens).id, 'balanceTouch');
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
  it('skips to the title, then opens the menu', () => {
    const game = createFakeGame();
    game.changeState(StateId.INTRO);
    game.step(Action.CONFIRM);
    assert.ok(game.states.current.isReady);
    game.step(Action.CONFIRM);
    assert.deepEqual(game.stateNames(), ['MenuState']);
  });

  it('unlocks and saves both secret fighters when the phrase is typed', () => {
    const game = createFakeGame();
    game.changeState(StateId.INTRO);
    for (const letter of 'EQUILIBRIO') {
      game.type(`Key${letter}`);
    }
    assert.deepEqual(game.settings.unlockedCharacters, ['elder', 'sovereign', 'foretold']);
    assert.equal(game.saved, 1);
    assert.ok(game.states.current.messageTime > 0);
    assert.deepEqual(game.stateNames(), ['IntroState']);
  });

  it('unlocks with taps on the title and starts with a tap elsewhere', () => {
    const game = createFakeGame();
    game.changeState(StateId.INTRO);
    for (let index = 0; index < 7; index += 1) {
      game.tap(640, layout.intro.titleY);
    }
    assert.deepEqual(game.settings.unlockedCharacters, ['elder', 'sovereign', 'foretold']);
    game.tap(640, 650);
    assert.deepEqual(game.stateNames(), ['MenuState']);
    assert.ok(introConfig.prompt.start > 0);
  });
});

describe('secret fighters', () => {
  it('have elevated potential (+1, +2, +3) while ordinary fighters keep flow at 8 or less', () => {
    for (const [id, potential] of [['elder', 1], ['sovereign', 2], ['foretold', 3]]) {
      assert.equal(characters[id].selectable, false);
      const fighter = createFighter(id, { x: 0, y: 0, facing: 1 });
      assert.equal(fighter.stats.potential, potential);
      assert.ok(Object.values(fighter.stats.attributes).every((value) => value <= 9 + potential));
    }
    assert.equal(createFighter('foretold', { x: 0, y: 0, facing: 1 }).flowLevel, 12);
    for (const character of Object.values(characters).filter((entry) => !entry.secret)) {
      assert.ok(character.attributes.flow <= 8, character.id);
    }
    const ordinary = { ...characters.guardian, attributes: { ...characters.guardian.attributes, flow: 9 } };
    assert.throws(() => createFighterFromCharacter(ordinary, { x: 0, y: 0, facing: 1 }), RangeError);
  });

  it('unlocks every skin with the wardrobe phrase without touching blade colors', () => {
    const game = createFakeGame();
    game.changeState(StateId.INTRO);
    for (const letter of 'GUARDAROUPA') {
      game.type(`Key${letter}`);
    }
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

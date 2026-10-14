import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { characters } from '../src/characters/characterData.js';
import { getCustomPowerCatalog } from '../src/characters/powers.js';
import { Action } from '../src/config/controlsConfig.js';
import { gameConfig } from '../src/config/gameConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { AudioManager } from '../src/core/AudioManager.js';
import { audioConfig } from '../src/config/audioConfig.js';
import { StateMachine } from '../src/core/StateMachine.js';
import { MenuList } from '../src/ui/MenuList.js';
import { RANDOM_CHOICE } from '../src/states/CharacterSelectState.js';
import { DuelMode } from '../src/states/duelModes.js';
import { MENU_GROUPS } from '../src/states/MenuState.js';
import { createState } from '../src/states/stateFactory.js';
import { StateId } from '../src/states/stateIds.js';

const STEP = 1 / 60;

function createGame() {
  const pressed = new Set();
  const game = {
    states: new StateMachine(),
    debug: { enabled: false },
    settings: { difficulty: 'normal', reducedEffects: false, sound: true, music: true, finalReplay: false, powers: true },
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

describe('grouped menu', () => {
  it('groups the modes by intent, opens a group in place and goes back to the root', () => {
    const game = createGame();
    game.changeState(StateId.MENU);
    const menu = game.states.current;
    assert.deepEqual(menu.menu.items.map((item) => item.id), MENU_GROUPS.root);
    moveTo(game, 'learn');
    game.step(Action.CONFIRM);
    assert.equal(menu.group, 'learn');
    assert.deepEqual(menu.menu.items.map((item) => item.id), ['tutorial', 'drills', 'training', 'challenge', 'controls', 'back']);
    game.step(Action.BACK);
    assert.equal(menu.group, 'root');
    assert.equal(menu.menu.selected.id, 'learn');
    game.step(Action.BACK);
    assert.equal(menu.group, 'root');
  });

  it('remembers the group and item when coming back from a mode', () => {
    const game = createGame();
    game.changeState(StateId.MENU);
    game.step(Action.CONFIRM);
    moveTo(game, 'arcade');
    game.step(Action.CONFIRM);
    assert.equal(game.states.current.name, 'CharacterSelectState');
    game.step(Action.BACK);
    assert.equal(game.states.current.name, 'MenuState');
    assert.equal(game.states.current.group, 'play');
    assert.equal(game.states.current.menu.selected.id, 'arcade');
  });

  it('lists every mode exactly once across the groups', () => {
    const items = Object.entries(MENU_GROUPS).filter(([group]) => group !== 'root').flatMap(([, ids]) => ids.filter((id) => id !== 'back'));
    assert.equal(new Set(items).size, items.length);
    for (const mode of ['duel', 'story', 'arcade', 'survival', 'local', 'tutorial', 'training', 'challenge', 'controls', 'gallery']) assert.ok(items.includes(mode), mode);
  });
});

describe('scrolling list', () => {
  it('keeps the selection inside the visible window and maps taps through the scroll offset', () => {
    const items = Array.from({ length: 16 }, (_, index) => ({ id: `item${index}`, label: `${index}` }));
    const list = new MenuList(items, { firstItemY: 100, itemSpacing: 40, visibleRows: 5, listX: 200, touchWidth: 300 });
    for (let index = 0; index < 9; index += 1) list.move(1);
    assert.equal(list.selectedIndex, 9);
    assert.equal(list.scrollOffset, 5);
    const input = { touchTaps: [{ x: 200, y: 100 + 40 * 2 }], wasPressed: () => false };
    list.update(input);
    assert.equal(list.selected.id, 'item7');
    list.move(-7);
    assert.equal(list.selectedIndex, 0);
    assert.equal(list.scrollOffset, 0);
  });
});

describe('character selection', () => {
  it('starts on the first fighter, offers random first and resolves random picks among the unlocked fighters and arenas', () => {
    const game = createGame();
    game.changeState(StateId.CHARACTER_SELECT, { mode: DuelMode.VERSUS });
    const select = game.states.current;
    assert.equal(select.characterMenu.items[0].id, RANDOM_CHOICE);
    assert.equal(select.menu.selected.id, select.characterIds[0]);
    game.step(Action.MENU_UP);
    assert.equal(select.menu.selected.id, RANDOM_CHOICE);
    game.step(Action.CONFIRM);
    assert.ok(select.characterIds.includes(select.playerChoice));
    select.selectId(select.menu, RANDOM_CHOICE);
    game.step(Action.CONFIRM);
    select.selectId(select.menu, RANDOM_CHOICE);
    game.step(Action.CONFIRM);
    const duel = game.states.current;
    assert.ok(gameConfig.duel.arenaOrder.includes(duel.params.arena));
    assert.ok(select.characterIds.includes(duel.params.opponentCharacter));
    assert.equal(duel.params.selectionSeed, select.seed);
  });

  it('remembers the last choices per mode, including random', () => {
    const game = createGame();
    game.changeState(StateId.CHARACTER_SELECT, { mode: DuelMode.VERSUS });
    let select = game.states.current;
    select.selectId(select.menu, 'heron');
    game.step(Action.CONFIRM);
    select.selectId(select.menu, RANDOM_CHOICE);
    game.step(Action.CONFIRM);
    select.selectId(select.menu, 'forest');
    game.step(Action.CONFIRM);
    assert.deepEqual(game.settings.lastSelection.versus, { player: 'heron', opponent: RANDOM_CHOICE, arena: 'forest' });
    game.changeState(StateId.CHARACTER_SELECT, { mode: DuelMode.VERSUS });
    select = game.states.current;
    assert.equal(select.menu.selected.id, 'heron');
    game.step(Action.CONFIRM);
    assert.equal(select.menu.selected.id, RANDOM_CHOICE);
    game.changeState(StateId.CHARACTER_SELECT, { mode: DuelMode.ARCADE });
    assert.equal(game.states.current.menu.selected.id, game.states.current.characterIds[0]);
  });

  it('sends training through the fighter selection', () => {
    const game = createGame();
    game.changeState(StateId.CHARACTER_SELECT, { mode: DuelMode.TRAINING });
    const select = game.states.current;
    select.selectId(select.menu, 'wasp');
    game.step(Action.CONFIRM);
    assert.equal(game.states.current.mode, DuelMode.TRAINING);
    assert.equal(game.states.current.player.id, 'wasp');
  });
});

describe('custom power sets', () => {
  function openEditor(game, mode, id) {
    game.changeState(StateId.CHARACTER_SELECT, { mode });
    const select = game.states.current;
    select.selectId(select.menu, id);
    game.step(Action.HEAVY_ATTACK);
    return select;
  }

  it('lets the player switch to a custom set, cycle a slot and use it in the duel', () => {
    const game = createGame();
    const select = openEditor(game, DuelMode.VERSUS, 'guardian');
    assert.ok(select.editor);
    game.step(Action.CONFIRM);
    assert.equal(game.settings.loadoutModes.guardian, 'custom');
    game.step(Action.MENU_DOWN);
    game.step(Action.MOVE_RIGHT);
    const powers = game.settings.customLoadouts.guardian;
    assert.notEqual(powers.neutral, characters.guardian.loadout.powers.neutral);
    assert.ok(Object.values(powers).every((id) => getCustomPowerCatalog(characters.guardian, powersConfig).includes(id)));
    assert.equal(new Set(Object.values(powers)).size, 3);
    game.step(Action.BACK);
    assert.equal(select.editor, null);
    game.step(Action.CONFIRM);
    game.step(Action.CONFIRM);
    game.step(Action.CONFIRM);
    const duel = game.states.current;
    assert.equal(duel.player.stats.power.loadout.neutral.id, powers.neutral);
    assert.deepEqual(duel.params.playerPowers, powers);
  });

  it('swaps powers instead of repeating them', () => {
    const game = createGame();
    const select = openEditor(game, DuelMode.VERSUS, 'guardian');
    const base = { ...characters.guardian.loadout.powers };
    const catalog = getCustomPowerCatalog(characters.guardian, powersConfig);
    let next = base;
    let previous = base;
    for (let index = 0; index < catalog.length && next.neutral !== base.back; index += 1) {
      previous = next;
      next = select.cyclePower(next, 'neutral', 1);
      assert.equal(new Set(Object.values(next)).size, 3);
    }
    assert.equal(next.neutral, base.back);
    assert.equal(next.back, previous.neutral);
  });

  it('keeps the base set in Arcade and when powers are off, and ignores invalid saved sets', () => {
    const game = createGame();
    assert.equal(openEditor(game, DuelMode.ARCADE, 'guardian').editor, null);
    game.settings.powers = false;
    assert.equal(openEditor(game, DuelMode.VERSUS, 'guardian').editor, null);
    game.settings.powers = true;
    game.settings.loadoutModes = { guardian: 'custom' };
    game.settings.customLoadouts = { guardian: { neutral: 'lightning', forward: 'heal', back: 'barrier' } };
    game.changeState(StateId.CHARACTER_SELECT, { mode: DuelMode.VERSUS });
    assert.equal(game.states.current.getChosenPowers('guardian'), null);
  });

  it('keeps one custom set per variant', () => {
    const game = createGame();
    game.settings.unlockedCharacters = ['foretold'];
    game.settings.unlockedVariants = { foretold: ['aurora', 'eclipse'] };
    const select = openEditor(game, DuelMode.VERSUS, 'foretold');
    game.step(Action.CONFIRM);
    assert.equal(game.settings.loadoutModes['foretold.aurora'], 'custom');
    assert.equal(Object.keys(game.settings.customLoadouts['foretold.aurora']).length, 4);
    game.step(Action.BACK);
    game.step(Action.POWER);
    assert.equal(select.getChosenVariant('foretold'), 'eclipse');
    assert.equal(select.getChosenPowers('foretold'), null);
  });
});

describe('selection preferences', () => {
  it('saves and loads the last selection and the custom sets', async () => {
    const { loadSettings, saveSettings } = await import('../src/core/settingsStorage.js');
    let stored = null;
    const storage = { getItem: () => stored, setItem: (key, value) => { stored = value; } };
    const defaults = { lastSelection: {}, loadoutModes: {}, customLoadouts: {} };
    const settings = { lastSelection: { versus: { player: 'heron' } }, loadoutModes: { guardian: 'custom' }, customLoadouts: { guardian: { neutral: 'throw', forward: 'heal', back: 'pull' } } };
    saveSettings(settings, storage, 'save');
    assert.deepEqual(loadSettings(defaults, storage, 'save'), settings);
  });
});

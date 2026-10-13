import { afterEach, it } from 'node:test';
import assert from 'node:assert/strict';
import { characters } from '../src/characters/characterData.js';
import { en } from '../src/config/locales/en.js';
import { ptBR } from '../src/config/locales/ptBR.js';
import { storyConfig } from '../src/config/storyConfig.js';
import { storyTexts } from '../src/config/storyTexts.js';
import { difficultyNames, texts } from '../src/config/uiConfig.js';
import { defaultLanguage, getLanguage, languageIds, nextLanguage, setLanguage } from '../src/ui/language.js';

const PLACEHOLDER = /\{(\w+)\}/g;

function collectLeaves(value, path = '', leaves = new Map()) {
  if (typeof value === 'string') {
    leaves.set(path, value);
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => collectLeaves(item, `${path}[${index}]`, leaves));
  } else if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) collectLeaves(item, path ? `${path}.${key}` : key, leaves);
  }
  return leaves;
}

function placeholders(text) {
  return [...text.matchAll(PLACEHOLDER)].map((match) => match[1]).sort().join(',');
}

afterEach(() => setLanguage(defaultLanguage));

it('keeps the same keys and placeholders in every language table', () => {
  const base = collectLeaves(ptBR);
  for (const table of [en]) {
    const leaves = collectLeaves(table);
    assert.deepEqual([...leaves.keys()].filter((key) => !base.has(key)), [], `${table.id} has extra keys`);
    assert.deepEqual([...base.keys()].filter((key) => !leaves.has(key)), [], `${table.id} misses keys`);
    for (const [key, text] of leaves) {
      assert.ok(text.trim().length > 0, `${table.id}.${key} is empty`);
      assert.equal(placeholders(text), placeholders(base.get(key)), `${table.id}.${key} placeholders`);
      assert.ok(!/undefined|\bnull\b/.test(text), `${table.id}.${key}`);
    }
  }
});

it('covers every character, skin and blade color by id', () => {
  for (const table of [ptBR, en]) {
    assert.deepEqual(Object.keys(table.characters).sort(), Object.keys(characters).sort());
    for (const [id, character] of Object.entries(characters)) {
      const text = table.characters[id];
      for (const skin of character.skins ?? []) assert.ok(text.skins?.[skin.id], `${table.id} ${id} skin ${skin.id}`);
      for (const color of character.altSaberColors ?? []) {
        assert.ok(text.saberColors?.[color.id], `${table.id} ${id} color ${color.id}`);
        if (color.challenge) assert.ok(text.challenges?.[color.id], `${table.id} ${id} challenge ${color.id}`);
      }
    }
    for (const skin of storyConfig.protagonist.skins) assert.ok(table.protagonistSkins[skin.id]);
  }
});

it('switches every live text table and character name, and back', () => {
  const menuTexts = texts.menu;
  assert.equal(setLanguage('en'), 'en');
  assert.equal(getLanguage(), 'en');
  assert.equal(texts.menu, menuTexts);
  assert.equal(texts.menu.duel, 'Duel');
  assert.equal(texts.attributes.stamina, 'Stamina');
  assert.equal(difficultyNames.hard, 'Hard');
  assert.equal(storyTexts.encounters.trial.title, 'The Trial');
  assert.equal(characters.guardian.name, 'Guardian');
  assert.equal(characters.forge.altSaberColors.find((color) => color.id === 'challenge').challenge.text, 'win breaking the guard 2 times');
  assert.equal(storyConfig.protagonist.skins[0].name, 'Wanderer');

  setLanguage('pt-BR');
  assert.equal(texts.menu.duel, 'Duelar');
  assert.equal(texts.attributes.stamina, 'Vigor');
  assert.equal(characters.guardian.name, 'Guardião');
  assert.equal(storyConfig.protagonist.skins[0].name, 'Errante');
});

it('falls back to Portuguese for an unknown language and cycles the known ones', () => {
  assert.equal(setLanguage('xx'), 'pt-BR');
  assert.deepEqual(languageIds, ['pt-BR', 'en']);
  assert.equal(nextLanguage('pt-BR'), 'en');
  assert.equal(nextLanguage('en'), 'pt-BR');
});

function createGame() {
  const game = {
    settings: { language: 'pt-BR', difficulty: 'normal', reducedEffects: false, sound: true, music: true, finalReplay: true, powers: true, keyboardPreset: 'classic' },
    input: { wasPressed: () => false, isDown: () => false, bindings: null },
    audio: null,
    coarsePointer: false,
    saveSettings: () => {},
    applySettings: () => setLanguage(game.settings.language),
  };
  return game;
}

it('switches the language from the options and refreshes the menu underneath', async () => {
  const { OptionsState, OptionId } = await import('../src/states/OptionsState.js');
  const { MenuState } = await import('../src/states/MenuState.js');
  const game = createGame();
  const menu = new MenuState(game);
  menu.enter();
  const options = new OptionsState(game);
  options.enter();
  assert.equal(options.items.language.label, 'Idioma: Português');

  options.toggle(OptionId.LANGUAGE);
  assert.equal(game.settings.language, 'en');
  assert.equal(options.items.language.label, 'Language: English');
  assert.equal(options.items.back.label, 'Back');
  menu.resume();
  assert.equal(menu.menu.items[0].label, 'Play');
});

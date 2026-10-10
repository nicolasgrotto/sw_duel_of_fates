import { characters } from '../characters/characterData.js';
import { applyCharacterTexts } from '../characters/characterTexts.js';
import { en } from '../config/locales/en.js';
import { ptBR } from '../config/locales/ptBR.js';
import { storyConfig } from '../config/storyConfig.js';
import { storyTexts } from '../config/storyTexts.js';
import { difficultyNames, texts } from '../config/uiConfig.js';
import { applyNames, mergeTables, replaceTable } from '../utils/textTables.js';

export const languages = Object.freeze([ptBR, en]);
export const languageIds = Object.freeze(languages.map((table) => table.id));
export const defaultLanguage = ptBR.id;

let current = defaultLanguage;

function findTable(id) {
  return languages.find((table) => table.id === id) ?? ptBR;
}

export function getLanguage() {
  return current;
}

export function getLanguageName(id) {
  return findTable(id).name;
}

export function nextLanguage(id) {
  return languageIds[(languageIds.indexOf(id) + 1) % languageIds.length];
}

export function setLanguage(id) {
  const table = findTable(id);
  const merged = table === ptBR ? ptBR : mergeTables(ptBR, table);
  replaceTable(texts, merged.ui);
  replaceTable(difficultyNames, merged.difficultyNames);
  replaceTable(storyTexts, merged.story);
  applyCharacterTexts(characters, merged.characters);
  applyNames(storyConfig.protagonist.skins, merged.protagonistSkins);
  current = table.id;
  return current;
}

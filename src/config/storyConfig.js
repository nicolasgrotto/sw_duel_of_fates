import { applyNames } from '../utils/textTables.js';
import { ptBR } from './locales/ptBR.js';

const VICTORY_POINTS = { easy: 3, normal: 2, hard: 1 };
const FIRST_MILESTONE_POINTS = { easy: 3, normal: 3, hard: 2 };
const SECOND_MILESTONE_POINTS = { easy: 3, normal: 2, hard: 2 };
const NO_POINTS = { easy: 0, normal: 0, hard: 0 };

export const storyConfig = {
  start: 'trial',
  startPoints: 3,
  startAttributes: { health: 3, stamina: 3, blade: 3, defense: 3, agility: 3, flow: 3 },
  ratingCap: 7,
  budgets: { easy: 42, normal: 36, hard: 30 },
  slotOrder: ['neutral', 'forward', 'back'],
  difficulties: ['easy', 'normal', 'hard'],
  rules: { powers: true, exhaustion: true, wounds: true, focusEvade: true, bladeLock: true },
  roundsToWin: 1,
  protagonist: {
    names: ['Kael', 'Iria', 'Tarin', 'Vessa', 'Oren', 'Lyse'],
    maxNameLength: 16,
    skins: [
      { id: 'base', appearance: {}, unlock: null },
      { id: 'watcher', appearance: { cloakColor: '#454d58', bodyColor: '#222730', trimColor: '#83909e', longCape: false, hoodUp: true, masked: true, scarf: false }, unlock: null },
      { id: 'pilgrim', appearance: { cloakColor: '#51483c', bodyColor: '#28231e', trimColor: '#a0957e', longCape: true, hoodUp: false, masked: false, pauldrons: true, scarf: false }, unlock: null },
    ],
    alignments: ['light', 'dark'],
    startPowers: { light: 'push', dark: 'lightning' },
    styles: {
      technique: { base: 'guardian' },
      fury: { base: 'shadow' },
      flight: { base: 'heron' },
    },
    saberColors: ['#7fe4ff', '#9dff3f', '#ffd23f', '#e8eeff', '#a46bff', '#ff7a2a', '#5fffc0', '#ffa6e0', '#ff3f9e', '#ff4038'],
    appearance: {
      cloakColor: '#3e4a5e',
      bodyColor: '#1d222b',
      trimColor: '#7f90aa',
      hoodUp: false,
      longCape: true,
      masked: false,
      scarf: true,
    },
  },
  encounters: [
    { id: 'trial', opponent: 'guardian', arena: 'refinery', aiOffset: -1, next: 'forest', reward: { points: VICTORY_POINTS } },
    { id: 'forest', opponent: 'echo', arena: 'forest', aiOffset: -1, next: 'rooftop', reward: { points: VICTORY_POINTS, powers: { light: 'barrier', dark: 'pull' } } },
    { id: 'rooftop', opponent: 'wasp', arena: 'rooftop', aiOffset: 0, next: 'mine', reward: { points: FIRST_MILESTONE_POINTS, slot: 'forward', powers: { light: 'throw', dark: 'choke' } } },
    {
      id: 'mine', opponent: 'ember', arena: 'crystalMine', aiOffset: 0, reward: { points: VICTORY_POINTS, powers: { light: 'heal', dark: 'freeze' } },
      outcomes: [
        { condition: { type: 'alignmentIs', alignment: 'light' }, next: 'sanctuary' },
        { condition: { type: 'always' }, next: 'reaperTrial' },
      ],
    },
    { id: 'sanctuary', opponent: 'bastion', arena: 'sanctuary', aiOffset: 0, next: 'shadowDuel', reward: { points: VICTORY_POINTS, powers: { light: 'absorb' } } },
    { id: 'shadowDuel', opponent: 'shadow', arena: 'refinery', aiOffset: 0, next: 'awakened', reward: { points: SECOND_MILESTONE_POINTS, slot: 'back', powers: { light: 'focus' } } },
    { id: 'awakened', opponent: 'shadowAwakened', arena: 'crystalMine', aiOffset: 0, next: 'sovereign', reward: { points: VICTORY_POINTS, powers: { light: 'pull' } } },
    {
      id: 'sovereign', opponent: 'sovereign', arena: 'orbital', aiOffset: 0, unlocks: ['sovereign'], reward: { points: NO_POINTS },
      outcomes: [
        { condition: { type: 'healthRatioAbove', threshold: 0.75 }, next: 'foretoldEclipse' },
        { condition: { type: 'always' }, ending: 'auroraNormal' },
      ],
    },
    { id: 'foretoldEclipse', opponent: 'foretold', opponentVariant: 'eclipse', arena: 'sanctuary', difficulty: 'boss', secret: true, reward: { points: NO_POINTS }, ending: 'auroraSecret' },
    { id: 'reaperTrial', opponent: 'reaper', arena: 'orbital', aiOffset: 0, next: 'mirrorTemple', reward: { points: VICTORY_POINTS, powers: { dark: 'wrath' } } },
    { id: 'mirrorTemple', opponent: 'mirror', arena: 'sanctuary', aiOffset: 0, next: 'heronRooftop', reward: { points: SECOND_MILESTONE_POINTS, slot: 'back', powers: { dark: 'drain' } } },
    { id: 'heronRooftop', opponent: 'heron', arena: 'rooftop', aiOffset: 0, next: 'elder', reward: { points: VICTORY_POINTS, powers: { dark: 'push' } } },
    {
      id: 'elder', opponent: 'elder', arena: 'forest', aiOffset: 0, unlocks: ['elder'], reward: { points: NO_POINTS },
      outcomes: [
        { condition: { type: 'healthRatioAbove', threshold: 0.75 }, next: 'foretoldAurora' },
        { condition: { type: 'always' }, ending: 'eclipseNormal' },
      ],
    },
    { id: 'foretoldAurora', opponent: 'foretold', opponentVariant: 'aurora', arena: 'sanctuary', difficulty: 'boss', secret: true, reward: { points: NO_POINTS }, ending: 'eclipseSecret' },
  ],
  endings: {
    auroraNormal: { unlocks: ['elder'] },
    auroraSecret: { unlocks: ['elder'], secret: true },
    eclipseNormal: { unlocks: ['sovereign'] },
    eclipseSecret: { unlocks: ['sovereign'], secret: true },
  },
};

applyNames(storyConfig.protagonist.skins, ptBR.protagonistSkins);

import { movesByCharacter } from '../config/movesConfig.js';

export const characters = {
  guardian: {
    id: 'guardian',
    name: 'Guardião',
    archetype: 'guardian',
    moves: movesByCharacter.guardian,
    aiProfile: 'balanced',
    sound: {
      humFrequency: 74,
    },
    appearance: {
      cloakColor: '#6b5a48',
      bodyColor: '#2e2925',
      saberColor: '#7fe4ff',
      hoodUp: false,
      longCape: false,
      torsoLeanDegrees: 3,
      guardAngleDegrees: -60,
      bladeLength: 92,
    },
  },
  shadow: {
    id: 'shadow',
    name: 'Sombra',
    archetype: 'shadow',
    moves: movesByCharacter.shadow,
    aiProfile: 'aggressive',
    sound: {
      humFrequency: 62,
    },
    appearance: {
      cloakColor: '#1f2029',
      bodyColor: '#121319',
      saberColor: '#ff3f9e',
      hoodUp: true,
      longCape: true,
      torsoLeanDegrees: 10,
      guardAngleDegrees: 25,
      bladeLength: 92,
    },
  },
};

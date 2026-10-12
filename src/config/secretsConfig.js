import { Action } from './controlsConfig.js';

const WARDROBE_PAD = [Action.MENU_DOWN, Action.MENU_DOWN, Action.MENU_UP, Action.MENU_UP, Action.MOVE_RIGHT, Action.MOVE_LEFT, Action.MOVE_RIGHT, Action.MOVE_LEFT];
const TAGLINE_TAPS = 5;
const PAD_STEPS = [Action.MOVE_LEFT, Action.MOVE_LEFT, Action.MOVE_RIGHT, Action.MOVE_RIGHT, Action.MENU_UP, Action.MENU_DOWN, Action.MENU_UP, Action.MENU_DOWN];

export const SecretToken = Object.freeze({
  key: (code) => `key:${code}`,
  action: (action) => `action:${action}`,
  tap: (area) => `tap:${area}`,
});

export const secretsConfig = {
  timeout: 2.5,
  watchedActions: [Action.MOVE_LEFT, Action.MOVE_RIGHT, Action.MENU_UP, Action.MENU_DOWN],
  sequences: [
    { id: 'balancePad', reward: 'balance', tokens: PAD_STEPS.map(SecretToken.action) },
    { id: 'wardrobePad', reward: 'wardrobe', tokens: WARDROBE_PAD.map(SecretToken.action) },
    { id: 'wardrobeTouch', reward: 'wardrobe', tokens: Array.from({ length: TAGLINE_TAPS }, () => SecretToken.tap('tagline')) },
  ],
  rewards: {
    balance: { unlocks: ['elder', 'sovereign', 'foretold'], message: 'balance', sound: 'secret' },
    wardrobe: { allSkins: true, message: 'wardrobe', sound: 'secretWardrobe' },
  },
};

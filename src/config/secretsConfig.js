import { Action } from './controlsConfig.js';

const KEY_PHRASE = 'EQUILIBRIO';
const PAD_STEPS = [Action.MOVE_LEFT, Action.MOVE_LEFT, Action.MOVE_RIGHT, Action.MOVE_RIGHT, Action.MENU_UP, Action.MENU_DOWN, Action.MENU_UP, Action.MENU_DOWN];
const TITLE_TAPS = 7;

export const SecretToken = Object.freeze({
  key: (code) => `key:${code}`,
  action: (action) => `action:${action}`,
  tap: (area) => `tap:${area}`,
});

export const secretsConfig = {
  timeout: 2.5,
  watchedActions: [Action.MOVE_LEFT, Action.MOVE_RIGHT, Action.MENU_UP, Action.MENU_DOWN],
  sequences: [
    { id: 'balanceKeys', reward: 'balance', tokens: [...KEY_PHRASE].map((letter) => SecretToken.key(`Key${letter}`)) },
    { id: 'balancePad', reward: 'balance', tokens: PAD_STEPS.map(SecretToken.action) },
    { id: 'balanceTouch', reward: 'balance', tokens: Array.from({ length: TITLE_TAPS }, () => SecretToken.tap('title')) },
  ],
  rewards: {
    balance: { unlocks: ['sovereign', 'foretold'] },
  },
};

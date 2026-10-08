import { Action } from '../config/controlsConfig.js';

const PRESS_ACTIONS = [
  { action: Action.JUMP, intentKey: 'jump' },
  { action: Action.LIGHT_ATTACK, intentKey: 'lightAttack' },
  { action: Action.HEAVY_ATTACK, intentKey: 'heavyAttack' },
  { action: Action.DODGE, intentKey: 'dodge' },
  { action: Action.EVADE, intentKey: 'evade' },
  { action: Action.BLOCK, intentKey: 'blockPressed' },
  { action: Action.SPECIAL, intentKey: 'special' },
];

export class PlayerController {
  constructor(input) {
    this.input = input;
    this.latched = {};
    for (const { intentKey } of PRESS_ACTIONS) {
      this.latched[intentKey] = false;
    }
  }

  captureInput() {
    for (const { action, intentKey } of PRESS_ACTIONS) {
      if (this.input.wasPressed(action)) {
        this.latched[intentKey] = true;
      }
    }
  }

  clearCapturedInput() {
    for (const { intentKey } of PRESS_ACTIONS) {
      this.latched[intentKey] = false;
    }
  }

  updateIntent(intent) {
    const { input, latched } = this;
    const right = input.isDown(Action.MOVE_RIGHT) ? 1 : 0;
    const left = input.isDown(Action.MOVE_LEFT) ? 1 : 0;

    this.captureInput();
    intent.moveX = right - left;
    intent.block = input.isDown(Action.BLOCK);
    intent.specialHeld = input.isDown(Action.SPECIAL);
    for (const { intentKey } of PRESS_ACTIONS) {
      intent[intentKey] = latched[intentKey];
      latched[intentKey] = false;
    }
  }
}

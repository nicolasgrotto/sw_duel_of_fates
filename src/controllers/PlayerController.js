import { Action } from '../config/controlsConfig.js';

export class PlayerController {
  constructor(input) {
    this.input = input;
  }

  updateIntent(intent) {
    const { input } = this;
    const right = input.isDown(Action.MOVE_RIGHT) ? 1 : 0;
    const left = input.isDown(Action.MOVE_LEFT) ? 1 : 0;

    intent.moveX = right - left;
    intent.jump = input.wasPressed(Action.JUMP);
    intent.lightAttack = input.wasPressed(Action.LIGHT_ATTACK);
    intent.heavyAttack = input.wasPressed(Action.HEAVY_ATTACK);
    intent.block = input.isDown(Action.BLOCK);
    intent.dodge = input.wasPressed(Action.DODGE);
  }
}

import { Action } from '../config/controlsConfig.js';
import { combatRulesConfig } from '../config/combatRulesConfig.js';
import { FighterState } from '../entities/fighterStates.js';

const PRESS_ACTIONS = [
  { action: Action.JUMP, intentKey: 'jump' },
  { action: Action.LIGHT_ATTACK, intentKey: 'lightAttack' },
  { action: Action.HEAVY_ATTACK, intentKey: 'heavyAttack' },
  { action: Action.DODGE, intentKey: 'dodge' },
  { action: Action.EVADE, intentKey: 'evade' },
  { action: Action.BLOCK, intentKey: 'blockPressed' },
  { action: Action.SPECIAL, intentKey: 'special' },
  { action: Action.POWER, intentKey: 'power' },
];

export class PlayerController {
  constructor(input, { fighter = null, settings = {}, playerIndex = 0 } = {}) {
    this.input = input;
    this.fighter = fighter;
    this.settings = settings;
    this.playerIndex = playerIndex;
    this.latched = {};
    for (const { intentKey } of PRESS_ACTIONS) {
      this.latched[intentKey] = false;
    }
  }

  captureInput() {
    if (this.input.focused === false) {
      this.clearCapturedInput();
      return;
    }
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

  updateIntent(intent, dt = 0) {
    const { input, latched } = this;
    const right = input.isDown(Action.MOVE_RIGHT) ? 1 : 0;
    const left = input.isDown(Action.MOVE_LEFT) ? 1 : 0;

    this.captureInput();
    intent.moveX = right - left;
    intent.block = input.isDown(Action.BLOCK);
    intent.specialHeld = input.isDown(Action.SPECIAL);
    intent.powerHeld = input.isDown(Action.POWER);
    for (const { intentKey } of PRESS_ACTIONS) {
      intent[intentKey] = latched[intentKey];
      latched[intentKey] = false;
    }
    this.updateBladeLockHold(intent, dt);
  }

  updateBladeLockHold(intent, dt) {
    if (this.fighter?.state !== FighterState.BLADE_LOCK || this.settings.bladeLockHold?.[this.playerIndex] !== true) return;
    const { combat } = this.fighter;
    const interval = 1 / combatRulesConfig.bladeLock.holdRate;
    const requested = intent.lightAttack || this.input.isDown(Action.LIGHT_ATTACK);
    intent.lightAttack = requested && !combat.lockPressHeld && (combat.lockPresses === 0
      || combat.lockTime + dt - combat.lockLastPress + Number.EPSILON * Math.max(1, combat.lockTime) >= interval);
  }
}

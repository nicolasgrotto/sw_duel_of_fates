import { Action, controlsConfig } from '../config/controlsConfig.js';
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
  { action: Action.FOURTH_POWER, intentKey: 'fourthPower' },
];

export class PlayerController {
  constructor(input, { fighter = null, settings = {}, playerIndex = 0, powersEnabled = settings.powers !== false } = {}) {
    this.input = input;
    this.fighter = fighter;
    this.settings = settings;
    this.playerIndex = playerIndex;
    this.powersEnabled = powersEnabled;
    this.pendingAction = null;
    this.pendingTime = 0;
    this.pendingDirection = 0;
    this.chordHeld = false;
    this.inputGeneration = input.resetGeneration;
    this.pressDirections = { power: 0, special: 0 };
    this.latched = {};
    for (const { intentKey } of PRESS_ACTIONS) {
      this.latched[intentKey] = false;
    }
  }

  captureInput() {
    if (this.inputGeneration !== this.input.resetGeneration) {
      this.clearCapturedInput();
      this.inputGeneration = this.input.resetGeneration;
    }
    if (this.input.focused === false) {
      this.clearCapturedInput();
      return;
    }
    for (const { action, intentKey } of PRESS_ACTIONS) {
      if (this.input.wasPressed(action)) {
        if (!this.latched[intentKey] && (intentKey === 'power' || intentKey === 'special')) {
          this.pressDirections[intentKey] = (this.input.isDown(Action.MOVE_RIGHT) ? 1 : 0) - (this.input.isDown(Action.MOVE_LEFT) ? 1 : 0);
        }
        this.latched[intentKey] = true;
      }
    }
  }

  clearCapturedInput() {
    this.pendingAction = null;
    this.pendingTime = 0;
    this.chordHeld = false;
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
    intent.resolvedAction = null;
    intent.actionMoveX = null;
    intent.fourthPowerHeld = input.isDown(Action.FOURTH_POWER);
    this.updateFourthPower(intent, dt);
    this.updateBladeLockHold(intent, dt);
  }

  updateFourthPower(intent, dt) {
    if (!this.powersEnabled || !this.fighter?.stats.power?.loadout?.fourth) {
      this.pendingAction = null;
      this.chordHeld = false;
      intent.fourthPower = false;
      intent.fourthPowerHeld = false;
      return;
    }
    if (intent.fourthPower) {
      this.pendingAction = null;
      this.pendingTime = 0;
      intent.power = false;
      intent.special = false;
      intent.powerHeld = false;
      intent.specialHeld = false;
      return;
    }
    const power = intent.power;
    const special = intent.special;
    const holding = intent.powerHeld || intent.specialHeld;
    if (this.chordHeld && !holding) this.chordHeld = false;
    if (this.chordHeld) {
      intent.power = false;
      intent.special = false;
      intent.powerHeld = false;
      intent.specialHeld = false;
      intent.fourthPowerHeld = true;
      return;
    }
    const interrupted = intent.jump || intent.lightAttack || intent.heavyAttack || intent.blockPressed || intent.dodge || intent.evade;
    const window = controlsConfig.fourthPower.chordWindow;
    const epsilon = Number.EPSILON * Math.max(1, window);
    if (this.pendingAction) {
      this.pendingTime += dt;
      const second = this.pendingAction === 'power' ? special : power;
      if (!interrupted && second && this.pendingTime <= window + epsilon) {
        this.emitChord(intent, holding);
        return;
      }
      if (interrupted || this.pendingTime + epsilon >= window) {
        this.emitPending(intent);
        return;
      }
      intent.power = false;
      intent.special = false;
      intent.powerHeld = false;
      intent.specialHeld = false;
      return;
    }
    if (power && special && !interrupted) {
      this.emitChord(intent, holding);
    } else if ((power || special) && !interrupted && !intent.fourthPower) {
      this.pendingAction = power ? 'power' : 'special';
      this.pendingDirection = this.pressDirections[this.pendingAction];
      this.pendingTime = 0;
      intent.power = false;
      intent.special = false;
      intent.powerHeld = false;
      intent.specialHeld = false;
    }
  }

  emitPending(intent) {
    intent.resolvedAction = this.pendingAction;
    intent.actionMoveX = this.pendingDirection;
    intent[this.pendingAction] = true;
    this.pendingAction = null;
    this.pendingTime = 0;
  }

  emitChord(intent, holding) {
    this.pendingAction = null;
    this.pendingTime = 0;
    this.chordHeld = holding;
    intent.power = false;
    intent.special = false;
    intent.powerHeld = false;
    intent.specialHeld = false;
    intent.fourthPower = true;
    intent.fourthPowerHeld ||= holding;
  }

  getDebugInfo() {
    return `chord ${this.pendingAction ?? '-'} ${(this.pendingAction ? Math.max(0, controlsConfig.fourthPower.chordWindow - this.pendingTime) : 0).toFixed(3)}`;
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

import { gamepadConfig } from '../config/controlsConfig.js';

function mapActionsByCode(bindings) {
  const actionsByCode = new Map();

  for (const [action, codes] of Object.entries(bindings)) {
    for (const code of codes) {
      if (!actionsByCode.has(code)) {
        actionsByCode.set(code, []);
      }
      actionsByCode.get(code).push(action);
    }
  }

  return actionsByCode;
}

export class Input {
  constructor({ bindings, target, getGamepads = () => [] }) {
    this.target = target;
    this.getGamepads = getGamepads;
    this.padButtons = Object.entries(gamepadConfig.buttons);
    this.padActions = new Set();
    this.nextPadActions = new Set();
    this.gamepad = null;
    this.focused = true;
    this.bindings = bindings;
    this.codesByAction = new Map(Object.entries(bindings));
    this.actionsByCode = mapActionsByCode(bindings);
    this.downCodes = new Set();
    this.pressedActions = new Set();

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleBlur = this.handleBlur.bind(this);
    this.handleFocus = this.handleFocus.bind(this);

    target.addEventListener('keydown', this.handleKeyDown);
    target.addEventListener('keyup', this.handleKeyUp);
    target.addEventListener('blur', this.handleBlur);
    target.addEventListener('focus', this.handleFocus);
  }

  setBindings(bindings) {
    if (this.bindings === bindings) {
      return;
    }
    this.bindings = bindings;
    this.codesByAction = new Map(Object.entries(bindings));
    this.actionsByCode = mapActionsByCode(bindings);
    this.downCodes.clear();
    this.pressedActions.clear();
  }

  handleKeyDown(event) {
    const actions = this.actionsByCode.get(event.code);
    if (!actions) {
      return;
    }

    event.preventDefault();

    if (event.repeat || this.downCodes.has(event.code)) {
      return;
    }

    this.downCodes.add(event.code);
    for (const action of actions) {
      this.pressedActions.add(action);
    }
  }

  handleKeyUp(event) {
    if (!this.actionsByCode.has(event.code)) {
      return;
    }

    event.preventDefault();
    this.downCodes.delete(event.code);
  }

  handleFocus() {
    this.focused = true;
  }

  handleBlur() {
    this.focused = false;
    this.padActions.clear();
    this.nextPadActions.clear();
    this.gamepad = null;
    this.downCodes.clear();
    this.pressedActions.clear();
  }

  isDown(action) {
    if (this.padActions.has(action)) {
      return true;
    }
    const codes = this.codesByAction.get(action);
    if (!codes) {
      return false;
    }

    for (const code of codes) {
      if (this.downCodes.has(code)) {
        return true;
      }
    }
    return false;
  }

  pollGamepads() {
    if (!this.focused) {
      return;
    }
    this.nextPadActions.clear();
    this.gamepad = null;
    for (const pad of this.getGamepads() ?? []) {
      if (pad?.connected && pad.mapping === 'standard') {
        this.gamepad = pad;
        break;
      }
    }
    if (this.gamepad) {
      const { axes, deadzone } = gamepadConfig;
      for (const [index, actions] of this.padButtons) {
        if (this.gamepad.buttons[index]?.pressed) {
          for (const action of actions) {
            this.nextPadActions.add(action);
          }
        }
      }
      for (const axis of axes) {
        const value = this.gamepad.axes[axis.index] ?? 0;
        if (value < -deadzone) {
          this.nextPadActions.add(axis.negative);
        } else if (value > deadzone) {
          this.nextPadActions.add(axis.positive);
        }
      }
    }
    for (const action of this.nextPadActions) {
      if (!this.padActions.has(action)) {
        this.pressedActions.add(action);
      }
    }
    const previous = this.padActions;
    this.padActions = this.nextPadActions;
    this.nextPadActions = previous;
  }

  rumble(type, reduced = false) {
    const recipe = gamepadConfig.rumble[type];
    const actuator = this.gamepad?.vibrationActuator;
    if (!recipe || !actuator?.playEffect) {
      return;
    }
    const scale = reduced ? gamepadConfig.reducedRumbleScale : 1;
    try {
      const effect = actuator.playEffect('dual-rumble', {
        duration: recipe.duration,
        startDelay: 0,
        strongMagnitude: recipe.strongMagnitude * scale,
        weakMagnitude: recipe.weakMagnitude * scale,
      });
      effect?.catch?.(() => {});
    } catch {
      return;
    }
  }

  wasPressed(action) {
    return this.pressedActions.has(action);
  }

  endFrame() {
    this.pressedActions.clear();
  }

  destroy() {
    this.target.removeEventListener('keydown', this.handleKeyDown);
    this.target.removeEventListener('keyup', this.handleKeyUp);
    this.target.removeEventListener('blur', this.handleBlur);
    this.target.removeEventListener('focus', this.handleFocus);
    this.handleBlur();
  }
}

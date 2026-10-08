import { gamepadConfig } from '../config/controlsConfig.js';

export class GamepadSource {
  constructor({ getGamepads, gamepadSlot }) {
    this.getGamepads = getGamepads;
    this.gamepadSlot = gamepadSlot;
    this.padButtons = Object.entries(gamepadConfig.buttons);
    this.actions = new Set();
    this.previousActions = new Set();
    this.activity = false;
    this.gamepad = null;
  }

  poll() {
    this.previousActions.clear();
    for (const action of this.actions) this.previousActions.add(action);
    this.actions.clear();
    this.activity = false;
    this.gamepad = null;
    let slot = 0;
    for (const pad of this.getGamepads() ?? []) {
      if (!pad?.connected || pad.mapping !== 'standard') {
        continue;
      }
      if (slot === this.gamepadSlot) {
        this.gamepad = pad;
        break;
      }
      slot += 1;
    }
    if (this.gamepad) {
      const { axes, deadzone } = gamepadConfig;
      for (const [index, actions] of this.padButtons) {
        if (this.gamepad.buttons[index]?.pressed) {
          for (const action of actions) {
            this.actions.add(action);
          }
        }
      }
      for (const axis of axes) {
        const value = this.gamepad.axes[axis.index] ?? 0;
        if (value < -deadzone) {
          this.addAxisActions(axis.negative);
        } else if (value > deadzone) {
          this.addAxisActions(axis.positive);
        }
      }
    }
    for (const action of this.actions) if (!this.previousActions.has(action)) this.activity = true;
  }

  addAxisActions(actions) {
    if (Array.isArray(actions)) {
      for (const action of actions) this.actions.add(action);
    } else {
      this.actions.add(actions);
    }
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

  reset() {
    this.actions.clear();
    this.gamepad = null;
  }

  destroy() {
    this.reset();
  }
}

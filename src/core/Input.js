import { KeyboardSource } from './KeyboardSource.js';
import { GamepadSource } from './GamepadSource.js';

export class Input {
  constructor({ bindings, target, getGamepads = () => [], gamepadSlot = 0 }) {
    this.target = target;
    this.focused = true;
    this.lastInputKind = 'keyboard';
    this.pressedActions = new Set();
    this.polledActions = new Set();
    this.nextActions = new Set();
    this.keyboard = new KeyboardSource({ bindings, target, onActivity: () => { this.lastInputKind = 'keyboard'; }, onPress: (action) => {
      const heldElsewhere = this.sources.some((source) => source !== this.keyboard && source.actions.has(action));
      if (this.focused && !heldElsewhere) this.pressedActions.add(action);
    } });
    this.pad = new GamepadSource({ getGamepads, gamepadSlot });
    this.sources = [this.keyboard, this.pad];
    this.handleBlur = this.handleBlur.bind(this);
    this.handleFocus = this.handleFocus.bind(this);
    target.addEventListener('blur', this.handleBlur);
    target.addEventListener('focus', this.handleFocus);
  }

  get bindings() { return this.keyboard.bindings; }
  get lastPressedCode() { return this.keyboard.lastPressedCode; }
  get gamepadSlot() { return this.pad.gamepadSlot; }
  set gamepadSlot(value) { this.pad.gamepadSlot = value; }

  addSource(source) {
    if (this.sources.includes(source)) return;
    source.onActivity = () => { this.lastInputKind = source.kind ?? this.lastInputKind; };
    source.onPress = (action) => {
      if (this.focused && !this.sources.some((other) => other !== source && other.actions.has(action))) this.pressedActions.add(action);
    };
    this.sources.push(source);
  }

  get touchTaps() { return this.sources.find((source) => source.kind === 'touch')?.taps ?? []; }

  setBindings(bindings) {
    if (this.bindings === bindings) return;
    this.keyboard.setBindings(bindings);
    this.pressedActions.clear();
    this.polledActions.clear();
    for (const source of this.sources) {
      for (const action of source.actions) this.polledActions.add(action);
    }
  }

  handleFocus() { this.focused = true; }

  handleBlur() {
    this.focused = false;
    for (const source of this.sources) source.reset?.();
    this.polledActions.clear();
    this.nextActions.clear();
    this.pressedActions.clear();
  }

  isDown(action) {
    return this.focused && this.sources.some((source) => source.actions.has(action));
  }

  pollGamepads() {
    this.poll();
  }

  poll() {
    if (!this.focused) return;
    this.nextActions.clear();
    for (const source of this.sources) {
      source.poll?.();
      if (source === this.pad && source.activity) this.lastInputKind = 'gamepad';
      for (const action of source.actions) this.nextActions.add(action);
    }
    for (const action of this.nextActions) {
      if (!this.polledActions.has(action)) this.pressedActions.add(action);
    }
    const previous = this.polledActions;
    this.polledActions = this.nextActions;
    this.nextActions = previous;
  }

  rumble(type, reduced = false) { this.pad.rumble(type, reduced); }
  wasPressed(action) { return this.pressedActions.has(action); }

  endFrame() {
    this.pressedActions.clear();
    for (const source of this.sources) source.endFrame?.();
    this.polledActions.clear();
    for (const source of this.sources) {
      for (const action of source.actions) this.polledActions.add(action);
    }
  }

  destroy() {
    this.target.removeEventListener('blur', this.handleBlur);
    this.target.removeEventListener('focus', this.handleFocus);
    this.handleBlur();
    for (const source of this.sources) source.destroy?.();
  }
}

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

export class KeyboardSource {
  constructor({ bindings, target, onPress, onActivity }) {
    this.target = target;
    this.onPress = onPress;
    this.onActivity = onActivity;
    this.actions = new Set();
    this.downCodes = new Set();
    this.lastPressedCode = null;
    this.setBindings(bindings);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    target.addEventListener('keydown', this.handleKeyDown);
    target.addEventListener('keyup', this.handleKeyUp);
  }

  setBindings(bindings) {
    this.bindings = bindings;
    this.actionsByCode = mapActionsByCode(bindings);
    this.reset();
  }

  handleKeyDown(event) {
    if (!event.repeat) {
      this.lastPressedCode = event.code;
      this.onActivity?.();
    }
    const actions = this.actionsByCode.get(event.code);
    if (!actions) return;
    event.preventDefault();
    if (event.repeat || this.downCodes.has(event.code)) return;
    this.downCodes.add(event.code);
    for (const action of actions) {
      this.actions.add(action);
      this.onPress(action);
    }
  }

  handleKeyUp(event) {
    if (!this.actionsByCode.has(event.code)) return;
    event.preventDefault();
    this.downCodes.delete(event.code);
    this.actions.clear();
    for (const code of this.downCodes) {
      for (const action of this.actionsByCode.get(code)) this.actions.add(action);
    }
  }

  reset() {
    this.downCodes.clear();
    this.actions.clear();
    this.lastPressedCode = null;
  }

  endFrame() {
    this.lastPressedCode = null;
  }

  destroy() {
    this.target.removeEventListener('keydown', this.handleKeyDown);
    this.target.removeEventListener('keyup', this.handleKeyUp);
    this.reset();
  }
}

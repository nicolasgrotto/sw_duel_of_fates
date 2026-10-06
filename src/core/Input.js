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
  constructor({ bindings, target }) {
    this.target = target;
    this.codesByAction = new Map(Object.entries(bindings));
    this.actionsByCode = mapActionsByCode(bindings);
    this.downCodes = new Set();
    this.pressedActions = new Set();

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.handleBlur = this.handleBlur.bind(this);

    target.addEventListener('keydown', this.handleKeyDown);
    target.addEventListener('keyup', this.handleKeyUp);
    target.addEventListener('blur', this.handleBlur);
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

  handleBlur() {
    this.downCodes.clear();
    this.pressedActions.clear();
  }

  isDown(action) {
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
    this.handleBlur();
  }
}

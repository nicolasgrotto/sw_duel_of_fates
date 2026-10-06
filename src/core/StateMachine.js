export class StateMachine {
  constructor() {
    this.stack = [];
  }

  get current() {
    return this.stack.at(-1) ?? null;
  }

  change(state) {
    while (this.stack.length > 0) {
      this.stack.pop().exit();
    }
    this.push(state);
  }

  push(state) {
    this.stack.push(state);
    state.enter();
  }

  pop() {
    const state = this.stack.pop() ?? null;
    state?.exit();
    return state;
  }

  update(dt) {
    this.current?.update(dt);
  }

  render(renderer) {
    for (const state of this.stack) {
      state.render(renderer);
    }
  }
}

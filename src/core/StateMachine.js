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
    this.current?.resume();
    return state;
  }

  update(dt) {
    this.current?.update(dt);
  }

  render(renderer) {
    let first = this.stack.length - 1;
    while (first > 0 && !this.stack[first].coversScreen) first -= 1;
    for (let index = Math.max(0, first); index < this.stack.length; index += 1) {
      this.stack[index].render(renderer);
    }
  }
}

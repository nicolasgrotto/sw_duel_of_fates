const NO_DEBUG_INFO = Object.freeze([]);

export class GameState {
  constructor(game) {
    this.game = game;
  }

  get name() {
    return this.constructor.name;
  }

  enter() {}

  exit() {}

  update() {}

  render() {}

  getDebugInfo() {
    return NO_DEBUG_INFO;
  }
}

const NO_DEBUG_INFO = Object.freeze([]);

export class GameState {
  constructor(game, params = {}) {
    this.game = game;
    this.params = params;
  }

  get name() {
    return this.constructor.name;
  }

  get allowsUpdate() {
    return true;
  }

  enter() {}

  exit() {}

  resume() {}

  update() {}

  render() {}

  renderDebug() {}

  getDebugInfo() {
    return NO_DEBUG_INFO;
  }
}

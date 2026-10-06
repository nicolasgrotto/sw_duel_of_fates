import { Action } from '../config/controlsConfig.js';
import { gameConfig } from '../config/gameConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { GameState } from './GameState.js';
import { StateId } from './stateIds.js';

export class DuelState extends GameState {
  enter() {
    this.duelTime = 0;
  }

  update(dt) {
    if (this.game.input.wasPressed(Action.PAUSE)) {
      this.game.pushState(StateId.PAUSE);
      return;
    }

    this.duelTime += dt;
  }

  render(renderer) {
    this.renderArena(renderer);
    renderer.text('Esc  pausar', renderer.width / 2, renderer.height - 40, textStyles.hint);
  }

  renderArena(renderer) {
    const { floorY, wallPadding } = gameConfig.arena;
    const rightWallX = renderer.width - wallPadding;

    renderer.fillRect(0, floorY, renderer.width, renderer.height - floorY, colors.floor);
    renderer.line(0, floorY, renderer.width, floorY, colors.floorEdge, 2);
    renderer.line(wallPadding, 0, wallPadding, floorY, colors.wall, 2);
    renderer.line(rightWallX, 0, rightWallX, floorY, colors.wall, 2);
  }

  getDebugInfo() {
    return [`duel time: ${this.duelTime.toFixed(2)}s`];
  }
}

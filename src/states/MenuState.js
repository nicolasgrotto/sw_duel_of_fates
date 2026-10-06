import { Action } from '../config/controlsConfig.js';
import { gameConfig } from '../config/gameConfig.js';
import { animation, textStyles } from '../config/themeConfig.js';
import { GameState } from './GameState.js';
import { StateId } from './stateIds.js';

export class MenuState extends GameState {
  enter() {
    this.elapsedTime = 0;
  }

  update(dt) {
    this.elapsedTime += dt;

    if (this.game.input.wasPressed(Action.CONFIRM)) {
      this.game.changeState(StateId.DUEL);
    }
  }

  render(renderer) {
    const centerX = renderer.width / 2;
    const centerY = renderer.height / 2;

    renderer.text(gameConfig.title.toUpperCase(), centerX, centerY - 60, textStyles.title);

    if (this.isPromptVisible()) {
      renderer.text('Pressione ENTER para duelar', centerX, centerY + 60, textStyles.subtitle);
    }

    renderer.text('A / D mover   ·   J ataque   ·   K ataque forte   ·   L bloquear', centerX, renderer.height - 60, textStyles.hint);
  }

  isPromptVisible() {
    const period = animation.promptBlinkPeriod;
    return this.elapsedTime % period < period * animation.promptVisibleRatio;
  }
}

import { Action } from '../config/controlsConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { GameState } from './GameState.js';
import { StateId } from './stateIds.js';

export class PauseState extends GameState {
  update() {
    const { input } = this.game;

    if (input.wasPressed(Action.PAUSE)) {
      this.game.popState();
    } else if (input.wasPressed(Action.QUIT)) {
      this.game.changeState(StateId.MENU);
    }
  }

  render(renderer) {
    const centerX = renderer.width / 2;
    const centerY = renderer.height / 2;

    renderer.overlay(colors.overlay);
    renderer.text('PAUSADO', centerX, centerY - 30, textStyles.heading);
    renderer.text('Esc  continuar   ·   Q  sair para o menu', centerX, centerY + 40, textStyles.hint);
  }
}

import { Action } from '../config/controlsConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { layout, texts } from '../config/uiConfig.js';
import { MenuList } from '../ui/MenuList.js';
import { GameState } from './GameState.js';
import { StateId } from './stateIds.js';

export const PauseOption = Object.freeze({
  RESUME: 'resume',
  RESTART: 'restart',
  QUIT: 'quit',
});

export class PauseState extends GameState {
  enter() {
    this.menu = new MenuList(
      [
        { id: PauseOption.RESUME, label: texts.pause.resume },
        { id: PauseOption.RESTART, label: texts.pause.restart },
        { id: PauseOption.QUIT, label: texts.pause.quit },
      ],
      layout.pause,
    );
  }

  update() {
    const { input } = this.game;

    if (input.wasPressed(Action.PAUSE) || input.wasPressed(Action.BACK)) {
      this.game.popState();
      return;
    }

    switch (this.menu.update(input)) {
      case PauseOption.RESUME:
        this.game.popState();
        break;
      case PauseOption.RESTART:
        this.game.changeState(StateId.DUEL);
        break;
      case PauseOption.QUIT:
        this.game.changeState(StateId.MENU);
        break;
      default:
        break;
    }
  }

  render(renderer) {
    const centerX = renderer.width / 2;

    renderer.overlay(colors.overlay);
    renderer.text(texts.pause.title, centerX, layout.pause.titleY, textStyles.heading);
    this.menu.render(renderer, centerX);
  }
}

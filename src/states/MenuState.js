import { Action, keyBindings } from '../config/controlsConfig.js';
import { gameConfig } from '../config/gameConfig.js';
import { textStyles } from '../config/themeConfig.js';
import { layout, texts } from '../config/uiConfig.js';
import { formatText } from '../ui/formatText.js';
import { formatActionKeys } from '../ui/keyLabels.js';
import { MenuList } from '../ui/MenuList.js';
import { GameState } from './GameState.js';
import { StateId } from './stateIds.js';

export const MenuOption = Object.freeze({
  DUEL: 'duel',
  CONTROLS: 'controls',
});

export class MenuState extends GameState {
  enter() {
    this.menu = new MenuList(
      [
        { id: MenuOption.DUEL, label: texts.menu.duel },
        { id: MenuOption.CONTROLS, label: texts.menu.controls },
      ],
      layout.menu,
    );
    this.footer = formatText(texts.menu.navigation, {
      up: formatActionKeys(keyBindings, Action.MENU_UP),
      down: formatActionKeys(keyBindings, Action.MENU_DOWN),
      confirm: formatActionKeys(keyBindings, Action.CONFIRM),
    });
  }

  update() {
    const choice = this.menu.update(this.game.input);

    if (choice === MenuOption.DUEL) {
      this.game.changeState(StateId.DUEL);
    } else if (choice === MenuOption.CONTROLS) {
      this.game.pushState(StateId.CONTROLS);
    }
  }

  render(renderer) {
    const centerX = renderer.width / 2;

    renderer.text(gameConfig.title.toUpperCase(), centerX, layout.menu.titleY, textStyles.title);
    this.menu.render(renderer, centerX);
    renderer.text(this.footer, centerX, layout.menu.footerY, textStyles.hint);
  }
}

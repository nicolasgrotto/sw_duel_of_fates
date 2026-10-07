import { Action, keyBindings } from '../config/controlsConfig.js';
import { gameConfig } from '../config/gameConfig.js';
import { textStyles } from '../config/themeConfig.js';
import { layout, texts } from '../config/uiConfig.js';
import { formatText } from '../ui/formatText.js';
import { formatActionKeys } from '../ui/keyLabels.js';
import { MenuList } from '../ui/MenuList.js';
import { DuelMode } from './duelModes.js';
import { GameState } from './GameState.js';
import { StateId } from './stateIds.js';

export const MenuOption = Object.freeze({
  DUEL: 'duel',
  TRAINING: 'training',
  OPTIONS: 'options',
  CONTROLS: 'controls',
});

export class MenuState extends GameState {
  enter() {
    this.menu = new MenuList(
      [
        { id: MenuOption.DUEL, label: texts.menu.duel },
        { id: MenuOption.TRAINING, label: texts.menu.training },
        { id: MenuOption.OPTIONS, label: texts.menu.options },
        { id: MenuOption.CONTROLS, label: texts.menu.controls },
      ],
      layout.menu,
      this.game.audio,
    );
    this.refreshFooter();
  }

  refreshFooter() {
    this.bindings = this.game.input.bindings ?? keyBindings;
    this.footer = formatText(texts.menu.navigation, {
      up: formatActionKeys(this.game.input.bindings ?? keyBindings, Action.MENU_UP),
      down: formatActionKeys(this.game.input.bindings ?? keyBindings, Action.MENU_DOWN),
      confirm: formatActionKeys(this.game.input.bindings ?? keyBindings, Action.CONFIRM),
    });
  }

  update() {
    if (this.bindings !== (this.game.input.bindings ?? keyBindings)) {
      this.refreshFooter();
    }
    switch (this.menu.update(this.game.input)) {
      case MenuOption.DUEL:
        this.game.changeState(StateId.DUEL, { mode: DuelMode.VERSUS });
        break;
      case MenuOption.TRAINING:
        this.game.changeState(StateId.DUEL, { mode: DuelMode.TRAINING });
        break;
      case MenuOption.OPTIONS:
        this.game.pushState(StateId.OPTIONS);
        break;
      case MenuOption.CONTROLS:
        this.game.pushState(StateId.CONTROLS);
        break;
      default:
        break;
    }
  }

  render(renderer) {
    const centerX = renderer.width / 2;

    renderer.text(gameConfig.title.toUpperCase(), centerX, layout.menu.titleY, textStyles.title);
    this.menu.render(renderer, centerX);
    renderer.text(this.footer, centerX, layout.menu.footerY, textStyles.hint);
  }
}

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
  STORY: 'story',
  DUEL: 'duel',
  ARCADE: 'arcade',
  SURVIVAL: 'survival',
  LOCAL: 'local',
  TUTORIAL: 'tutorial',
  CHALLENGE: 'challenge',
  TRAINING: 'training',
  GALLERY: 'gallery',
  OPTIONS: 'options',
  CONTROLS: 'controls',
});

const MENU_ORDER = Object.freeze([
  MenuOption.DUEL,
  MenuOption.STORY,
  MenuOption.ARCADE,
  MenuOption.SURVIVAL,
  MenuOption.LOCAL,
  MenuOption.TUTORIAL,
  MenuOption.CHALLENGE,
  MenuOption.TRAINING,
  MenuOption.GALLERY,
  MenuOption.OPTIONS,
  MenuOption.CONTROLS,
]);

export class MenuState extends GameState {
  enter() {
    this.menu = new MenuList(
      MENU_ORDER
        .filter((id) => !this.game.coarsePointer || id !== MenuOption.LOCAL)
        .map((id) => ({ id, label: texts.menu[id] })),
      layout.menu,
      this.game.audio,
    );
    this.refreshFooter();
  }

  resume() {
    for (const item of this.menu.items) {
      item.label = texts.menu[item.id];
    }
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
      case MenuOption.STORY:
        this.game.changeState(StateId.STORY);
        break;
      case MenuOption.DUEL:
        this.game.changeState(StateId.CHARACTER_SELECT, { mode: DuelMode.VERSUS });
        break;
      case MenuOption.SURVIVAL:
        this.game.changeState(StateId.CHARACTER_SELECT, { mode: DuelMode.SURVIVAL });
        break;
      case MenuOption.LOCAL:
        this.game.changeState(StateId.CHARACTER_SELECT, { mode: DuelMode.LOCAL });
        break;
      case MenuOption.ARCADE:
        this.game.changeState(StateId.CHARACTER_SELECT, { mode: DuelMode.ARCADE });
        break;
      case MenuOption.TUTORIAL:
        this.game.changeState(StateId.DUEL, { mode: DuelMode.TUTORIAL });
        break;
      case MenuOption.CHALLENGE:
        this.game.changeState(StateId.DUEL, { mode: DuelMode.CHALLENGE });
        break;
      case MenuOption.TRAINING:
        this.game.changeState(StateId.DUEL, { mode: DuelMode.TRAINING });
        break;
      case MenuOption.GALLERY:
        this.game.changeState(StateId.DUEL, { mode: DuelMode.GALLERY });
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
    renderer.text(texts.menu.tagline, centerX, layout.menu.taglineY, textStyles.tagline);
    this.menu.render(renderer, centerX);
    renderer.text(this.game.input.lastInputKind === 'touch' ? texts.touch.navigation : this.footer, centerX, layout.menu.footerY, textStyles.hint);
  }
}

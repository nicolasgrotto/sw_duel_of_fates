import { aiConfig } from '../config/aiConfig.js';
import { Action, keyBindings } from '../config/controlsConfig.js';
import { gameConfig } from '../config/gameConfig.js';
import { textStyles } from '../config/themeConfig.js';
import { difficultyNames, layout, texts } from '../config/uiConfig.js';
import { formatText } from '../ui/formatText.js';
import { formatActionKeys } from '../ui/keyLabels.js';
import { MenuList } from '../ui/MenuList.js';
import { DuelMode } from './duelModes.js';
import { GameState } from './GameState.js';
import { StateId } from './stateIds.js';

export const MenuOption = Object.freeze({
  DUEL: 'duel',
  TRAINING: 'training',
  DIFFICULTY: 'difficulty',
  CONTROLS: 'controls',
});

function formatDifficulty(difficulty) {
  return formatText(texts.menu.difficulty, { level: difficultyNames[difficulty] });
}

export class MenuState extends GameState {
  enter() {
    this.difficultyItem = { id: MenuOption.DIFFICULTY, label: formatDifficulty(this.game.settings.difficulty) };
    this.menu = new MenuList(
      [
        { id: MenuOption.DUEL, label: texts.menu.duel },
        { id: MenuOption.TRAINING, label: texts.menu.training },
        this.difficultyItem,
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
    switch (this.menu.update(this.game.input)) {
      case MenuOption.DUEL:
        this.game.changeState(StateId.DUEL, { mode: DuelMode.VERSUS });
        break;
      case MenuOption.TRAINING:
        this.game.changeState(StateId.DUEL, { mode: DuelMode.TRAINING });
        break;
      case MenuOption.DIFFICULTY:
        this.cycleDifficulty();
        break;
      case MenuOption.CONTROLS:
        this.game.pushState(StateId.CONTROLS);
        break;
      default:
        break;
    }
  }

  cycleDifficulty() {
    const { difficultyOrder } = aiConfig;
    const { settings } = this.game;
    const nextIndex = (difficultyOrder.indexOf(settings.difficulty) + 1) % difficultyOrder.length;

    settings.difficulty = difficultyOrder[nextIndex];
    this.difficultyItem.label = formatDifficulty(settings.difficulty);
  }

  render(renderer) {
    const centerX = renderer.width / 2;

    renderer.text(gameConfig.title.toUpperCase(), centerX, layout.menu.titleY, textStyles.title);
    this.menu.render(renderer, centerX);
    renderer.text(this.footer, centerX, layout.menu.footerY, textStyles.hint);
  }
}

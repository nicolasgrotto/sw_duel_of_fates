import { Action, keyBindings } from '../config/controlsConfig.js';
import { textStyles } from '../config/themeConfig.js';
import { layout, texts } from '../config/uiConfig.js';
import { drawFitted } from '../ui/fittedText.js';
import { formatText } from '../ui/formatText.js';
import { formatActionKeys } from '../ui/keyLabels.js';
import { MenuList } from '../ui/MenuList.js';
import { GameState } from './GameState.js';
import { StateId } from './stateIds.js';

const BACK_ID = 'back';

export class ListScreenState extends GameState {
  enter() {
    const config = layout.listScreen;
    const items = [...this.buildItems(), { id: BACK_ID, label: texts.listScreen.back, detail: null }];
    this.menu = new MenuList(items, {
      firstItemY: config.firstItemY,
      itemSpacing: config.itemSpacing,
      listX: config.listX,
      touchWidth: config.touchWidth,
      visibleRows: config.visibleRows,
      scrollArrowTopY: config.scrollArrowTopY,
      scrollArrowBottomY: config.scrollArrowBottomY,
    }, this.game.audio);
    const bindings = this.game.input.bindings ?? keyBindings;
    this.footer = formatText(texts.listScreen.navigation, {
      up: formatActionKeys(bindings, Action.MENU_UP),
      down: formatActionKeys(bindings, Action.MENU_DOWN),
      confirm: formatActionKeys(bindings, Action.CONFIRM),
      back: formatActionKeys(bindings, Action.BACK),
    });
  }

  update() {
    if (this.game.input.wasPressed(Action.BACK)) {
      this.game.changeState(StateId.MENU);
      return;
    }
    const choice = this.menu.update(this.game.input);
    if (!choice) return;
    if (choice === BACK_ID) {
      this.game.changeState(StateId.MENU);
      return;
    }
    const item = this.menu.selected;
    if (!item.locked) this.confirmItem(item);
  }

  render(renderer) {
    const config = layout.listScreen;
    renderer.text(this.getTitle(), renderer.width / 2, config.titleY, textStyles.heading);
    this.menu.render(renderer, config.listX);
    const { detail } = this.menu.selected;
    if (detail) {
      drawFitted(renderer, detail.name, config.detailX, config.nameY, textStyles.subtitle, config.detailWidth);
      detail.lines.forEach((line, index) => {
        drawFitted(renderer, line, config.detailX, config.linesY + index * config.lineSpacing, textStyles.hint, config.detailWidth);
      });
      if (detail.accent) {
        drawFitted(renderer, detail.accent, config.detailX, config.linesY + detail.lines.length * config.lineSpacing, textStyles.accentHint, config.detailWidth);
      }
    }
    const footer = this.game.input.lastInputKind === 'touch' ? texts.touch.navigation : this.footer;
    drawFitted(renderer, footer, renderer.width / 2, config.footerY, textStyles.hint, config.footerWidth);
  }
}

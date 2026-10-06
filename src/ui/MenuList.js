import { Action } from '../config/controlsConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { layout } from '../config/uiConfig.js';

export class MenuList {
  constructor(items, { firstItemY, itemSpacing }) {
    this.items = items;
    this.firstItemY = firstItemY;
    this.itemSpacing = itemSpacing;
    this.selectedIndex = 0;
  }

  get selected() {
    return this.items[this.selectedIndex];
  }

  update(input) {
    if (input.wasPressed(Action.MENU_UP)) {
      this.move(-1);
    }
    if (input.wasPressed(Action.MENU_DOWN)) {
      this.move(1);
    }
    return input.wasPressed(Action.CONFIRM) ? this.selected.id : null;
  }

  move(step) {
    const count = this.items.length;
    this.selectedIndex = (this.selectedIndex + step + count) % count;
  }

  render(renderer, centerX) {
    const { markerWidth, markerGap, markerThickness } = layout.menuList;

    for (let index = 0; index < this.items.length; index += 1) {
      const item = this.items[index];
      const y = this.firstItemY + index * this.itemSpacing;
      const isSelected = index === this.selectedIndex;
      const style = isSelected ? textStyles.menuItemSelected : textStyles.menuItem;

      renderer.text(item.label, centerX, y, style);

      if (isSelected) {
        const markerEndX = centerX - renderer.measureText(item.label, style) / 2 - markerGap;
        renderer.line(markerEndX - markerWidth, y, markerEndX, y, colors.accent, markerThickness);
      }
    }
  }
}

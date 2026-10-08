import { touchLayoutConfig } from '../config/touchLayoutConfig.js';
import { SoundName } from '../audio/soundNames.js';
import { Action } from '../config/controlsConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { layout } from '../config/uiConfig.js';

export class MenuList {
  constructor(items, { firstItemY, itemSpacing, listX = touchLayoutConfig.width / 2, touchWidth = touchLayoutConfig.menuWidth }, sounds = null) {
    this.items = items;
    this.centerX = listX;
    this.touchWidth = touchWidth;
    this.sounds = sounds;
    this.firstItemY = firstItemY;
    this.itemSpacing = itemSpacing;
    this.selectedIndex = 0;
  }

  get selected() {
    return this.items[this.selectedIndex];
  }

  update(input) {
    for (const tap of input.touchTaps ?? []) {
      if (Math.abs(tap.x - this.centerX) > this.touchWidth / 2) continue;
      const index = Math.floor((tap.y - this.firstItemY + this.itemSpacing / 2) / this.itemSpacing);
      if (index < 0 || index >= this.items.length) continue;
      if (index === this.selectedIndex) {
        this.sounds?.play(SoundName.UI_CONFIRM);
        return this.selected.id;
      }
      this.selectedIndex = index;
      this.sounds?.play(SoundName.UI_MOVE);
    }
    if (input.wasPressed(Action.MENU_UP)) {
      this.move(-1);
    }
    if (input.wasPressed(Action.MENU_DOWN)) {
      this.move(1);
    }
    if (!input.wasPressed(Action.CONFIRM)) {
      return null;
    }
    this.sounds?.play(SoundName.UI_CONFIRM);
    return this.selected.id;
  }

  move(step) {
    const count = this.items.length;
    this.selectedIndex = (this.selectedIndex + step + count) % count;
    this.sounds?.play(SoundName.UI_MOVE);
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

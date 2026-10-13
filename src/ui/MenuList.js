import { touchLayoutConfig } from '../config/touchLayoutConfig.js';
import { SoundName } from '../audio/soundNames.js';
import { Action } from '../config/controlsConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { layout } from '../config/uiConfig.js';

export class MenuList {
  constructor(items, { firstItemY, itemSpacing, listX = touchLayoutConfig.width / 2, touchWidth = touchLayoutConfig.menuWidth, visibleRows = Infinity, scrollArrowTopY = 0, scrollArrowBottomY = 0 }, sounds = null) {
    this.items = items;
    this.centerX = listX;
    this.touchWidth = touchWidth;
    this.sounds = sounds;
    this.firstItemY = firstItemY;
    this.itemSpacing = itemSpacing;
    this.selectedIndex = 0;
    this.visibleRows = visibleRows;
    this.scrollArrowTopY = scrollArrowTopY;
    this.scrollArrowBottomY = scrollArrowBottomY;
    this.scrollOffset = 0;
  }

  get windowSize() {
    return Math.min(this.items.length, this.visibleRows);
  }

  followSelection() {
    const size = this.windowSize;
    if (this.selectedIndex < this.scrollOffset) this.scrollOffset = this.selectedIndex;
    if (this.selectedIndex >= this.scrollOffset + size) this.scrollOffset = this.selectedIndex - size + 1;
    this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, this.items.length - size));
  }

  get selected() {
    return this.items[this.selectedIndex];
  }

  update(input) {
    for (const tap of input.touchTaps ?? []) {
      if (Math.abs(tap.x - this.centerX) > this.touchWidth / 2) continue;
      const row = Math.floor((tap.y - this.firstItemY + this.itemSpacing / 2) / this.itemSpacing);
      if (row < 0 || row >= this.windowSize) continue;
      const index = row + this.scrollOffset;
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
    this.followSelection();
    this.sounds?.play(SoundName.UI_MOVE);
  }

  render(renderer, centerX) {
    const { markerWidth, markerGap, markerThickness } = layout.menuList;

    this.followSelection();
    const end = this.scrollOffset + this.windowSize;
    if (this.scrollOffset > 0) renderer.text('▲', centerX, this.scrollArrowTopY, textStyles.hint);
    if (end < this.items.length) renderer.text('▼', centerX, this.scrollArrowBottomY, textStyles.hint);
    for (let index = this.scrollOffset; index < end; index += 1) {
      const item = this.items[index];
      const y = this.firstItemY + (index - this.scrollOffset) * this.itemSpacing;
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

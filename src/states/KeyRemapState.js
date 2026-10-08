import { Action, keyBindings, remappableActions, reservedKeyCodes } from '../config/controlsConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { layout, texts } from '../config/uiConfig.js';
import { assignKey } from '../core/keyBindings.js';
import { formatText } from '../ui/formatText.js';
import { formatActionKeys, formatKey } from '../ui/keyLabels.js';
import { MenuList } from '../ui/MenuList.js';
import { GameState } from './GameState.js';

export const RemapOption = Object.freeze({
  RESET: 'reset',
  BACK: 'back',
});

export class KeyRemapState extends GameState {
  enter() {
    this.capturing = null;
    this.notice = '';
    this.items = [
      ...remappableActions.map((action) => ({ id: action, label: '' })),
      { id: RemapOption.RESET, label: texts.keyRemap.reset },
      { id: RemapOption.BACK, label: texts.keyRemap.back },
    ];
    this.menu = new MenuList(this.items, layout.keyRemap, this.game.audio);
    this.refreshLabels();
  }

  get bindings() {
    return this.game.input.bindings ?? keyBindings;
  }

  refreshLabels() {
    for (const item of this.items) {
      if (remappableActions.includes(item.id)) {
        item.label = formatText(texts.keyRemap.row, {
          action: texts.controls.actions[item.id],
          keys: formatActionKeys(this.bindings, item.id),
        });
      }
    }
  }

  update() {
    if (this.capturing) {
      this.updateCapture();
      return;
    }
    if (this.game.input.wasPressed(Action.BACK)) {
      this.game.popState();
      return;
    }
    const choice = this.menu.update(this.game.input);
    if (choice === RemapOption.BACK) {
      this.game.popState();
    } else if (choice === RemapOption.RESET) {
      this.saveCustom({});
    } else if (choice) {
      this.capturing = choice;
      this.notice = '';
    }
  }

  updateCapture() {
    const code = this.game.input.lastPressedCode;
    if (!code || code === 'Enter' || code === 'NumpadEnter') {
      return;
    }
    if (code === 'Escape') {
      this.capturing = null;
      return;
    }
    if (reservedKeyCodes.includes(code)) {
      this.notice = formatText(texts.keyRemap.reserved, { key: formatKey(code) });
      return;
    }
    this.saveCustom(assignKey(this.bindings, remappableActions, this.capturing, code));
    this.capturing = null;
  }

  saveCustom(custom) {
    const { settings } = this.game;
    settings.customBindings = custom;
    settings.keyboardPreset = 'custom';
    this.notice = '';
    this.game.applySettings();
    this.game.saveSettings();
    this.refreshLabels();
  }

  render(renderer) {
    const centerX = renderer.width / 2;
    const { titleY, hintY } = layout.keyRemap;

    renderer.clear(colors.background);
    renderer.text(texts.keyRemap.title, centerX, titleY, textStyles.heading);
    this.menu.render(renderer, centerX);
    const hint = this.capturing
      ? formatText(texts.keyRemap.waiting, { action: texts.controls.actions[this.capturing] })
      : this.notice || texts.keyRemap.help;
    renderer.text(hint, centerX, hintY, textStyles.hint);
  }
}

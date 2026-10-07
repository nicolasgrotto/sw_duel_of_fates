import { Action, keyBindings } from '../config/controlsConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { controlsScreenRows, keyComboSeparator, layout, texts } from '../config/uiConfig.js';
import { formatText } from '../ui/formatText.js';
import { formatActionKeys } from '../ui/keyLabels.js';
import { GameState } from './GameState.js';

export class ControlsState extends GameState {
  enter() {
    this.rows = controlsScreenRows.map(({ label, actions, groups }) => ({
      label: texts.controls.actions[label],
      keys: (groups ?? actions.map((action) => [action]))
        .map((group) => group.map((action) => formatActionKeys(this.game.input.bindings ?? keyBindings, action)).join(texts.controls.or))
        .join(keyComboSeparator),
    }));
    this.footer = formatText(texts.controls.back, { back: formatActionKeys(this.game.input.bindings ?? keyBindings, Action.BACK) });
  }

  update() {
    const { input } = this.game;
    if (input.wasPressed(Action.BACK) || input.wasPressed(Action.CONFIRM)) {
      this.game.popState();
    }
  }

  render(renderer) {
    const { titleY, firstRowY, rowSpacing, columnGap, footerY } = layout.controls;
    const centerX = renderer.width / 2;

    renderer.clear(colors.background);
    renderer.text(texts.controls.title, centerX, titleY, textStyles.heading);

    for (let index = 0; index < this.rows.length; index += 1) {
      const row = this.rows[index];
      const y = firstRowY + index * rowSpacing;
      renderer.text(row.label, centerX - columnGap, y, textStyles.tableLabel);
      renderer.text(row.keys, centerX + columnGap, y, textStyles.tableValue);
    }

    renderer.text(texts.controls.gamepad, centerX, layout.controls.gamepadY, textStyles.hint);
    renderer.text(this.footer, centerX, footerY, textStyles.hint);
  }
}

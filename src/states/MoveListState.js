import { characters } from '../characters/characterData.js';
import { Action, keyBindings } from '../config/controlsConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { layout, texts } from '../config/uiConfig.js';
import { formatText } from '../ui/formatText.js';
import { formatActionKeys } from '../ui/keyLabels.js';
import { buildMoveList } from '../ui/moveList.js';
import { GameState } from './GameState.js';

export class MoveListState extends GameState {
  enter() {
    const character = characters[this.params.characterId];
    const bindings = this.game.input.bindings ?? keyBindings;
    this.title = formatText(texts.moveList.title, { name: character.name.toUpperCase() });
    this.rows = buildMoveList(character, bindings);
    this.footer = formatText(texts.controls.back, { back: formatActionKeys(bindings, Action.BACK) });
  }

  update() {
    const { input } = this.game;
    if (input.wasPressed(Action.BACK) || input.wasPressed(Action.CONFIRM) || input.wasPressed(Action.PAUSE)) {
      this.game.popState();
    }
  }

  render(renderer) {
    const { titleY, firstRowY, rowSpacing, keysX, labelX, footerY } = layout.moveList;
    const centerX = renderer.width / 2;

    renderer.clear(colors.background);
    renderer.text(this.title, centerX, titleY, textStyles.heading);
    for (let index = 0; index < this.rows.length; index += 1) {
      const row = this.rows[index];
      const y = firstRowY + index * rowSpacing;
      renderer.text(row.keys, keysX, y, textStyles.tableKey);
      renderer.text(row.label, labelX, y, textStyles.tableDescription);
    }
    renderer.text(this.footer, centerX, footerY, textStyles.hint);
  }
}

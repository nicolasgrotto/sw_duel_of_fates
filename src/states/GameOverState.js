import { Action } from '../config/controlsConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { layout, texts } from '../config/uiConfig.js';
import { formatText } from '../ui/formatText.js';
import { MenuList } from '../ui/MenuList.js';
import { GameState } from './GameState.js';
import { StateId } from './stateIds.js';

export const GameOverOption = Object.freeze({
  REMATCH: 'rematch',
  MENU: 'menu',
});

function formatSeconds(seconds) {
  return seconds.toFixed(1).replace('.', ',');
}

export class GameOverState extends GameState {
  enter() {
    if (this.params.summary !== undefined) {
      this.enterSummary();
    } else {
      this.enterDuelResult();
    }
    this.menu = new MenuList(
      [
        { id: GameOverOption.REMATCH, label: this.params.rematchLabel ?? texts.result.rematch },
        { id: GameOverOption.MENU, label: this.params.menuLabel ?? texts.result.menu },
      ],
      layout.result,
      this.game.audio,
    );
  }

  enterSummary() {
    this.title = this.params.title;
    this.winnerLine = this.params.subtitle;
    this.statsLine = this.params.summary;
    this.names = ['', ''];
    this.rows = [];
  }

  enterDuelResult() {
    const { playerWon, winnerName, stats } = this.params;
    this.title = this.params.title ?? (playerWon ? texts.result.victory : texts.result.defeat);
    this.winnerLine = formatText(texts.result.winner, { name: winnerName });
    this.statsLine = formatText(texts.result.time, { time: formatSeconds(stats.time) });
    this.names = this.params.names ?? ['', ''];
    const opponentStats = this.params.opponentStats ?? {};
    this.rows = texts.result.rows.map(({ key, label }) => ({
      label,
      left: String(Math.round(stats[key] ?? 0)),
      right: String(Math.round(opponentStats[key] ?? 0)),
    }));
  }

  update() {
    if (this.game.input.wasPressed(Action.BACK)) {
      this.game.changeState(this.params.menuState ?? StateId.MENU);
      return;
    }
    const choice = this.menu.update(this.game.input);

    if (choice === GameOverOption.REMATCH) {
      this.game.changeState(StateId.DUEL, this.params.rematchParams ?? this.params.duelParams);
    } else if (choice === GameOverOption.MENU) {
      this.game.changeState(this.params.menuState ?? StateId.MENU);
    }
  }

  render(renderer) {
    const centerX = renderer.width / 2;
    const { titleY, winnerY, statsY } = layout.result;

    renderer.overlay(colors.overlay);
    renderer.text(this.title, centerX, titleY, textStyles.title);
    renderer.text(this.winnerLine, centerX, winnerY, textStyles.subtitle);
    renderer.text(this.statsLine, centerX, statsY, textStyles.hint);
    this.renderTable(renderer, centerX);
    if (this.params.unlockLine) {
      renderer.text(this.params.unlockLine, centerX, layout.result.unlockY, textStyles.subtitle);
    }
    this.menu.render(renderer, centerX);
  }

  renderTable(renderer, centerX) {
    if (this.rows.length === 0) {
      return;
    }
    const { tableY, tableRowSpacing, tableColumnGap } = layout.result;
    renderer.text(this.names[0], centerX - tableColumnGap, tableY, textStyles.resultName);
    renderer.text(this.names[1], centerX + tableColumnGap, tableY, textStyles.resultName);
    for (let index = 0; index < this.rows.length; index += 1) {
      const row = this.rows[index];
      const y = tableY + (index + 1) * tableRowSpacing;
      renderer.text(row.left, centerX - tableColumnGap, y, textStyles.resultValue);
      renderer.text(row.label, centerX, y, textStyles.hint);
      renderer.text(row.right, centerX + tableColumnGap, y, textStyles.resultValue);
    }
  }
}

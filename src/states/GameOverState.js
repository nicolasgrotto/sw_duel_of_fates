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
    const { playerWon, winnerName, stats } = this.params;

    this.title = playerWon ? texts.result.victory : texts.result.defeat;
    this.winnerLine = formatText(texts.result.winner, { name: winnerName });
    this.statsLine = formatText(texts.result.stats, {
      time: formatSeconds(stats.time),
      hits: stats.hits,
      blocks: stats.blocks,
    });
    this.menu = new MenuList(
      [
        { id: GameOverOption.REMATCH, label: texts.result.rematch },
        { id: GameOverOption.MENU, label: texts.result.menu },
      ],
      layout.result,
      this.game.audio,
    );
  }

  update() {
    const choice = this.menu.update(this.game.input);

    if (choice === GameOverOption.REMATCH) {
      this.game.changeState(StateId.DUEL, this.params.duelParams);
    } else if (choice === GameOverOption.MENU) {
      this.game.changeState(StateId.MENU);
    }
  }

  render(renderer) {
    const centerX = renderer.width / 2;
    const { titleY, winnerY, statsY } = layout.result;

    renderer.overlay(colors.overlay);
    renderer.text(this.title, centerX, titleY, textStyles.title);
    renderer.text(this.winnerLine, centerX, winnerY, textStyles.subtitle);
    renderer.text(this.statsLine, centerX, statsY, textStyles.hint);
    this.menu.render(renderer, centerX);
  }
}

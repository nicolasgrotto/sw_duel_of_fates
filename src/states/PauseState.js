import { Action } from '../config/controlsConfig.js';
import { gameConfig } from '../config/gameConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { layout, texts } from '../config/uiConfig.js';
import { formatText } from '../ui/formatText.js';
import { MenuList } from '../ui/MenuList.js';
import { GameState } from './GameState.js';
import { StateId } from './stateIds.js';

export const PauseOption = Object.freeze({
  RESUME: 'resume',
  MOVES: 'moves',
  SECOND_MOVES: 'secondMoves',
  RESTART: 'restart',
  QUIT: 'quit',
});

export class PauseState extends GameState {
  enter() {
    this.menu = new MenuList(
      [
        { id: PauseOption.RESUME, label: texts.pause.resume },
        ...this.createMoveOptions(),
        { id: PauseOption.RESTART, label: texts.pause.restart },
        { id: PauseOption.QUIT, label: texts.pause.quit },
      ],
      layout.pause,
      this.game.audio,
    );
  }

  createMoveOptions() {
    if (!this.params.secondPlayer) {
      return [{ id: PauseOption.MOVES, label: texts.pause.moves }];
    }
    return [
      { id: PauseOption.MOVES, label: formatText(texts.pause.playerMoves, { player: 1 }) },
      { id: PauseOption.SECOND_MOVES, label: formatText(texts.pause.playerMoves, { player: 2 }) },
    ];
  }

  update() {
    const { input } = this.game;

    if (input.wasPressed(Action.PAUSE) || input.wasPressed(Action.BACK)) {
      this.game.popState();
      return;
    }

    switch (this.menu.update(input)) {
      case PauseOption.RESUME:
        this.game.popState();
        break;
      case PauseOption.MOVES:
        this.game.pushState(StateId.MOVE_LIST, { characterId: this.params.duelParams?.playerCharacter ?? gameConfig.duel.playerCharacter, character: this.params.character, powers: this.params.rules?.powers === true });
        break;
      case PauseOption.SECOND_MOVES:
        this.game.pushState(StateId.MOVE_LIST, { ...this.params.secondPlayer, powers: this.params.rules?.powers === true });
        break;
      case PauseOption.RESTART:
        this.game.changeState(StateId.DUEL, this.params.duelParams);
        break;
      case PauseOption.QUIT:
        this.game.changeState(this.params.quitState ?? StateId.MENU);
        break;
      default:
        break;
    }
  }

  render(renderer) {
    const centerX = renderer.width / 2;

    renderer.overlay(colors.overlay);
    renderer.text(texts.pause.title, centerX, layout.pause.titleY, textStyles.heading);
    this.menu.render(renderer, centerX);
  }
}

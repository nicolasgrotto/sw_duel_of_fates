import { ControlsState } from './ControlsState.js';
import { DuelState } from './DuelState.js';
import { GameOverState } from './GameOverState.js';
import { MenuState } from './MenuState.js';
import { PauseState } from './PauseState.js';
import { StateId } from './stateIds.js';

const stateClasses = {
  [StateId.MENU]: MenuState,
  [StateId.DUEL]: DuelState,
  [StateId.PAUSE]: PauseState,
  [StateId.CONTROLS]: ControlsState,
  [StateId.GAME_OVER]: GameOverState,
};

export function createState(id, game, params) {
  const StateClass = stateClasses[id];
  if (!StateClass) {
    throw new Error(`Unknown state: ${id}`);
  }
  return new StateClass(game, params);
}

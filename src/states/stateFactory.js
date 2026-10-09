import { CharacterSelectState } from './CharacterSelectState.js';
import { ControlsState } from './ControlsState.js';
import { DialogueState } from './DialogueState.js';
import { DuelState } from './DuelState.js';
import { GameOverState } from './GameOverState.js';
import { KeyRemapState } from './KeyRemapState.js';
import { MenuState } from './MenuState.js';
import { MoveListState } from './MoveListState.js';
import { OptionsState } from './OptionsState.js';
import { PauseState } from './PauseState.js';
import { ProtagonistState } from './ProtagonistState.js';
import { ReplayState } from './ReplayState.js';
import { StateId } from './stateIds.js';
import { StoryState } from './StoryState.js';

const stateClasses = {
  [StateId.MENU]: MenuState,
  [StateId.CHARACTER_SELECT]: CharacterSelectState,
  [StateId.DUEL]: DuelState,
  [StateId.PAUSE]: PauseState,
  [StateId.CONTROLS]: ControlsState,
  [StateId.GAME_OVER]: GameOverState,
  [StateId.OPTIONS]: OptionsState,
  [StateId.MOVE_LIST]: MoveListState,
  [StateId.REPLAY]: ReplayState,
  [StateId.KEY_REMAP]: KeyRemapState,
  [StateId.STORY]: StoryState,
  [StateId.PROTAGONIST]: ProtagonistState,
  [StateId.DIALOGUE]: DialogueState,
};

export function createState(id, game, params) {
  const StateClass = stateClasses[id];
  if (!StateClass) {
    throw new Error(`Unknown state: ${id}`);
  }
  return new StateClass(game, params);
}

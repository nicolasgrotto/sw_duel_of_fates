import { drillsConfig } from '../config/drillsConfig.js';
import { texts } from '../config/uiConfig.js';
import { DuelMode } from './duelModes.js';
import { ListScreenState } from './ListScreenState.js';
import { StateId } from './stateIds.js';

export function createDrillParams(id) {
  return { mode: DuelMode.DRILL, drill: id };
}

export class DrillSelectState extends ListScreenState {
  getTitle() {
    return texts.drills.title;
  }

  buildItems() {
    return drillsConfig.order.map((id) => ({
      id,
      label: texts.drills.names[id],
      detail: {
        name: texts.drills.names[id],
        lines: texts.drills.descriptions[id],
        accent: texts.drills.stepCount.replace('{count}', drillsConfig.drills[id].steps.length),
      },
    }));
  }

  confirmItem(item) {
    this.game.changeState(StateId.DUEL, createDrillParams(item.id));
  }
}

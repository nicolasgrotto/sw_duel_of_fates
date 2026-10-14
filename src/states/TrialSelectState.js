import { characters } from '../characters/characterData.js';
import { challengesConfig } from '../config/challengesConfig.js';
import { difficultyNames, texts } from '../config/uiConfig.js';
import { createTrialParams } from '../modes/challenges.js';
import { formatSeconds, formatText } from '../ui/formatText.js';
import { ListScreenState } from './ListScreenState.js';
import { StateId } from './stateIds.js';

function describeRecord(record) {
  return typeof record?.time === 'number' ? formatText(texts.trials.record, { time: formatSeconds(record.time) }) : texts.trials.noRecord;
}

export class TrialSelectState extends ListScreenState {
  getTitle() {
    return texts.trials.title;
  }

  buildItems() {
    const records = this.game.settings.challengeRecords ?? {};
    return challengesConfig.order.map((id) => {
      const challenge = challengesConfig.challenges[id];
      return {
        id,
        label: texts.trials.names[id],
        detail: {
          name: texts.trials.names[id],
          lines: [
            formatText(texts.trials.matchup, { player: characters[challenge.player].name, opponent: characters[challenge.opponent].name }),
            formatText(texts.trials.setting, { arena: texts.arenas[challenge.arena], difficulty: difficultyNames[challenge.difficulty] }),
            challenge.powers ? texts.trials.powersOn : texts.trials.powersOff,
            ...(challenge.playerHealth < 1 ? [formatText(texts.trials.startHealth, { percent: Math.round(challenge.playerHealth * 100) })] : []),
            texts.trials.goals[id],
          ],
          accent: describeRecord(records[id]),
        },
      };
    });
  }

  confirmItem(item) {
    this.game.changeState(StateId.DUEL, createTrialParams(item.id, challengesConfig));
  }
}

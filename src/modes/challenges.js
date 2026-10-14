import { resolveCombatRules } from '../config/combatRulesConfig.js';
import { DuelMode } from '../states/duelModes.js';

export function createTrialParams(id, config) {
  const challenge = config.challenges[id];
  return {
    mode: DuelMode.TRIAL,
    trial: { id, playerCharacter: challenge.player },
    rules: resolveCombatRules({ ...config.rules, powers: challenge.powers }),
    seed: challenge.seed,
  };
}

export function getTrialStage(trial, config) {
  const challenge = config.challenges[trial.id];
  return {
    id: trial.id,
    number: config.order.indexOf(trial.id) + 1,
    total: config.order.length,
    opponentCharacter: challenge.opponent,
    difficulty: challenge.difficulty,
    arena: challenge.arena,
    playerHealth: challenge.playerHealth,
    isBoss: false,
  };
}

export function recordTrialTime(records, id, time) {
  const best = records?.[id]?.time;
  if (best !== undefined && best <= time) {
    return { records: records ?? {}, improved: false, best };
  }
  return { records: { ...records, [id]: { time } }, improved: true, best: time };
}

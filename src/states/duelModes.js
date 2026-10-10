import { combatRulesConfig, resolveCombatRules } from '../config/combatRulesConfig.js';

export const DuelMode = Object.freeze({
  VERSUS: 'versus',
  ARCADE: 'arcade',
  SURVIVAL: 'survival',
  LOCAL: 'local',
  TRAINING: 'training',
  TUTORIAL: 'tutorial',
  CHALLENGE: 'parryChallenge',
  STORY: 'story',
});

const DUMMY_MODES = new Set([DuelMode.TRAINING, DuelMode.TUTORIAL, DuelMode.CHALLENGE]);

export function createDuelRules(mode, settings, powerModes) {
  const rules = { powers: powerModes.includes(mode) && settings.powers !== false };
  for (const [capability, modes] of Object.entries(combatRulesConfig.modes)) {
    rules[capability] = modes.includes(mode);
  }
  return resolveCombatRules(rules);
}

export function usesDummy(mode) {
  return DUMMY_MODES.has(mode);
}

export function hasRoundLimit(mode) {
  return !DUMMY_MODES.has(mode);
}

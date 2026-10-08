export const DuelMode = Object.freeze({
  VERSUS: 'versus',
  ARCADE: 'arcade',
  SURVIVAL: 'survival',
  LOCAL: 'local',
  TRAINING: 'training',
  TUTORIAL: 'tutorial',
  CHALLENGE: 'parryChallenge',
});

const DUMMY_MODES = new Set([DuelMode.TRAINING, DuelMode.TUTORIAL, DuelMode.CHALLENGE]);

export function createDuelRules(mode, settings, powerModes) {
  return { powers: powerModes.includes(mode) && settings.powers !== false };
}

export function usesDummy(mode) {
  return DUMMY_MODES.has(mode);
}

export function hasRoundLimit(mode) {
  return !DUMMY_MODES.has(mode);
}

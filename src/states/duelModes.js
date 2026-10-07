export const DuelMode = Object.freeze({
  VERSUS: 'versus',
  TRAINING: 'training',
  TUTORIAL: 'tutorial',
  CHALLENGE: 'parryChallenge',
});

const DUMMY_MODES = new Set([DuelMode.TRAINING, DuelMode.TUTORIAL, DuelMode.CHALLENGE]);

export function usesDummy(mode) {
  return DUMMY_MODES.has(mode);
}

export function hasRoundLimit(mode) {
  return !DUMMY_MODES.has(mode);
}

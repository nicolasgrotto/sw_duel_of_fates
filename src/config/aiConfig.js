export const Difficulty = Object.freeze({
  EASY: 'easy',
  NORMAL: 'normal',
  HARD: 'hard',
});

export const AiProfile = Object.freeze({
  AGGRESSIVE: 'aggressive',
  DEFENSIVE: 'defensive',
  BALANCED: 'balanced',
});

export const aiConfig = {
  defaultDifficulty: Difficulty.NORMAL,
  difficultyOrder: [Difficulty.EASY, Difficulty.NORMAL, Difficulty.HARD],
  difficulties: {
    [Difficulty.EASY]: {
      reactionTime: 0.45,
      defenseMultiplier: 0.35,
      mistakeChance: 0.3,
      attackCooldown: 1,
    },
    [Difficulty.NORMAL]: {
      reactionTime: 0.28,
      defenseMultiplier: 0.7,
      mistakeChance: 0.12,
      attackCooldown: 0.65,
    },
    [Difficulty.HARD]: {
      reactionTime: 0.15,
      defenseMultiplier: 1,
      mistakeChance: 0.04,
      attackCooldown: 0.4,
    },
  },
  profiles: {
    [AiProfile.AGGRESSIVE]: {
      attackChance: 0.8,
      heavyChance: 0.35,
      blockChance: 0.35,
      dodgeChance: 0.1,
      counterChance: 0.8,
      preferredGap: 40,
      retreatStaminaRatio: 0.2,
    },
    [AiProfile.DEFENSIVE]: {
      attackChance: 0.35,
      heavyChance: 0.2,
      blockChance: 0.7,
      dodgeChance: 0.2,
      counterChance: 0.9,
      preferredGap: 90,
      retreatStaminaRatio: 0.4,
    },
    [AiProfile.BALANCED]: {
      attackChance: 0.55,
      heavyChance: 0.25,
      blockChance: 0.5,
      dodgeChance: 0.15,
      counterChance: 0.75,
      preferredGap: 60,
      retreatStaminaRatio: 0.3,
    },
  },
  perception: {
    reachMargin: 10,
    threatMargin: 20,
    safeGapExtra: 80,
    closeGapRatio: 0.5,
    blockHoldTime: 0.35,
  },
};

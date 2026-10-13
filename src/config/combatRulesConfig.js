export const combatRulesConfig = {
  exhaustion: {
    enterRatio: 0.05,
    exitRatio: 0.3,
    minDuration: 1,
    guardBreakMinDuration: 1,
    damageScale: 1.1,
  },
  modes: {
    exhaustion: ['versus', 'local', 'training', 'tutorial'],
    wounds: ['versus', 'local', 'training', 'tutorial'],
    focusEvade: ['versus', 'local', 'training'],
    bladeLock: ['versus', 'local', 'training', 'tutorial'],
  },
  wounds: {
    arm: { blockCostScale: 1.25 },
    leg: { dashCostScale: 1.2, maxJumps: 1 },
  },
  focus: { autoEvadeCost: 30 },
  bladeLock: {
    cooldown: 4,
    distance: 70,
    minPressInterval: 1 / 15,
    winMargin: 5,
    maxDuration: 3,
    timeoutMargin: 1,
    damage: 8,
    staminaLoss: 35,
    separation: 420,
    loserStagger: 0.35,
    winnerRecovery: 0.25,
    lockReleaseGuard: 0.15,
    holdRate: 6,
  },
};

export function resolveCombatRules(rules = {}) {
  return {
    powers: rules.powers === true,
    exhaustion: rules.exhaustion === true,
    wounds: rules.wounds === true,
    focusEvade: rules.powers === true && rules.focusEvade === true,
    bladeLock: rules.bladeLock === true,
  };
}

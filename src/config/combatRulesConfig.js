export const combatRulesConfig = {
  exhaustion: {
    enterRatio: 0.05,
    exitRatio: 0.3,
    minDuration: 1,
    guardBreakMinDuration: 1,
    damageScale: 1.1,
  },
  modes: {
    exhaustion: ['versus', 'local', 'training', 'tutorial', 'drill'],
    wounds: ['versus', 'local', 'training', 'tutorial', 'drill'],
    focusEvade: ['versus', 'local', 'training'],
    bladeLock: ['versus', 'local', 'training', 'tutorial', 'drill'],
    finishers: ['versus', 'local', 'training', 'tutorial', 'arcade', 'survival', 'drill'],
  },
  finishers: {
    headChance: 0.3,
    limbs: {
      light: 'arm', light2: 'arm', light4: 'arm', light5: 'arm', heavy: 'arm', riposte: 'arm', special: 'arm', counterStrike: 'arm', bladeLock: 'arm',
      light3: 'leg', forwardHeavy: 'leg', spin: 'leg', dashSlash: 'leg',
    },
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
    competitiveHoldRate: 9,
    rhythm: { beat: 0.3, window: 0.07 },
  },
  prototypeModes: ['versus', 'local', 'training'],
};

export function resolveCombatRules(rules = {}) {
  return {
    powers: rules.powers === true,
    exhaustion: rules.exhaustion === true,
    wounds: rules.wounds === true,
    focusEvade: rules.powers === true && rules.focusEvade === true,
    bladeLock: rules.bladeLock === true,
    finishers: rules.finishers === true,
    bladeLockRhythm: rules.bladeLock === true && rules.bladeLockRhythm === true,
  };
}

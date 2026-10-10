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
  },
  wounds: {
    arm: { blockCostScale: 1.25 },
    leg: { dashCostScale: 1.2, maxJumps: 1 },
  },
  focus: { autoEvadeCost: 30 },
};

export function resolveCombatRules(rules = {}) {
  return {
    powers: rules.powers === true,
    exhaustion: rules.exhaustion === true,
    wounds: rules.wounds === true,
    focusEvade: rules.powers === true && rules.focusEvade === true,
  };
}

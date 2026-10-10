export const combatRulesConfig = {
  exhaustion: {
    enterRatio: 0.1,
    exitRatio: 0.4,
    minDuration: 1,
    guardBreakMinDuration: 1.6,
    damageScale: 1.2,
  },
  modes: {
    exhaustion: ['versus', 'local', 'training'],
    wounds: ['versus', 'local', 'training'],
    focusEvade: ['versus', 'local', 'training'],
  },
  wounds: {
    arm: { blockCostScale: 1.35 },
    leg: { dashCostScale: 1.35, maxJumps: 1 },
  },
  focus: { autoEvadeCost: 12 },
};

export function resolveCombatRules(rules = {}) {
  return {
    powers: rules.powers === true,
    exhaustion: rules.exhaustion === true,
    wounds: rules.wounds === true,
    focusEvade: rules.powers === true && rules.focusEvade === true,
  };
}

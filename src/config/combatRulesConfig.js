export const combatRulesConfig = {
  modes: {
    exhaustion: ['versus', 'local', 'training'],
    wounds: ['versus', 'local', 'training'],
    focusEvade: ['versus', 'local', 'training'],
  },
};

export function resolveCombatRules(rules = {}) {
  return {
    powers: rules.powers === true,
    exhaustion: rules.exhaustion === true,
    wounds: rules.wounds === true,
    focusEvade: rules.powers === true && rules.focusEvade === true,
  };
}

export const drillsConfig = {
  order: ['evade', 'exhaustion', 'bladeLock'],
  drills: {
    evade: {
      steps: [
        { id: 'evadeOnce', dummy: 'attack', count: 1, goal: { type: 'event', events: ['evadeSuccess'], role: 'defender', attackTypes: null, minChainStep: 0 } },
        { id: 'evadeStreak', dummy: 'attack', count: 3, goal: { type: 'streak', field: 'evadeStreak' } },
        {
          id: 'evadePunish', dummy: 'attack', count: 2,
          goal: { type: 'event', events: ['hit'], role: 'attacker', attackTypes: null, minChainStep: 0, resetOn: ['hit'] },
        },
      ],
    },
    exhaustion: {
      steps: [
        { id: 'exhaustSelf', dummy: 'block', count: 1, goal: { type: 'event', events: ['exhaustion'], role: 'attacker', attackTypes: null, minChainStep: 0 } },
        { id: 'recover', dummy: 'idle', count: 1, goal: { type: 'event', events: ['exhaustionRecovered'], role: 'attacker', attackTypes: null, minChainStep: 0 } },
        { id: 'breakGuard', dummy: 'block', count: 1, goal: { type: 'event', events: ['guardBreak'], role: 'attacker', attackTypes: null, minChainStep: 0 } },
        { id: 'woundDummy', dummy: 'block', count: 1, goal: { type: 'event', events: ['wound'], role: 'attacker', attackTypes: null, minChainStep: 0 } },
      ],
    },
    bladeLock: {
      steps: [
        { id: 'lockStart', dummy: 'lock', count: 1, goal: { type: 'event', events: ['bladeLockStart'], role: 'either', attackTypes: null, minChainStep: 0 } },
        { id: 'lockWins', dummy: 'lock', count: 3, goal: { type: 'event', events: ['bladeLockEnd'], role: 'winner', attackTypes: null, minChainStep: 0 } },
      ],
    },
  },
};

export const tutorialConfig = {
  steps: [
    { id: 'move', dummy: 'idle', count: 1, goal: { type: 'move' } },
    { id: 'light', dummy: 'idle', count: 2, goal: { type: 'event', events: ['hit'], role: 'attacker', attackTypes: null, minChainStep: 1 } },
    { id: 'chain', dummy: 'idle', count: 1, goal: { type: 'event', events: ['hit'], role: 'attacker', attackTypes: null, minChainStep: 2 } },
    { id: 'heavy', dummy: 'idle', count: 1, goal: { type: 'event', events: ['hit'], role: 'attacker', attackTypes: ['heavy', 'forwardHeavy'], minChainStep: 0 } },
    { id: 'block', dummy: 'attack', count: 2, goal: { type: 'event', events: ['block'], role: 'defender', attackTypes: null, minChainStep: 0 } },
    { id: 'parry', dummy: 'heavy', count: 2, goal: { type: 'event', events: ['parry', 'perfectParry'], role: 'defender', attackTypes: null, minChainStep: 0 } },
    { id: 'riposte', dummy: 'heavy', count: 1, goal: { type: 'event', events: ['hit'], role: 'attacker', attackTypes: ['riposte'], minChainStep: 0 } },
    { id: 'shove', dummy: 'block', count: 1, goal: { type: 'event', events: ['shove'], role: 'attacker', attackTypes: null, minChainStep: 0 } },
    { id: 'special', dummy: 'idle', count: 1, goal: { type: 'event', events: ['attackStart'], role: 'attacker', attackTypes: ['special'], minChainStep: 0 } },
  ],
  challenge: {
    duration: 45,
    points: { parry: 1, perfectParry: 2 },
  },
};

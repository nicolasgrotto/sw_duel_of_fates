export const challengesConfig = {
  order: ['saltNoFlow', 'deckStorm', 'lastStand', 'eclipseReaper'],
  challenges: {
    saltNoFlow: {
      player: 'guardian', opponent: 'shadow', difficulty: 'hard', arena: 'saltFlats', powers: false, playerHealth: 1, seed: 2141,
    },
    deckStorm: {
      player: 'wasp', opponent: 'sovereign', difficulty: 'normal', arena: 'skyDeck', powers: true, playerHealth: 1, seed: 2142,
    },
    lastStand: {
      player: 'bastion', opponent: 'forge', difficulty: 'normal', arena: 'snowPeak', powers: false, playerHealth: 0.35, seed: 2143,
    },
    eclipseReaper: {
      player: 'reaper', opponent: 'mirror', difficulty: 'hard', arena: 'eclipseCitadel', powers: true, playerHealth: 1, seed: 2144,
    },
  },
  rules: { exhaustion: true, wounds: true, focusEvade: true, bladeLock: true, finishers: true },
};

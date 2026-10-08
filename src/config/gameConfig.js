export const gameConfig = {
  title: 'Duel of Fates',
  settingsStorageKey: 'duel-of-fates.settings',
  canvas: {
    width: 1280,
    height: 720,
  },
  loop: {
    fixedStep: 1 / 60,
    maxFrameTime: 0.25,
  },
  arena: {
    floorY: 600,
    wallPadding: 40,
    overscan: 32,
  },
  physics: {
    gravity: 2400,
    maxFallSpeed: 1400,
    restingSpeed: 5,
    actionFriction: 1400,
  },
  combat: {
    inputBuffer: 0.15,
    fallRoomMargin: 60,
    clash: {
      pushback: 280,
      recoil: 0.25,
    },
  },
  duel: {
    arena: 'refinery',
    arenaOrder: ['refinery', 'sanctuary', 'crystalMine', 'rooftop', 'orbital', 'forest'],
    playerCharacter: 'guardian',
    opponentCharacter: 'shadow',
    spawnDistance: 440,
    roundsToWin: 2,
    resultDelay: 1.5,
    training: { recordingFrames: 600 },
    dummy: {
      attackInterval: 1.4,
      heavyInterval: [1.1, 2.1],
      approachGap: 40,
    },
  },
  replay: {
    frames: 210,
    snapshotInterval: 30,
    speed: 0.45,
    minDuration: 1,
  },
  arcade: {
    maxOpponents: 6,
    difficulties: ['easy', 'easy', 'normal', 'normal', 'hard', 'hard'],
    boss: 'shadowAwakened',
    bossDifficulty: 'hard',
    enragedDifficulty: 'boss',
    enrageHealthRatio: 0.5,
  },
  debug: {
    enabled: false,
    fpsSampleWindow: 0.5,
    x: 12,
    y: 84,
    width: 360,
    padding: 10,
    lineHeight: 18,
  },
};

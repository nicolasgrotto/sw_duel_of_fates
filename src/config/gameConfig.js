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
    playerCharacter: 'guardian',
    opponentCharacter: 'shadow',
    spawnDistance: 440,
    roundsToWin: 2,
    resultDelay: 1.5,
    dummy: {
      attackInterval: 1.4,
    },
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

export const gameConfig = {
  title: 'Duel of Fates',
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
  },
  physics: {
    gravity: 2400,
    maxFallSpeed: 1400,
    restingSpeed: 5,
    actionFriction: 1400,
    fallRoomMargin: 60,
  },
  duel: {
    playerCharacter: 'guardian',
    opponentCharacter: 'shadow',
    spawnDistance: 440,
    resultDelay: 1.2,
    dummy: {
      attackInterval: 1.4,
    },
  },
  debug: {
    enabled: false,
    fpsSampleWindow: 0.5,
    x: 12,
    y: 12,
    width: 300,
    padding: 10,
    lineHeight: 18,
  },
};

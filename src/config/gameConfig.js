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
  debug: {
    enabled: false,
  },
};

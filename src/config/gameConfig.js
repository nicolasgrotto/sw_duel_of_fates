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
    fpsSampleWindow: 0.5,
    x: 12,
    y: 12,
    width: 300,
    padding: 10,
    lineHeight: 18,
  },
};

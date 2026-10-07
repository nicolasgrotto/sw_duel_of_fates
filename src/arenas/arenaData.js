export const arenas = {
  refinery: {
    floorHeight: 32,
    showWalls: false,
    layers: [
      {
        alpha: 0.25,
        rectangles: [
          [80, 0, 130, 600, 'wall'], [360, 0, 100, 600, 'wall'],
          [820, 0, 100, 600, 'wall'], [1070, 0, 130, 600, 'wall'],
          [0, 250, 1280, 20, 'wall'], [0, 430, 1280, 18, 'wall'],
        ],
      },
      {
        alpha: 0.16,
        rectangles: [[260, 0, 3, 580, 'floorEdge'], [1015, 0, 3, 580, 'floorEdge']],
        lines: [
          [0, 300, 1280, 300, 'floorEdge', 2],
          [0, 310, 1280, 310, 'wall', 8],
          [0, 440, 200, 300, 'wall', 8], [1280, 440, 1080, 300, 'wall', 8],
        ],
      },
      {
        alpha: 0.4,
        rectangles: [[0, 632, 1280, 6, 'wall']],
        lines: [
          [120, 632, 180, 720, 'wall', 12], [1160, 632, 1100, 720, 'wall', 12],
          [0, 620, 1280, 620, 'wall', 2],
          [200, 602, 200, 630, 'wall', 2], [400, 602, 400, 630, 'wall', 2],
          [600, 602, 600, 630, 'wall', 2], [800, 602, 800, 630, 'wall', 2],
          [1000, 602, 1000, 630, 'wall', 2],
        ],
      },
    ],
    ambient: {
      count: 16, kind: 'steam', color: 'textMuted', alpha: 0.06,
      radius: 24, riseSpeed: 18, driftSpeed: 8, life: 10,
    },
  },
  platform: {
    layers: [],
    ambient: {
      count: 20,
      color: 'textMuted',
      alpha: 0.08,
      radius: 1,
      riseSpeed: 12,
      driftSpeed: 4,
      life: 12,
    },
  },
};

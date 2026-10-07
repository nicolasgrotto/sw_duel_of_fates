export const arenas = {
  refinery: {
    floorHeight: 32,
    floorColor: 'floor',
    floorEdgeColor: 'floorEdge',
    showWalls: false,
    reflection: null,
    crystals: [],
    crystalGlow: null,
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
    ambient: [
      {
        kind: 'steam', layer: 'air', area: [0, 600], count: 16, color: 'textMuted', alpha: 0.06,
        radius: 24, riseSpeed: 18, driftSpeed: 8, life: 10,
      },
    ],
  },
  sanctuary: {
    floorHeight: 120,
    floorColor: 'arenaWater',
    floorEdgeColor: 'arenaWaterEdge',
    showWalls: false,
    reflection: { cover: 'arenaWater', coverAlpha: 0.72 },
    crystals: [],
    crystalGlow: null,
    layers: [
      { alpha: 1, glows: [[980, 150, 320, 'arenaMoon', 0.16]] },
      { alpha: 0.4, circles: [[980, 150, 46, 'arenaMoon']] },
      {
        alpha: 0.55,
        rectangles: [
          [96, 200, 60, 400, 'arenaStone'], [84, 186, 84, 16, 'arenaStone'],
          [270, 340, 54, 260, 'arenaStone'],
          [760, 170, 62, 430, 'arenaStone'], [748, 156, 86, 16, 'arenaStone'],
          [950, 300, 56, 300, 'arenaStone'],
          [1130, 220, 60, 380, 'arenaStone'], [1118, 206, 84, 16, 'arenaStone'],
        ],
        lines: [[126, 196, 250, 176, 'arenaStone', 20], [790, 166, 900, 150, 'arenaStone', 18]],
      },
      {
        alpha: 0.85,
        polygons: [
          ['arenaStone', 0, 600, 0, 560, 40, 548, 90, 566, 120, 600],
          ['arenaStone', 1160, 600, 1190, 570, 1240, 556, 1280, 566, 1280, 600],
          ['arenaStone', 300, 600, 318, 584, 352, 588, 360, 600],
        ],
      },
    ],
    ambient: [
      {
        kind: 'ripple', layer: 'floor', area: [614, 700], count: 6, color: 'arenaWaterEdge', alpha: 0.45,
        radius: 48, riseSpeed: 0, driftSpeed: 0, life: 3.5,
      },
      {
        kind: 'dust', layer: 'air', area: [0, 600], count: 24, color: 'arenaMoon', alpha: 0.25,
        radius: 1.2, riseSpeed: -10, driftSpeed: 6, life: 14,
      },
    ],
  },
  crystalMine: {
    floorHeight: 120,
    floorColor: 'arenaRock',
    floorEdgeColor: 'arenaCrystalEdge',
    showWalls: false,
    reflection: null,
    crystals: [
      [90, 300, 46], [150, 430, 34], [56, 520, 40],
      [1190, 280, 50], [1128, 440, 36], [1218, 532, 42],
      [336, 440, 26], [934, 410, 30],
      [640, 140, 22], [470, 168, 18], [822, 156, 20],
    ],
    crystalGlow: { range: 520, alpha: 0.5, radiusScale: 2.6 },
    layers: [
      {
        alpha: 1,
        polygons: [
          ['arenaRock', 0, 0, 1280, 0, 1280, 120, 1180, 140, 1120, 96, 1040, 170, 960, 100, 860, 130, 760, 80, 660, 150,
            600, 90, 480, 120, 400, 70, 320, 160, 240, 100, 140, 130, 60, 90, 0, 120],
          ['arenaRock', 0, 120, 150, 200, 112, 600, 0, 600],
          ['arenaRock', 1280, 120, 1146, 220, 1178, 600, 1280, 600],
        ],
      },
      {
        alpha: 0.7,
        polygons: [
          ['arenaRock', 296, 600, 336, 380, 380, 600],
          ['arenaRock', 884, 600, 934, 340, 984, 600],
        ],
      },
    ],
    ambient: [
      {
        kind: 'dust', layer: 'air', area: [0, 600], count: 18, color: 'arenaCrystalEdge', alpha: 0.55,
        radius: 1.4, riseSpeed: 6, driftSpeed: 2, life: 10,
      },
    ],
  },
  platform: {
    floorHeight: 152,
    floorColor: 'floor',
    floorEdgeColor: 'floorEdge',
    showWalls: true,
    reflection: null,
    crystals: [],
    crystalGlow: null,
    layers: [],
    ambient: [
      {
        kind: 'dust', layer: 'air', area: [0, 600], count: 20, color: 'textMuted', alpha: 0.08,
        radius: 1, riseSpeed: 12, driftSpeed: 4, life: 12,
      },
    ],
  },
};

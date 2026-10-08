export const arenas = {
  refinery: {
    floorHeight: 32,
    floorColor: 'floor',
    floorEdgeColor: 'floorEdge',
    showWalls: false,
    reflection: null,
    crystals: [],
    crystalShape: 'crystal',
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
        radius: 24, riseSpeed: 18, driftSpeed: 8, life: 10, streak: 0,
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
    crystalShape: 'crystal',
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
        radius: 48, riseSpeed: 0, driftSpeed: 0, life: 3.5, streak: 0,
      },
      {
        kind: 'dust', layer: 'air', area: [0, 600], count: 24, color: 'arenaMoon', alpha: 0.25,
        radius: 1.2, riseSpeed: -10, driftSpeed: 6, life: 14, streak: 0,
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
    crystalShape: 'crystal',
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
        radius: 1.4, riseSpeed: 6, driftSpeed: 2, life: 10, streak: 0,
      },
    ],
  },
  rooftop: {
    floorHeight: 120,
    floorColor: 'arenaRoof',
    floorEdgeColor: 'arenaNeon',
    showWalls: false,
    reflection: { cover: 'arenaRoof', coverAlpha: 0.82 },
    crystals: [],
    crystalShape: 'crystal',
    crystalGlow: null,
    layers: [
      {
        alpha: 1,
        rectangles: [
          [0, 140, 150, 460, 'arenaCity'], [170, 60, 120, 540, 'arenaCity'], [310, 220, 90, 380, 'arenaCity'],
          [860, 100, 140, 500, 'arenaCity'], [1020, 30, 110, 570, 'arenaCity'], [1150, 180, 130, 420, 'arenaCity'],
          [520, 300, 70, 300, 'arenaCity'], [700, 260, 80, 340, 'arenaCity'],
        ],
      },
      {
        alpha: 0.18,
        rectangles: [[190, 120, 80, 40, 'arenaNeon'], [1040, 90, 70, 110, 'arenaNeon'], [880, 160, 60, 30, 'arenaNeon']],
        glows: [[230, 140, 120, 'arenaNeon', 0.5], [1075, 145, 140, 'arenaNeon', 0.5], [910, 175, 90, 'arenaNeon', 0.4]],
      },
      {
        alpha: 0.6,
        lines: [
          [200, 130, 220, 150, 'arenaNeon', 3], [230, 128, 230, 152, 'arenaNeon', 3], [242, 150, 262, 130, 'arenaNeon', 3],
          [1052, 100, 1098, 100, 'arenaNeon', 3], [1075, 100, 1075, 190, 'arenaNeon', 3], [1052, 150, 1098, 150, 'arenaNeon', 3],
          [890, 166, 930, 184, 'arenaNeon', 2], [890, 184, 930, 166, 'arenaNeon', 2],
        ],
      },
      {
        alpha: 0.9,
        rectangles: [[0, 560, 90, 40, 'arenaCity'], [1180, 540, 100, 60, 'arenaCity']],
        lines: [[30, 560, 30, 470, 'arenaCity', 6], [1230, 540, 1230, 430, 'arenaCity', 6]],
      },
    ],
    ambient: [
      {
        kind: 'rain', layer: 'air', area: [-40, 600], count: 90, color: 'arenaRain', alpha: 0.35,
        radius: 1, riseSpeed: -900, driftSpeed: -160, life: 1.2, streak: 0.03,
      },
    ],
  },
  orbital: {
    floorHeight: 40,
    floorColor: 'floor',
    floorEdgeColor: 'arenaAtmosphere',
    showWalls: false,
    reflection: null,
    crystals: [],
    crystalShape: 'crystal',
    crystalGlow: null,
    layers: [
      {
        alpha: 0.8,
        circles: [
          [60, 40, 1.2, 'text'], [210, 90, 1, 'text'], [330, 30, 1.4, 'text'], [470, 120, 1, 'text'], [590, 60, 1.2, 'text'],
          [720, 20, 1, 'text'], [810, 140, 1.3, 'text'], [960, 50, 1, 'text'], [1100, 110, 1.4, 'text'], [1230, 40, 1, 'text'],
          [120, 200, 1, 'text'], [400, 240, 1.2, 'text'], [660, 210, 1, 'text'], [1180, 230, 1.2, 'text'], [880, 260, 1, 'text'],
          [30, 330, 1, 'text'], [250, 380, 1.1, 'text'], [560, 330, 1, 'text'], [1010, 350, 1.2, 'text'], [1260, 300, 1, 'text'],
        ],
      },
      { alpha: 1, glows: [[140, 130, 280, 'arenaSun', 0.22]] },
      { alpha: 0.95, circles: [[140, 130, 16, 'arenaSun']] },
      { alpha: 1, glows: [[880, 900, 760, 'arenaAtmosphere', 0.4]] },
      { alpha: 1, circles: [[880, 900, 600, 'arenaPlanet']] },
      {
        alpha: 0.35,
        arcs: [[640, 1500, 1350, 4.25, 5.17, 'arenaAtmosphere', 3], [640, 1500, 1330, 4.25, 5.17, 'floorEdge', 6]],
      },
      {
        alpha: 0.85,
        lines: [[0, 640, 1280, 640, 'wall', 4], [160, 640, 120, 720, 'wall', 10], [1120, 640, 1160, 720, 'wall', 10]],
      },
    ],
    ambient: [
      {
        kind: 'dust', layer: 'air', area: [0, 600], count: 14, color: 'arenaSun', alpha: 0.3,
        radius: 1, riseSpeed: 2, driftSpeed: 3, life: 16, streak: 0,
      },
    ],
  },
  forest: {
    floorHeight: 120,
    floorColor: 'arenaMoss',
    floorEdgeColor: 'arenaFungus',
    showWalls: false,
    reflection: null,
    crystals: [
      [140, 330, 20], [178, 420, 14], [96, 510, 18],
      [1130, 300, 22], [1176, 400, 15], [1100, 520, 17],
      [400, 470, 12], [880, 450, 13], [655, 590, 11], [300, 586, 10], [990, 588, 12],
    ],
    crystalShape: 'fungus',
    crystalGlow: { range: 460, alpha: 0.55, radiusScale: 4 },
    layers: [
      {
        alpha: 1,
        polygons: [
          ['arenaWood', 0, 0, 1280, 0, 1280, 90, 1150, 150, 1040, 110, 900, 160, 760, 100, 640, 140, 520, 100, 380, 160, 260, 110, 130, 150, 0, 110],
          ['arenaWood', 70, 600, 110, 140, 200, 140, 230, 600],
          ['arenaWood', 1060, 600, 1090, 120, 1180, 120, 1220, 600],
        ],
        lines: [[230, 600, 300, 560, 'arenaWood', 10], [1060, 600, 990, 566, 'arenaWood', 10]],
      },
      {
        alpha: 0.55,
        polygons: [
          ['arenaWood', 380, 600, 400, 260, 440, 260, 460, 600],
          ['arenaWood', 840, 600, 860, 230, 900, 230, 924, 600],
        ],
      },
    ],
    ambient: [
      {
        kind: 'dust', layer: 'air', area: [80, 600], count: 26, color: 'arenaSpore', alpha: 0.35,
        radius: 1.3, riseSpeed: 9, driftSpeed: 3, life: 12, streak: 0,
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
    crystalShape: 'crystal',
    crystalGlow: null,
    layers: [],
    ambient: [
      {
        kind: 'dust', layer: 'air', area: [0, 600], count: 20, color: 'textMuted', alpha: 0.08,
        radius: 1, riseSpeed: 12, driftSpeed: 4, life: 12, streak: 0,
      },
    ],
  },
};

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
  saltFlats: {
    floorHeight: 120,
    floorColor: 'arenaSalt',
    floorEdgeColor: 'arenaSaltEdge',
    showWalls: false,
    reflection: { cover: 'arenaSalt', coverAlpha: 0.86 },
    crystals: [],
    crystalShape: 'crystal',
    crystalGlow: null,
    floorDetail: {
      alpha: 0.8,
      lines: [
        [-40, 628, 300, 622, 'arenaSaltCrack', 2], [300, 622, 420, 640, 'arenaSaltCrack', 2], [420, 640, 760, 630, 'arenaSaltCrack', 2],
        [760, 630, 900, 646, 'arenaSaltCrack', 2], [900, 646, 1320, 634, 'arenaSaltCrack', 2],
        [-40, 676, 220, 690, 'arenaSaltCrack', 2], [220, 690, 560, 672, 'arenaSaltCrack', 2], [560, 672, 980, 694, 'arenaSaltCrack', 2],
        [980, 694, 1320, 680, 'arenaSaltCrack', 2],
        [180, 602, 140, 720, 'arenaSaltCrack', 2], [520, 602, 560, 720, 'arenaSaltCrack', 2], [860, 602, 800, 720, 'arenaSaltCrack', 2],
        [1160, 602, 1200, 720, 'arenaSaltCrack', 2],
      ],
    },
    layers: [
      {
        alpha: 0.035,
        rectangles: [
          [-40, 220, 1360, 310, 'arenaDusk'], [-40, 300, 1360, 230, 'arenaDusk'], [-40, 370, 1360, 160, 'arenaDusk'],
          [-40, 420, 1360, 110, 'arenaDusk'], [-40, 456, 1360, 74, 'arenaDusk'], [-40, 482, 1360, 48, 'arenaDusk'],
          [-40, 500, 1360, 30, 'arenaDusk'], [-40, 514, 1360, 16, 'arenaDusk'],
        ],
      },
      { alpha: 1, glows: [[820, 530, 300, 'arenaDuskSun', 0.2]] },
      { alpha: 0.3, circles: [[820, 530, 58, 'arenaDuskSun']] },
      {
        alpha: 1,
        rectangles: [[-40, 530, 1360, 70, 'arenaSalt']],
        polygons: [
          ['arenaMesa', -40, 530, -40, 470, 60, 466, 82, 478, 190, 476, 222, 530],
          ['arenaMesa', 420, 530, 442, 508, 498, 505, 516, 530],
          ['arenaMesa', 960, 530, 990, 490, 1060, 485, 1082, 494, 1180, 491, 1212, 506, 1320, 500, 1320, 530],
        ],
      },
      {
        alpha: 0.35,
        lines: [[-40, 530, 1320, 530, 'arenaSaltEdge', 1], [-40, 566, 1320, 562, 'arenaSaltCrack', 2]],
      },
    ],
    ambient: [
      {
        kind: 'shimmer', layer: 'air', area: [506, 592], count: 14, color: 'arenaHaze', alpha: 0.12,
        radius: 26, riseSpeed: 0, driftSpeed: 6, life: 3, streak: 0,
      },
      {
        kind: 'dust', layer: 'air', area: [200, 600], count: 16, color: 'arenaSaltDust', alpha: 0.18,
        radius: 1, riseSpeed: 2, driftSpeed: -14, life: 12, streak: 0, wrapMargin: 20,
      },
    ],
    impactDust: {
      color: 'arenaSaltDust', count: 7, reducedScale: 0.5, spread: 14, speed: [40, 150], lift: [40, 120], life: [0.35, 0.7], size: [1.5, 3],
    },
  },
  skyDeck: {
    floorHeight: 120,
    floorColor: 'arenaDeck',
    floorEdgeColor: 'arenaDeckEdge',
    showWalls: false,
    reflection: null,
    crystals: [],
    crystalShape: 'crystal',
    crystalGlow: null,
    wind: { direction: -1, sway: 6, flutter: 2.5, frequency: 9, maxSway: 14 },
    floorDetail: {
      alpha: 1,
      lines: [
        [-40, 616, 1320, 616, 'arenaHull', 2],
        [160, 600, 160, 720, 'arenaHull', 2], [480, 600, 480, 720, 'arenaHull', 2],
        [800, 600, 800, 720, 'arenaHull', 2], [1120, 600, 1120, 720, 'arenaHull', 2],
      ],
    },
    layers: [
      { alpha: 0.6, rectangles: [[-40, -40, 1360, 640, 'arenaNightSky']] },
      { alpha: 0.5, rectangles: [[-40, 300, 1360, 300, 'arenaNightSky']] },
      { alpha: 1, glows: [[320, 170, 220, 'arenaMoon', 0.1]] },
      {
        alpha: 0.35,
        polygons: [
          ['arenaCloud', -40, 600, -40, 440, 80, 425, 200, 438, 320, 420, 460, 436, 600, 418, 760, 434, 900, 420, 1040, 438,
            1180, 422, 1320, 436, 1320, 600],
        ],
      },
      {
        alpha: 0.6,
        polygons: [
          ['arenaCloud', -40, 600, -40, 500, 120, 488, 260, 505, 420, 486, 580, 502, 740, 484, 900, 500, 1060, 486, 1220, 502,
            1320, 490, 1320, 600],
        ],
      },
      {
        alpha: 1,
        rectangles: [[120, 120, 14, 480, 'arenaHull']],
        polygons: [
          ['arenaHull', 1090, 600, 1110, 340, 1150, 300, 1320, 300, 1320, 600],
          ['arenaHull', 1150, 300, 1166, 256, 1270, 256, 1282, 300],
        ],
        lines: [
          [80, 190, 176, 190, 'arenaHull', 4], [96, 150, 160, 150, 'arenaHull', 3], [127, 120, 127, 60, 'arenaHull', 2],
          [127, 130, 270, 560, 'arenaHull', 2], [127, 130, -10, 560, 'arenaHull', 2],
          [1190, 250, 1190, 200, 'arenaHull', 2], [1240, 250, 1240, 228, 'arenaHull', 2],
        ],
      },
      {
        alpha: 0.35,
        lines: [
          [1124, 330, 1300, 330, 'arenaDeckEdge', 3], [1172, 274, 1262, 274, 'arenaDeckEdge', 2],
          [1090, 600, 1110, 340, 'arenaDeckEdge', 1], [1110, 340, 1150, 300, 'arenaDeckEdge', 1], [1150, 300, 1166, 256, 'arenaDeckEdge', 1],
          [1110, 440, 1320, 440, 'arenaHull', 2],
        ],
      },
      {
        alpha: 0.9,
        lines: [
          [-40, 560, 1080, 560, 'arenaHull', 3], [-40, 580, 1080, 580, 'arenaHull', 2],
          [40, 560, 40, 600, 'arenaHull', 3], [200, 560, 200, 600, 'arenaHull', 3], [360, 560, 360, 600, 'arenaHull', 3],
          [520, 560, 520, 600, 'arenaHull', 3], [680, 560, 680, 600, 'arenaHull', 3], [840, 560, 840, 600, 'arenaHull', 3],
          [1000, 560, 1000, 600, 'arenaHull', 3],
        ],
      },
      { alpha: 1, glows: [[127, 60, 40, 'arenaBeacon', 0.25], [1240, 226, 36, 'arenaBeacon', 0.25]] },
      { alpha: 0.8, circles: [[127, 60, 2.5, 'arenaBeacon'], [1240, 226, 2.5, 'arenaBeacon']] },
    ],
    ambient: [
      {
        kind: 'cloud', layer: 'air', area: [380, 600], count: 6, color: 'arenaCloud', alpha: 0.5,
        radius: 120, riseSpeed: 0, driftSpeed: -380, life: 9, streak: 0, wrapMargin: 160,
      },
      {
        kind: 'gust', layer: 'air', area: [80, 590], count: 14, color: 'arenaWind', alpha: 0.22,
        radius: 1, riseSpeed: 0, driftSpeed: -1300, life: 1.4, streak: 0.05, wrapMargin: 80,
      },
    ],
  },
  snowPeak: {
    floorHeight: 120,
    floorColor: 'arenaSnowFloor',
    floorEdgeColor: 'arenaSnowEdge',
    showWalls: false,
    reflection: null,
    crystals: [],
    crystalShape: 'crystal',
    crystalGlow: null,
    layers: [
      { alpha: 1, glows: [[360, 140, 320, 'arenaMist', 0.08], [900, 110, 360, 'arenaMist', 0.1], [640, 330, 420, 'arenaMist', 0.06]] },
      {
        alpha: 0.45,
        polygons: [
          ['arenaPeak', -40, 600, -40, 330, 90, 250, 210, 330, 330, 210, 470, 320, 560, 280, 700, 170, 860, 300, 960, 240,
            1090, 320, 1200, 230, 1320, 300, 1320, 600],
        ],
      },
      {
        alpha: 0.6,
        polygons: [
          ['arenaPeak', -40, 600, -40, 420, 140, 360, 260, 430, 400, 380, 520, 450, 640, 410, 780, 460, 900, 390, 1040, 440,
            1180, 370, 1320, 430, 1320, 600],
        ],
      },
      {
        alpha: 1,
        rectangles: [
          [70, 250, 70, 350, 'arenaMonastery'], [-40, 380, 260, 220, 'arenaMonastery'], [160, 470, 200, 130, 'arenaMonastery'],
          [1140, 230, 70, 370, 'arenaMonastery'], [1060, 390, 280, 210, 'arenaMonastery'], [930, 480, 180, 120, 'arenaMonastery'],
        ],
        polygons: [
          ['arenaMonastery', 52, 252, 105, 200, 158, 252],
          ['arenaMonastery', -50, 382, 100, 340, 240, 340, 280, 382],
          ['arenaMonastery', 146, 472, 200, 440, 320, 440, 374, 472],
          ['arenaMonastery', 1122, 232, 1175, 180, 1228, 232],
          ['arenaMonastery', 1030, 392, 1090, 350, 1240, 350, 1330, 392],
          ['arenaMonastery', 916, 482, 970, 452, 1070, 452, 1124, 482],
        ],
      },
      {
        alpha: 0.3,
        lines: [
          [52, 252, 105, 200, 'arenaSnowEdge', 2], [105, 200, 158, 252, 'arenaSnowEdge', 2], [100, 340, 240, 340, 'arenaSnowEdge', 3],
          [200, 440, 320, 440, 'arenaSnowEdge', 3], [1122, 232, 1175, 180, 'arenaSnowEdge', 2], [1175, 180, 1228, 232, 'arenaSnowEdge', 2],
          [1090, 350, 1240, 350, 'arenaSnowEdge', 3], [970, 452, 1070, 452, 'arenaSnowEdge', 3],
        ],
      },
      { alpha: 0.35, rectangles: [[98, 300, 8, 14, 'arenaBeacon'], [1168, 282, 8, 14, 'arenaBeacon']] },
      {
        alpha: 1,
        polygons: [
          ['arenaSnowFloor', -40, 600, -40, 572, 40, 566, 120, 586, 170, 600],
          ['arenaSnowFloor', 1110, 600, 1170, 584, 1250, 568, 1320, 574, 1320, 600],
        ],
      },
    ],
    ambient: [
      {
        kind: 'dust', layer: 'air', area: [-20, 600], count: 70, color: 'arenaSnow', alpha: 0.45,
        radius: 1.1, riseSpeed: -80, driftSpeed: -260, life: 7, streak: 0, wrapMargin: 30,
      },
      {
        kind: 'dust', layer: 'air', area: [-20, 600], count: 14, color: 'arenaSnow', alpha: 0.55,
        radius: 2.2, riseSpeed: -50, driftSpeed: -140, life: 12, streak: 0, wrapMargin: 30,
      },
    ],
  },
  eclipseCitadel: {
    floorHeight: 120,
    floorColor: 'arenaConcrete',
    floorEdgeColor: 'arenaConcreteEdge',
    showWalls: false,
    reflection: null,
    crystals: [],
    crystalShape: 'crystal',
    crystalGlow: null,
    shade: { color: 'arenaEclipseShade', alpha: 0.36 },
    floorDetail: {
      alpha: 0.5,
      lines: [
        [-40, 640, 1320, 640, 'arenaConcreteEdge', 2],
        [160, 600, 120, 720, 'arenaConcreteEdge', 2], [480, 600, 470, 720, 'arenaConcreteEdge', 2],
        [800, 600, 810, 720, 'arenaConcreteEdge', 2], [1120, 600, 1160, 720, 'arenaConcreteEdge', 2],
      ],
    },
    layers: [
      { alpha: 1, rectangles: [[-40, -40, 1360, 640, 'arenaConcrete'], [400, 40, 480, 520, 'arenaEclipseSky']] },
      { alpha: 1, glows: [[640, 230, 240, 'arenaCorona', 0.3]] },
      { alpha: 0.5, arcs: [[640, 230, 84, 0, 6.2832, 'arenaCorona', 2]] },
      { alpha: 1, circles: [[640, 230, 80, 'arenaEclipse']] },
      {
        alpha: 1,
        rectangles: [
          [552, 40, 10, 520, 'arenaConcrete'], [718, 40, 10, 520, 'arenaConcrete'],
          [400, 200, 480, 10, 'arenaConcrete'], [400, 380, 480, 10, 'arenaConcrete'],
          [300, -40, 70, 640, 'arenaConcrete'], [910, -40, 70, 640, 'arenaConcrete'],
        ],
      },
      {
        alpha: 0.6,
        lines: [
          [400, 40, 880, 40, 'arenaConcreteEdge', 3], [400, 40, 400, 560, 'arenaConcreteEdge', 3], [880, 40, 880, 560, 'arenaConcreteEdge', 3],
          [380, 560, 900, 560, 'arenaConcreteEdge', 4],
          [300, -40, 300, 600, 'arenaConcreteEdge', 2], [370, -40, 370, 600, 'arenaConcreteEdge', 2],
          [910, -40, 910, 600, 'arenaConcreteEdge', 2], [980, -40, 980, 600, 'arenaConcreteEdge', 2],
        ],
      },
      {
        alpha: 0.25,
        lines: [
          [-40, 140, 300, 140, 'arenaConcreteEdge', 2], [-40, 300, 300, 300, 'arenaConcreteEdge', 2], [-40, 460, 300, 460, 'arenaConcreteEdge', 2],
          [980, 140, 1320, 140, 'arenaConcreteEdge', 2], [980, 300, 1320, 300, 'arenaConcreteEdge', 2], [980, 460, 1320, 460, 'arenaConcreteEdge', 2],
          [150, -40, 150, 600, 'arenaConcreteEdge', 2], [1130, -40, 1130, 600, 'arenaConcreteEdge', 2],
        ],
      },
    ],
    ambient: [
      {
        kind: 'dust', layer: 'air', area: [0, 600], count: 18, color: 'arenaCorona', alpha: 0.18,
        radius: 1.1, riseSpeed: 3, driftSpeed: 2, life: 14, streak: 0,
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

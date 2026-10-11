export const proportions = {
  legLength: 0.45,
  torsoLength: 0.33,
  headRadius: 0.075,
  neckGap: 0.025,
  stanceWidth: 0.11,
  kneeBend: 0.05,
  legWidth: 0.06,
  armWidth: 0.055,
  handForward: 0.13,
  handHeight: 0.08,
  handRadius: 0.03,
  shoulderWidth: 0.075,
  tunicLength: 0.2,
  tunicFlare: 0.1,
  hiltLength: 0.09,
  freeArmLength: 0.28,
};

export const animation = {
  breathPeriod: 3.2,
  breathAmplitude: 1.5,
  saberSwayDegrees: 2.5,
  strideLength: 34,
  stepLength: 0.09,
  stepLift: 0.05,
  walkBob: 2.5,
  walkBreathDamping: 0.5,
  clothDrag: 0.03,
  maxClothSway: 10,
  walkBlendRate: 10,
  airBlendRate: 14,
  airLegTuck: 0.12,
  airFootPull: 0.4,
  exhaustedBreathScale: 2,
  exhaustedDroopDegrees: 6,
};

export const combatPoses = {
  attacks: {
    spin: {
      windupDegrees: 150,
      strikeDegrees: -200,
      windupLean: 5,
      strikeLean: -4,
      windupLift: 0.06,
      strikeReach: 0.04,
    },
    saberThrow: {
      windupDegrees: -150,
      strikeDegrees: 10,
      windupLean: -8,
      strikeLean: 14,
      windupLift: 0.12,
      strikeReach: 0.24,
    },
    dashSlash: {
      windupDegrees: 35,
      strikeDegrees: -80,
      windupLean: 14,
      strikeLean: 20,
      windupLift: 0.02,
      strikeReach: 0.2,
    },
    light: {
      windupDegrees: -115,
      strikeDegrees: 30,
      windupLean: -3,
      strikeLean: 6,
      windupLift: 0.08,
      strikeReach: 0.08,
    },
    heavy: {
      windupDegrees: -160,
      strikeDegrees: 55,
      windupLean: -6,
      strikeLean: 12,
      windupLift: 0.14,
      strikeReach: 0.12,
    },
    riposte: {
      windupDegrees: -70,
      strikeDegrees: 40,
      windupLean: -2,
      strikeLean: 14,
      windupLift: 0.04,
      strikeReach: 0.15,
    },
    lightReverse: {
      windupDegrees: 60,
      strikeDegrees: -70,
      windupLean: 4,
      strikeLean: 8,
      windupLift: 0.02,
      strikeReach: 0.1,
    },
    hammer: {
      windupDegrees: -175,
      strikeDegrees: 70,
      windupLean: -10,
      strikeLean: 16,
      windupLift: 0.18,
      strikeReach: 0.1,
    },
    waitingStance: {
      windupDegrees: -90,
      strikeDegrees: -90,
      windupLean: 0,
      strikeLean: 0,
      windupLift: 0.16,
      strikeReach: 0,
    },
    thrust: {
      windupDegrees: -10,
      strikeDegrees: 0,
      windupLean: -6,
      strikeLean: 14,
      windupLift: 0.02,
      strikeReach: 0.22,
    },
    sweep: {
      windupDegrees: -130,
      strikeDegrees: 10,
      windupLean: -8,
      strikeLean: 18,
      windupLift: 0.04,
      strikeReach: 0.3,
    },
    stance: {
      windupDegrees: -20,
      strikeDegrees: -20,
      windupLean: -5,
      strikeLean: -5,
      windupLift: 0.12,
      strikeReach: 0.04,
    },
    impetus: {
      windupDegrees: -150,
      strikeDegrees: 40,
      windupLean: 8,
      strikeLean: 18,
      windupLift: 0.06,
      strikeReach: 0.16,
    },
    shove: {
      windupDegrees: -40,
      strikeDegrees: -75,
      windupLean: -6,
      strikeLean: 16,
      windupLift: 0.02,
      strikeReach: 0.12,
    },
  },
  block: {
    bladeDegrees: -95,
    reach: 0.05,
    lift: 0.06,
    crouch: 6,
  },
  evade: { releaseTime: 0.1 },
  powers: {
    cast: { bladeDegrees: 115, lean: 12, crouch: 4, reach: 0.06, lift: 0, tremble: 0, trembleSpeed: 0 },
    channel: { bladeDegrees: 125, lean: 8, crouch: 8, reach: 0.04, lift: 0, tremble: 2.5, trembleSpeed: 9 },
    barrier: { bladeDegrees: -100, lean: -2, crouch: 12, reach: 0, lift: 0.04, tremble: 0, trembleSpeed: 0 },
  },
  dodge: {
    lean: 14,
    crouch: 14,
  },
  hit: {
    lean: -14,
    bladeDropDegrees: 35,
  },
  staggered: {
    lean: -12,
    crouch: 4,
    bladeDegrees: -150,
  },
  choked: {
    lift: 0.1,
    riseTime: 0.18,
    lean: -5,
    bladeDegrees: 100,
    footSpread: 0.025,
    neckDrop: 1.4,
    neckForward: 0.5,
    freeNeckForward: -0.2,
  },
  stunned: {
    lean: 18,
    crouch: 10,
    bladeDegrees: 70,
    swayDegrees: 6,
    swaySpeed: 3,
  },
  keyframeDefaults: {
    leanDegrees: 0,
    crouch: 0,
    reach: 0,
    lift: 0,
    step: 0,
    slide: 0,
    hip: 0,
    offHand: 0,
    offHandDegrees: 70,
    turn: 0,
    minTurnScale: 0.08,
    chainBlend: 0.06,
  },
  bladeLock: {
    entryDuration: 0.08,
    pressPushDuration: 0.08,
    tremorRates: [31, 47],
    contactJitter: 0.6,
  },
  dead: {
    fallDuration: 0.45,
    fallDegrees: 88,
    lift: 0.2,
  },
};

const STARTUP = 'startup';
const ACTIVE = 'active';
const RECOVERY = 'recovery';

const guardianKeyframes = {
  light: [
    { phase: STARTUP, at: 1, ease: 'out', blade: -95, lean: -2, lift: 0.06, slide: 0.01 },
    { phase: ACTIVE, at: 0.5, ease: 'in', blade: -35, lean: 2, reach: 0.06, lift: 0.03, step: 0.02 },
    { phase: ACTIVE, at: 1, ease: 'outQuad', blade: 25, lean: 5, reach: 0.1, step: 0.03, hip: 0.015 },
    { phase: RECOVERY, at: 0.3, ease: 'outQuad', blade: 28, lean: 5, reach: 0.09, step: 0.03, hip: 0.015 },
  ],
  heavy: [
    { phase: STARTUP, at: 0.6, ease: 'out', blade: -120, lean: -4, crouch: 6, lift: 0.1, slide: 0.02, hip: -0.01 },
    { phase: STARTUP, at: 1, ease: 'inOut', blade: -150, lean: -6, crouch: 8, lift: 0.13, slide: 0.03, hip: -0.02 },
    { phase: ACTIVE, at: 0.5, ease: 'in', blade: -40, lean: 4, crouch: 8, reach: 0.08, lift: 0.06, step: 0.04, hip: 0.01 },
    { phase: ACTIVE, at: 1, ease: 'outQuad', blade: 48, lean: 10, crouch: 10, reach: 0.13, step: 0.07, slide: -0.01, hip: 0.03 },
    { phase: RECOVERY, at: 0.25, ease: 'outQuad', blade: 55, lean: 11, crouch: 10, reach: 0.12, step: 0.07, slide: -0.01, hip: 0.03 },
  ],
  riposte: [
    { phase: STARTUP, at: 1, ease: 'out', blade: -55, lean: -1, lift: 0.03, slide: 0.01 },
    { phase: ACTIVE, at: 0.5, ease: 'in', blade: -10, lean: 7, reach: 0.1, step: 0.04, hip: 0.015 },
    { phase: ACTIVE, at: 1, ease: 'outQuad', blade: 30, lean: 12, reach: 0.17, step: 0.06, hip: 0.03 },
    { phase: RECOVERY, at: 0.3, ease: 'outQuad', blade: 34, lean: 12, reach: 0.15, step: 0.06, hip: 0.03 },
  ],
  shove: [
    { phase: STARTUP, at: 1, ease: 'out', blade: -40, lean: -6, lift: 0.02, slide: 0.02, hip: -0.01, offHand: 0.6, offHandDegrees: 40 },
    { phase: ACTIVE, at: 1, ease: 'outQuad', blade: -75, lean: 16, reach: 0.12, step: 0.06, hip: 0.03, offHand: 1, offHandDegrees: 5 },
    { phase: RECOVERY, at: 0.4, ease: 'inOut', blade: -70, lean: 12, reach: 0.08, step: 0.05, hip: 0.02, offHand: 0.7, offHandDegrees: 20 },
  ],
};

export const techniqueKeyframes = {
  spin: [
    { phase: STARTUP, at: 0.4, ease: 'out', blade: -120, lean: -2, crouch: 4, lift: 0.04, slide: 0.01 },
    { phase: STARTUP, at: 1, ease: 'inOut', blade: -165, lean: -5, crouch: 8, lift: 0.07, slide: 0.03, hip: -0.015 },
    { phase: ACTIVE, at: 0.5, ease: 'linear', blade: 15, lean: 3, crouch: 10, reach: 0.06, lift: 0.03, step: 0.02, turn: 0.5 },
    { phase: ACTIVE, at: 1, ease: 'linear', blade: 195, lean: 4, crouch: 10, reach: 0.04, step: 0.03, turn: 1 },
    { phase: RECOVERY, at: 0.35, ease: 'outQuad', blade: 215, lean: 2, crouch: 8, reach: 0.02, step: 0.02, turn: 1 },
    { phase: RECOVERY, at: 1, ease: 'inOut', twirl: 360, turn: 1 },
  ],
  dashSlash: {
    rising: [
      { phase: STARTUP, at: 0.6, ease: 'out', blade: 120, lean: 10, crouch: 16, slide: 0.03, hip: -0.01 },
      { phase: STARTUP, at: 1, ease: 'inOut', blade: 140, lean: 16, crouch: 20, slide: 0.04, hip: -0.015, step: 0.02 },
      { phase: ACTIVE, at: 0.5, ease: 'in', blade: 45, lean: 20, crouch: 14, reach: 0.12, step: 0.06, hip: 0.02 },
      { phase: ACTIVE, at: 1, ease: 'outQuad', blade: -75, lean: 18, crouch: 6, reach: 0.2, lift: 0.04, step: 0.08, hip: 0.03 },
      { phase: RECOVERY, at: 0.3, ease: 'outQuad', blade: -85, lean: 16, crouch: 6, reach: 0.18, lift: 0.04, step: 0.08, hip: 0.03 },
    ],
    falling: [
      { phase: STARTUP, at: 0.6, ease: 'out', blade: -120, lean: 4, crouch: 6, lift: 0.1, slide: 0.03 },
      { phase: STARTUP, at: 1, ease: 'inOut', blade: -150, lean: 8, crouch: 8, lift: 0.14, slide: 0.04, hip: -0.01 },
      { phase: ACTIVE, at: 0.5, ease: 'in', blade: -50, lean: 16, crouch: 10, reach: 0.12, lift: 0.07, step: 0.06, hip: 0.02 },
      { phase: ACTIVE, at: 1, ease: 'outQuad', blade: 60, lean: 20, crouch: 14, reach: 0.2, step: 0.08, hip: 0.03 },
      { phase: RECOVERY, at: 0.3, ease: 'outQuad', blade: 68, lean: 18, crouch: 14, reach: 0.18, step: 0.08, hip: 0.03 },
    ],
  },
  counterRiposte: [
    { phase: STARTUP, at: 0.35, ease: 'out', blade: -115, lean: -6, lift: 0.08, slide: 0.05, hip: -0.02 },
    { phase: STARTUP, at: 1, ease: 'inOut', blade: -15, lean: -3, lift: 0.03, reach: -0.02, slide: 0.05, hip: -0.015 },
    { phase: ACTIVE, at: 1, ease: 'outQuad', blade: -3, lean: 12, reach: 0.21, step: 0.04, slide: 0.02, hip: 0.025 },
    { phase: RECOVERY, at: 0.3, ease: 'outQuad', blade: 2, lean: 11, reach: 0.19, step: 0.04, slide: 0.02, hip: 0.025 },
  ],
  saberThrow: [
    { phase: STARTUP, at: 0.7, ease: 'out', blade: -150, lean: -8, lift: 0.12, reach: -0.04, slide: 0.04, hip: -0.02 },
    { phase: STARTUP, at: 1, ease: 'inOut', blade: -165, lean: -10, lift: 0.13, reach: -0.05, slide: 0.05, hip: -0.025 },
    { phase: ACTIVE, at: 1, ease: 'outQuad', blade: 10, lean: 14, lift: 0.02, reach: 0.24, step: 0.07, hip: 0.03 },
    { phase: RECOVERY, at: 0.6, ease: 'inOut', blade: 5, lean: 10, reach: 0.2, step: 0.06, hip: 0.02 },
  ],
};

const waspLight = [
  { phase: STARTUP, at: 1, ease: 'out', blade: -100, lean: -1, lift: 0.07, slide: 0.015, hip: -0.01 },
  { phase: ACTIVE, at: 0.5, ease: 'in', blade: -30, lean: 6, reach: 0.06, lift: 0.03, step: 0.03, hip: 0.01 },
  { phase: ACTIVE, at: 1, ease: 'outQuad', blade: 40, lean: 11, reach: 0.1, step: 0.05, hip: 0.025 },
  { phase: RECOVERY, at: 0.35, ease: 'outQuad', blade: 52, lean: 12, reach: 0.09, step: 0.05, hip: 0.025 },
];

const waspKeyframes = {
  light: waspLight,
  lightReverse: [
    { phase: STARTUP, at: 1, ease: 'out', blade: 75, lean: 6, lift: 0.02, slide: 0.015, hip: -0.005 },
    { phase: ACTIVE, at: 0.5, ease: 'in', blade: -5, lean: 9, reach: 0.07, lift: 0.04, step: 0.03, hip: 0.01 },
    { phase: ACTIVE, at: 1, ease: 'outQuad', blade: -85, lean: 12, reach: 0.11, lift: 0.04, step: 0.05, hip: 0.025 },
    { phase: RECOVERY, at: 0.35, ease: 'outQuad', blade: -97, lean: 12, reach: 0.1, lift: 0.04, step: 0.05, hip: 0.025 },
  ],
  light5: [
    ...waspLight.slice(0, 2),
    { phase: ACTIVE, at: 1, ease: 'outQuad', blade: 40, lean: 14, reach: 0.13, step: 0.07, hip: 0.035 },
    { phase: RECOVERY, at: 0.3, ease: 'outQuad', blade: 55, lean: 14, reach: 0.12, step: 0.07, hip: 0.035 },
    { phase: RECOVERY, at: 1, ease: 'inOut', twirl: -360 },
  ],
  heavy: [
    { phase: STARTUP, at: 0.5, ease: 'out', blade: -120, lean: -2, crouch: 4, lift: 0.08, slide: 0.03, hip: -0.02 },
    { phase: STARTUP, at: 1, ease: 'inOut', blade: -158, lean: -5, crouch: 6, lift: 0.13, slide: 0.04, hip: -0.025 },
    { phase: ACTIVE, at: 0.5, ease: 'in', blade: -50, lean: 8, crouch: 6, reach: 0.09, lift: 0.06, step: 0.06, hip: 0.015 },
    { phase: ACTIVE, at: 1, ease: 'outQuad', blade: 62, lean: 16, crouch: 8, reach: 0.15, step: 0.1, slide: -0.02, hip: 0.04 },
    { phase: RECOVERY, at: 0.3, ease: 'outQuad', blade: 80, lean: 17, crouch: 8, reach: 0.14, step: 0.1, slide: -0.02, hip: 0.04 },
    { phase: RECOVERY, at: 1, ease: 'inOut', twirl: 360 },
  ],
  riposte: [
    { phase: STARTUP, at: 1, ease: 'out', blade: -60, lean: 0, lift: 0.04, slide: 0.015 },
    { phase: ACTIVE, at: 0.5, ease: 'in', blade: -10, lean: 9, reach: 0.1, step: 0.05, hip: 0.02 },
    { phase: ACTIVE, at: 1, ease: 'outQuad', blade: 42, lean: 15, reach: 0.17, step: 0.08, hip: 0.035 },
    { phase: RECOVERY, at: 0.35, ease: 'outQuad', blade: 55, lean: 15, reach: 0.15, step: 0.08, hip: 0.035 },
  ],
  shove: [
    { phase: STARTUP, at: 1, ease: 'out', blade: -40, lean: -6, lift: 0.02, slide: 0.03, hip: -0.015 },
    { phase: ACTIVE, at: 1, ease: 'outQuad', blade: -75, lean: 18, reach: 0.12, step: 0.08, hip: 0.04 },
    { phase: RECOVERY, at: 0.4, ease: 'inOut', blade: -70, lean: 13, reach: 0.08, step: 0.06, hip: 0.025 },
  ],
};

export const motionStyles = {
  standard: {
    stance: { crouch: 0, lean: 0, guardOffset: 0, breathScale: 1, swayScale: 1, bobScale: 1 },
    followThrough: 0,
    dashSlash: 'rising',
    block: {},
    evade: [
      { lean: -22, crouch: 8, bladeOffset: 0 },
      { lean: -12, crouch: 16, bladeOffset: 18 },
      { lean: -30, crouch: 4, bladeOffset: -12 },
    ],
    lock: { lean: 9, crouch: 10, reach: -0.07, lift: 0.12, advantageLean: 9, advantageCrouch: 8, tremor: [1, 2.5], pressPush: 0.03 },
    lockVictory: { fromDegrees: -55, sweepDegrees: 35, lean: 10, twirl: 0, sweepShare: 0.4 },
    attacks: {},
    attackTypes: {},
  },
  guardian: {
    stance: { crouch: 4, lean: -1, guardOffset: -4, breathScale: 0.7, swayScale: 0.4, bobScale: 0.8 },
    followThrough: 0.03,
    dashSlash: 'falling',
    block: { bladeDegrees: -92, reach: 0.06, crouch: 9 },
    evade: [
      { lean: -16, crouch: 10, bladeOffset: 0 },
      { lean: -10, crouch: 14, bladeOffset: 8 },
      { lean: -20, crouch: 8, bladeOffset: -6 },
    ],
    lock: { lean: 7, crouch: 14, reach: -0.06, lift: 0.11, advantageLean: 7, advantageCrouch: 7, tremor: [0.7, 1.8], pressPush: 0.02 },
    lockVictory: { fromDegrees: -55, sweepDegrees: 25, lean: 6, twirl: 0, sweepShare: 0.45 },
    keyframes: guardianKeyframes,
    attacks: {
      light: { windupDegrees: -95, strikeDegrees: 25, windupLean: -2, strikeLean: 5, windupLift: 0.06, strikeReach: 0.1 },
      heavy: { windupDegrees: -150, strikeDegrees: 48, windupLean: -5, strikeLean: 10, windupLift: 0.12, strikeReach: 0.13 },
      riposte: { windupDegrees: -55, strikeDegrees: 30, windupLean: -1, strikeLean: 12, windupLift: 0.03, strikeReach: 0.17 },
    },
    attackTypes: {},
  },
  wasp: {
    stance: { crouch: 2, lean: 2, guardOffset: 6, breathScale: 1.25, swayScale: 1.6, bobScale: 1.3 },
    followThrough: 0.12,
    block: {},
    evade: [
      { lean: -26, crouch: 10, bladeOffset: 10 },
      { lean: -8, crouch: 22, bladeOffset: -20 },
      { lean: -34, crouch: 6, bladeOffset: 24 },
    ],
    lock: { lean: 13, crouch: 8, reach: -0.08, lift: 0.13, advantageLean: 11, advantageCrouch: 8, tremor: [1.3, 3], pressPush: 0.04 },
    lockVictory: { fromDegrees: -55, sweepDegrees: 55, lean: 15, twirl: 360, sweepShare: 0.35 },
    keyframes: waspKeyframes,
    attacks: {
      light: { windupDegrees: -100, strikeDegrees: 40, windupLean: -1, strikeLean: 11, windupLift: 0.07, strikeReach: 0.1 },
      lightReverse: { windupDegrees: 75, strikeDegrees: -85, windupLean: 6, strikeLean: 12, windupLift: 0.02, strikeReach: 0.11 },
      heavy: { windupDegrees: -155, strikeDegrees: 60, windupLean: -4, strikeLean: 15, windupLift: 0.12, strikeReach: 0.14, recoveryTwirl: 360 },
    },
    attackTypes: {
      light5: { from: 'light', strikeLean: 14, strikeReach: 0.13, recoveryTwirl: -360 },
    },
  },
};

export const groundShadow = {
  radiusXRatio: 0.8,
  radiusY: 6,
  fadeHeight: 300,
  minScale: 0.4,
};

export const saberStyle = {
  hiltWidth: 4,
  outerGlowWidth: 16,
  outerGlowAlpha: 0.15,
  glowWidth: 7,
  glowAlpha: 0.55,
  coreWidth: 3,
  floorLightAlpha: 0.12,
  floorLightRadiusX: 70,
  floorLightRadiusY: 10,
  bodyLightRadius: 120,
  bodyLightAlpha: 0.14,
  flareWidth: 22,
  flareAlpha: 0.5,
  staggerFlickerSpeed: 22,
  staggerFlickerMin: 0.35,
};

export const afterimage = {
  evade: { interval: 0.05, duration: 0.12, alpha: 0.18 },
  count: 3,
  interval: 0.05,
  duration: 0.25,
  alpha: 0.3,
};

export const saberTrail = {
  maxSamples: 8,
  duration: 0.12,
  alpha: 0.35,
};

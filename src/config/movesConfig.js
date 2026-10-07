export const movesByCharacter = {
  guardian: {
    light: { attack: 'light', type: 'light', pose: 'light', cancelsInto: ['light2'] },
    light2: { attack: 'light', type: 'light', pose: 'light', cancelsInto: [] },
    air: {
      attack: 'light', type: 'light', pose: 'light', airborne: true, cancelsInto: [],
      damage: 12, staminaCost: 12, startup: 0.12, active: 0.12, recovery: 0.28,
      lunge: 0, hitstun: 0.2, knockback: 180, blockStaminaCost: 10,
    },
    forwardHeavy: {
      attack: 'heavy', type: 'heavy', pose: 'heavy', cancelsInto: [],
      staminaCost: 30, startup: 0.38, recovery: 0.55, lunge: 450,
    },
    heavy: { attack: 'heavy', type: 'heavy', pose: 'heavy', cancelsInto: [] },
    riposte: { attack: 'riposte', type: 'riposte', pose: 'riposte', cancelsInto: [] },
    shove: { attack: 'shove', type: 'shove', pose: 'shove', cancelsInto: [] },
    special: {
      attack: 'heavy', type: 'stance', pose: 'stance', cancelsInto: [],
      damage: 0, staminaCost: 15, startup: 0.35, active: 0, recovery: 0.35, lunge: 0,
      hitbox: { reach: 0, top: 0.9, bottom: 0.3 },
      counter: { move: 'riposte', stagger: 0.45, event: 'counter' },
    },
  },
  shadow: {
    light: { attack: 'light', type: 'light', pose: 'light', cancelsInto: ['light2'] },
    light2: { attack: 'light', type: 'light', pose: 'light', cancelsInto: ['light3'] },
    light3: { attack: 'light', type: 'light', pose: 'light', cancelsInto: [] },
    air: {
      attack: 'light', type: 'light', pose: 'light', airborne: true, cancelsInto: [],
      damage: 12, staminaCost: 12, startup: 0.12, active: 0.12, recovery: 0.28,
      lunge: 0, hitstun: 0.2, knockback: 180, blockStaminaCost: 10,
    },
    forwardHeavy: {
      attack: 'heavy', type: 'heavy', pose: 'heavy', cancelsInto: [],
      staminaCost: 30, startup: 0.38, recovery: 0.55, lunge: 450,
    },
    heavy: { attack: 'heavy', type: 'heavy', pose: 'heavy', cancelsInto: [] },
    riposte: { attack: 'riposte', type: 'riposte', pose: 'riposte', cancelsInto: [] },
    shove: { attack: 'shove', type: 'shove', pose: 'shove', cancelsInto: [] },
    special: {
      attack: 'heavy', type: 'heavy', pose: 'impetus', cancelsInto: [],
      damage: 18, staminaCost: 28, startup: 0.28, active: 0.12, recovery: 0.45, lunge: 520,
      armor: { hits: 1, damageScale: 1 },
    },
  },
  bastion: {
    light: { attack: 'light', type: 'light', pose: 'light', cancelsInto: ['light2'] },
    light2: { attack: 'light', type: 'light', pose: 'light', cancelsInto: [] },
    air: {
      attack: 'light', type: 'light', pose: 'light', airborne: true, cancelsInto: [],
      damage: 12, staminaCost: 12, startup: 0.12, active: 0.12, recovery: 0.28,
      lunge: 0, hitstun: 0.2, knockback: 180, blockStaminaCost: 10,
    },
    forwardHeavy: {
      attack: 'heavy', type: 'heavy', pose: 'heavy', cancelsInto: [],
      staminaCost: 30, startup: 0.38, recovery: 0.55, lunge: 450,
    },
    heavy: { attack: 'heavy', type: 'heavy', pose: 'heavy', cancelsInto: [] },
    riposte: { attack: 'riposte', type: 'riposte', pose: 'riposte', cancelsInto: [] },
    shove: { attack: 'shove', type: 'shove', pose: 'shove', cancelsInto: [] },
    special: {
      attack: 'heavy', type: 'heavy', pose: 'hammer', cancelsInto: [],
      damage: 32, staminaCost: 32, startup: 0.55, active: 0.14, recovery: 0.6, lunge: 160,
      knockback: 520, hitstun: 0.6, blockStaminaCost: 44,
      armor: { hits: 2, damageScale: 0.5 },
    },
  },
  wasp: {
    light: { attack: 'light', type: 'light', pose: 'light', cancelsInto: ['light2'] },
    light2: { attack: 'light', type: 'light', pose: 'lightReverse', cancelsInto: ['light3'] },
    light3: { attack: 'light', type: 'light', pose: 'light', cancelsInto: ['light4'] },
    light4: { attack: 'light', type: 'light', pose: 'lightReverse', cancelsInto: ['light5'] },
    light5: { attack: 'light', type: 'light', pose: 'light', cancelsInto: [], knockback: 260 },
    air: {
      attack: 'light', type: 'light', pose: 'light', airborne: true, cancelsInto: [],
      damage: 12, staminaCost: 12, startup: 0.12, active: 0.12, recovery: 0.28,
      lunge: 0, hitstun: 0.2, knockback: 180, blockStaminaCost: 10,
    },
    forwardHeavy: {
      attack: 'heavy', type: 'heavy', pose: 'heavy', cancelsInto: [],
      staminaCost: 30, startup: 0.38, recovery: 0.55, lunge: 450,
    },
    heavy: { attack: 'heavy', type: 'heavy', pose: 'heavy', cancelsInto: [] },
    riposte: { attack: 'riposte', type: 'riposte', pose: 'riposte', cancelsInto: [] },
    shove: { attack: 'shove', type: 'shove', pose: 'shove', cancelsInto: [] },
    special: {
      attack: 'light', type: 'light', pose: 'light', cancelsInto: [], staminaCost: 18,
      dash: { speed: 900, duration: 0.26, invulnerableTime: 0.2, passThrough: true },
    },
  },
  mirror: {
    light: { attack: 'light', type: 'light', pose: 'light', cancelsInto: ['light2'] },
    light2: { attack: 'light', type: 'light', pose: 'light', cancelsInto: [] },
    air: {
      attack: 'light', type: 'light', pose: 'light', airborne: true, cancelsInto: [],
      damage: 12, staminaCost: 12, startup: 0.12, active: 0.12, recovery: 0.28,
      lunge: 0, hitstun: 0.2, knockback: 180, blockStaminaCost: 10,
    },
    forwardHeavy: {
      attack: 'heavy', type: 'heavy', pose: 'heavy', cancelsInto: [],
      staminaCost: 30, startup: 0.38, recovery: 0.55, lunge: 450,
    },
    heavy: { attack: 'heavy', type: 'heavy', pose: 'heavy', cancelsInto: [] },
    riposte: { attack: 'riposte', type: 'riposte', pose: 'riposte', cancelsInto: [] },
    shove: { attack: 'shove', type: 'shove', pose: 'shove', cancelsInto: [] },
    special: {
      attack: 'heavy', type: 'stance', pose: 'waitingStance', cancelsInto: [],
      damage: 0, staminaCost: 20, startup: 0.7, active: 0, recovery: 0.4, lunge: 0,
      hitbox: { reach: 0, top: 0.9, bottom: 0.3 },
      counter: { move: 'riposte', stagger: 0.6, event: 'perfectParry' },
    },
  },
};

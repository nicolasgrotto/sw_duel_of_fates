export const movesByCharacter = {
  guardian: {
    light: { attack: 'light', type: 'light', pose: 'light', cancelsInto: ['light2'] },
    light2: { attack: 'light', type: 'light', pose: 'light', cancelsInto: [] },
    heavy: { attack: 'heavy', type: 'heavy', pose: 'heavy', cancelsInto: [] },
    riposte: { attack: 'riposte', type: 'riposte', pose: 'riposte', cancelsInto: [] },
    shove: { attack: 'shove', type: 'shove', pose: 'shove', cancelsInto: [] },
  },
  shadow: {
    light: { attack: 'light', type: 'light', pose: 'light', cancelsInto: ['light2'] },
    light2: { attack: 'light', type: 'light', pose: 'light', cancelsInto: ['light3'] },
    light3: { attack: 'light', type: 'light', pose: 'light', cancelsInto: [] },
    heavy: { attack: 'heavy', type: 'heavy', pose: 'heavy', cancelsInto: [] },
    riposte: { attack: 'riposte', type: 'riposte', pose: 'riposte', cancelsInto: [] },
    shove: { attack: 'shove', type: 'shove', pose: 'shove', cancelsInto: [] },
  },
};

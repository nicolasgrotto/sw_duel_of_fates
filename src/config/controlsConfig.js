export const Action = Object.freeze({
  MOVE_LEFT: 'moveLeft',
  MOVE_RIGHT: 'moveRight',
  JUMP: 'jump',
  LIGHT_ATTACK: 'lightAttack',
  HEAVY_ATTACK: 'heavyAttack',
  BLOCK: 'block',
  DODGE: 'dodge',
  CONFIRM: 'confirm',
  BACK: 'back',
  MENU_UP: 'menuUp',
  MENU_DOWN: 'menuDown',
  PAUSE: 'pause',
  TOGGLE_DEBUG: 'toggleDebug',
  CYCLE_DUMMY: 'cycleDummy',
});

export const keyBindings = {
  [Action.MOVE_LEFT]: ['KeyA', 'ArrowLeft'],
  [Action.MOVE_RIGHT]: ['KeyD', 'ArrowRight'],
  [Action.JUMP]: ['KeyW', 'ArrowUp', 'Space'],
  [Action.LIGHT_ATTACK]: ['KeyJ'],
  [Action.HEAVY_ATTACK]: ['KeyK'],
  [Action.BLOCK]: ['KeyL'],
  [Action.DODGE]: ['ShiftLeft', 'ShiftRight'],
  [Action.CONFIRM]: ['Enter', 'NumpadEnter'],
  [Action.BACK]: ['Escape', 'Backspace'],
  [Action.MENU_UP]: ['ArrowUp', 'KeyW'],
  [Action.MENU_DOWN]: ['ArrowDown', 'KeyS'],
  [Action.PAUSE]: ['Escape', 'KeyP'],
  [Action.TOGGLE_DEBUG]: ['F3'],
  [Action.CYCLE_DUMMY]: ['F4'],
};

export const gamepadConfig = {
  deadzone: 0.35,
  buttons: {
    0: [Action.JUMP, Action.CONFIRM],
    1: [Action.DODGE, Action.BACK],
    2: [Action.LIGHT_ATTACK],
    3: [Action.HEAVY_ATTACK],
    4: [Action.BLOCK],
    6: [Action.BLOCK],
    8: [Action.BACK],
    9: [Action.PAUSE, Action.CONFIRM],
    12: [Action.MENU_UP],
    13: [Action.MENU_DOWN],
    14: [Action.MOVE_LEFT],
    15: [Action.MOVE_RIGHT],
  },
  axes: [
    { index: 0, negative: Action.MOVE_LEFT, positive: Action.MOVE_RIGHT },
    { index: 1, negative: Action.MENU_UP, positive: Action.MENU_DOWN },
  ],
  reducedRumbleScale: 0.25,
  rumble: {
    hit: { duration: 50, strongMagnitude: 0.2, weakMagnitude: 0.3 },
    heavyHit: { duration: 100, strongMagnitude: 0.5, weakMagnitude: 0.5 },
    block: { duration: 40, strongMagnitude: 0.1, weakMagnitude: 0.2 },
    parry: { duration: 70, strongMagnitude: 0.2, weakMagnitude: 0.4 },
    perfectParry: { duration: 100, strongMagnitude: 0.4, weakMagnitude: 0.6 },
    guardBreak: { duration: 120, strongMagnitude: 0.6, weakMagnitude: 0.5 },
    clash: { duration: 100, strongMagnitude: 0.5, weakMagnitude: 0.6 },
    death: { duration: 160, strongMagnitude: 0.7, weakMagnitude: 0.7 },
    shove: { duration: 40, strongMagnitude: 0.2, weakMagnitude: 0.1 },
  },
};

export const keyboardPresetOrder = ['classic', 'arrows'];

export const keyboardPresets = {
  classic: keyBindings,
  arrows: {
    ...keyBindings,
    [Action.MOVE_LEFT]: ['ArrowLeft'],
    [Action.MOVE_RIGHT]: ['ArrowRight'],
    [Action.JUMP]: ['ArrowUp', 'Space'],
    [Action.LIGHT_ATTACK]: ['KeyZ'],
    [Action.HEAVY_ATTACK]: ['KeyX'],
    [Action.BLOCK]: ['KeyC'],
    [Action.DODGE]: ['KeyV'],
    [Action.MENU_UP]: ['ArrowUp'],
    [Action.MENU_DOWN]: ['ArrowDown'],
  },
};

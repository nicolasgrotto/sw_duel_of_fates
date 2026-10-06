export const Action = Object.freeze({
  MOVE_LEFT: 'moveLeft',
  MOVE_RIGHT: 'moveRight',
  JUMP: 'jump',
  LIGHT_ATTACK: 'lightAttack',
  HEAVY_ATTACK: 'heavyAttack',
  BLOCK: 'block',
  DODGE: 'dodge',
  CONFIRM: 'confirm',
  PAUSE: 'pause',
  QUIT: 'quit',
  TOGGLE_DEBUG: 'toggleDebug',
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
  [Action.PAUSE]: ['Escape', 'KeyP'],
  [Action.QUIT]: ['KeyQ'],
  [Action.TOGGLE_DEBUG]: ['F3'],
};

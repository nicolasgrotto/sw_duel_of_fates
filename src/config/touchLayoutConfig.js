import { Action } from './controlsConfig.js';

export const touchLayoutConfig = {
  width: 1280, height: 720,
  joystick: { halfWidth: 640, top: 360, radius: 76, knobRadius: 28, deadzone: 18, evadeThreshold: 44, idleX: 150, idleY: 600 },
  buttons: [
    { action: Action.SPECIAL, x: 980, y: 510, radius: 48 },
    { action: Action.POWER, x: 860, y: 570, radius: 48, feature: 'powers' },
    { action: Action.HEAVY_ATTACK, x: 1100, y: 510, radius: 48 },
    { action: Action.JUMP, x: 1220, y: 510, radius: 48 },
    { action: Action.DODGE, x: 980, y: 630, radius: 48 },
    { action: Action.BLOCK, x: 1100, y: 630, radius: 48 },
    { action: Action.LIGHT_ATTACK, x: 1220, y: 630, radius: 48 },
    { action: Action.PAUSE, x: 640, y: 44, radius: 34 },
  ],
  back: { action: Action.BACK, x: 90, y: 55, radius: 42 },
  colorLeft: { x: 590, y: 308, radius: 32 },
  colorRight: { x: 1170, y: 308, radius: 32 },
  skinLeft: { x: 590, y: 366, radius: 24 },
  skinRight: { x: 1170, y: 366, radius: 24 },
  menuWidth: 520,
  style: { idleAlpha: 0.45, activeAlpha: 0.85, backgroundAlpha: 0.55, lineWidth: 2 },
};

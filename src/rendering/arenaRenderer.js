import { colors } from '../config/themeConfig.js';

export function drawArena(renderer, arena) {
  const { left, right, floorY } = arena;

  renderer.fillRect(0, floorY, renderer.width, renderer.height - floorY, colors.floor);
  renderer.line(0, floorY, renderer.width, floorY, colors.floorEdge, 2);
  renderer.line(left, 0, left, floorY, colors.wall, 2);
  renderer.line(right, 0, right, floorY, colors.wall, 2);
}

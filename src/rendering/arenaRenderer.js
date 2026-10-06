import { colors } from '../config/themeConfig.js';

export function drawArena(renderer, arena) {
  const { left, right, floorY, overscan } = arena;
  const fullWidth = renderer.width + overscan * 2;

  renderer.fillRect(-overscan, floorY, fullWidth, renderer.height - floorY + overscan, colors.floor);
  renderer.line(-overscan, floorY, renderer.width + overscan, floorY, colors.floorEdge, 2);
  renderer.line(left, -overscan, left, floorY, colors.wall, 2);
  renderer.line(right, -overscan, right, floorY, colors.wall, 2);
}

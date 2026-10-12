import { projectilesConfig } from '../config/projectilesConfig.js';
import { colors } from '../config/themeConfig.js';

const style = projectilesConfig.render;
const points = new Float32Array(style.fragmentPoints.length);

export function getRockLook(tierId) {
  return style.rocks.byTier[tierId] ?? style.rocks.byTier.faint;
}

function drawRock(renderer, x, y, radius, angle, edgeColor) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const shape = style.fragmentPoints;
  for (let i = 0; i < shape.length; i += 2) {
    const px = shape[i] * radius;
    const py = shape[i + 1] * radius;
    points[i] = x + px * cos - py * sin;
    points[i + 1] = y + px * sin + py * cos;
  }
  const last = points.length - 2;
  renderer.fillPolygon(points, colors.floorEdge);
  renderer.polyline(points, colors.rockShade, style.fragmentEdgeWidth);
  renderer.line(points[last], points[last + 1], points[0], points[1], colors.rockShade, style.fragmentEdgeWidth);
  renderer.setAlpha(style.rocks.energyAlpha);
  renderer.polyline(points, edgeColor, style.rocks.energyWidth);
  renderer.line(points[last], points[last + 1], points[0], points[1], edgeColor, style.rocks.energyWidth);
  renderer.setAlpha(1);
}

export function drawRockCluster(renderer, x, y, radius, angle, count, edgeColor) {
  const layout = style.rocks.layouts[count - 1];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let index = 0; index < count; index += 1) {
    const offsetX = layout[index * 3] * radius;
    const offsetY = layout[index * 3 + 1] * radius;
    drawRock(
      renderer,
      x + offsetX * cos - offsetY * sin,
      y + offsetX * sin + offsetY * cos,
      radius * layout[index * 3 + 2],
      angle * (1 + index * style.rocks.ownSpin) + index * style.rocks.twist,
      edgeColor,
    );
  }
}

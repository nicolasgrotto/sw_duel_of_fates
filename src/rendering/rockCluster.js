import { projectilesConfig } from '../config/projectilesConfig.js';
import { colors } from '../config/themeConfig.js';

const style = projectilesConfig.render;
const points = new Float32Array(style.fragmentPoints.length);

export function getRockCount(sizeId) {
  return style.rocks.bySize[sizeId] ?? 1;
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
  renderer.fillPolygon(points, colors.floorEdge);
  renderer.polyline(points, edgeColor, style.fragmentEdgeWidth);
  const last = points.length - 2;
  renderer.line(points[last], points[last + 1], points[0], points[1], edgeColor, style.fragmentEdgeWidth);
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
      angle + index * style.rocks.twist,
      edgeColor,
    );
  }
}

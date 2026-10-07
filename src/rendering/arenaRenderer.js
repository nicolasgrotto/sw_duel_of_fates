import { colors } from '../config/themeConfig.js';

export function drawArena(renderer, arena, definition = {}) {
  const { left, right, floorY, overscan } = arena;
  const fullWidth = renderer.width + overscan * 2;

  renderer.fillRect(-overscan, floorY, fullWidth, definition.floorHeight ?? renderer.height - floorY + overscan, colors.floor);
  renderer.line(-overscan, floorY, renderer.width + overscan, floorY, colors.floorEdge, 2);
  if (definition.showWalls === false) {
    return;
  }
  renderer.line(left, -overscan, left, floorY, colors.wall, 2);
  renderer.line(right, -overscan, right, floorY, colors.wall, 2);
}

export class ArenaRenderer {
  constructor(definition) {
    this.definition = definition;
    this.layers = null;
  }

  render(renderer, arena, ambient) {
    if (!this.layers) {
      this.layers = this.definition.layers.map((layer) => renderer.createLayer((target) => this.drawLayer(target, layer), arena.overscan));
      this.floorLayer = renderer.createLayer((target) => drawArena(target, arena, this.definition), arena.overscan);
    }
    for (const layer of this.layers) {
      renderer.drawLayer(layer, arena.overscan);
    }
    if (ambient) {
      const { color, alpha, radius, life } = ambient.config;
      renderer.save();
      for (const particle of ambient.particles) {
        const fade = Math.sin(Math.PI * particle.time / life);
        renderer.setAlpha(alpha * fade);
        if (ambient.config.kind === 'steam') {
          renderer.drawGlow(particle.x, particle.y, radius * (1 + particle.time / life), colors[color], alpha * fade);
        } else {
          renderer.fillCircle(particle.x, particle.y, radius, colors[color]);
        }
      }
      renderer.restore();
    }
    renderer.drawLayer(this.floorLayer, arena.overscan);
  }

  drawLayer(renderer, layer) {
    renderer.save();
    renderer.setAlpha(layer.alpha ?? 1);
    for (const rectangle of layer.rectangles ?? []) {
      const [x, y, width, height, color] = rectangle;
      renderer.fillRect(x, y, width, height, colors[color]);
    }
    for (const line of layer.lines ?? []) {
      const [x1, y1, x2, y2, color, width] = line;
      renderer.line(x1, y1, x2, y2, colors[color], width);
    }
    renderer.restore();
  }
}

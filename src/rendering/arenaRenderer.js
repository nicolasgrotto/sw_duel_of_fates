import { colors } from '../config/themeConfig.js';
import { clamp } from '../utils/math.js';

const AmbientLayer = Object.freeze({
  AIR: 'air',
  FLOOR: 'floor',
});

const SHIMMER_FREQUENCY = 7;
const SHIMMER_AMPLITUDE = 1.5;

const crystalPoints = [0, 0, 0, 0, 0, 0, 0, 0];

function drawShapes(renderer, layer) {
  renderer.save();
  renderer.setAlpha(layer.alpha ?? 1);
  for (const [x, y, width, height, color] of layer.rectangles ?? []) {
    renderer.fillRect(x, y, width, height, colors[color]);
  }
  for (const [x1, y1, x2, y2, color, width] of layer.lines ?? []) {
    renderer.line(x1, y1, x2, y2, colors[color], width);
  }
  for (const [color, ...points] of layer.polygons ?? []) {
    renderer.fillPolygon(points, colors[color]);
  }
  for (const [x, y, radius, color] of layer.circles ?? []) {
    renderer.fillCircle(x, y, radius, colors[color]);
  }
  for (const [x, y, radius, color, alpha] of layer.glows ?? []) {
    renderer.drawGlow(x, y, radius, colors[color], alpha);
  }
  for (const [x, y, radius, startAngle, endAngle, color, width] of layer.arcs ?? []) {
    renderer.strokeArc(x, y, radius, startAngle, endAngle, colors[color], width);
  }
  renderer.restore();
}

export function drawArena(renderer, arena, definition) {
  const { left, right, floorY, overscan } = arena;
  const fullWidth = renderer.width + overscan * 2;

  renderer.fillRect(-overscan, floorY, fullWidth, definition.floorHeight, colors[definition.floorColor]);
  if (definition.floorDetail) {
    drawShapes(renderer, definition.floorDetail);
  }
  renderer.line(-overscan, floorY, renderer.width + overscan, floorY, colors[definition.floorEdgeColor], 2);
  if (!definition.showWalls) {
    return;
  }
  renderer.line(left, -overscan, left, floorY, colors.wall, 2);
  renderer.line(right, -overscan, right, floorY, colors.wall, 2);
}

function setCrystalPoints(x, y, size) {
  crystalPoints[0] = x;
  crystalPoints[1] = y - size;
  crystalPoints[2] = x + size * 0.42;
  crystalPoints[3] = y - size * 0.1;
  crystalPoints[4] = x;
  crystalPoints[5] = y + size * 0.55;
  crystalPoints[6] = x - size * 0.42;
  crystalPoints[7] = y - size * 0.1;
  return crystalPoints;
}

function findNearestBlade(fighters, x, y) {
  let nearest = null;
  let nearestDistance = Infinity;
  for (const fighter of fighters) {
    const distance = Math.hypot(fighter.x - x, fighter.y - fighter.height * 0.55 - y);
    if (fighter.isAlive && distance < nearestDistance) {
      nearest = fighter;
      nearestDistance = distance;
    }
  }
  return { fighter: nearest, distance: nearestDistance };
}

export class ArenaRenderer {
  constructor(definition) {
    this.definition = definition;
    this.backdrop = null;
    this.floorLayer = null;
  }

  ensureLayers(renderer, arena) {
    if (this.backdrop) {
      return;
    }
    this.backdrop = renderer.createLayer((target) => this.drawBackdrop(target), arena.overscan);
    this.floorLayer = renderer.createLayer((target) => drawArena(target, arena, this.definition), arena.overscan);
  }

  renderBackground(renderer, arena, ambients, fighters) {
    this.ensureLayers(renderer, arena);
    renderer.drawLayer(this.backdrop, arena.overscan);
    this.renderCrystalGlows(renderer, fighters);
    this.renderAmbient(renderer, ambients, AmbientLayer.AIR);
  }

  renderFloor(renderer, arena) {
    this.ensureLayers(renderer, arena);
    renderer.drawLayer(this.floorLayer, arena.overscan);
  }

  renderReflectionCover(renderer, arena) {
    const { reflection, floorHeight } = this.definition;
    renderer.save();
    renderer.setAlpha(reflection.coverAlpha);
    renderer.fillRect(-arena.overscan, arena.floorY + 1, renderer.width + arena.overscan * 2, floorHeight, colors[reflection.cover]);
    renderer.restore();
  }

  renderShade(renderer, arena) {
    const { shade } = this.definition;
    if (!shade) {
      return;
    }
    renderer.save();
    renderer.setAlpha(shade.alpha);
    renderer.fillRect(-arena.overscan, -arena.overscan, renderer.width + arena.overscan * 2, renderer.height + arena.overscan * 2, colors[shade.color]);
    renderer.restore();
  }

  renderFloorAmbient(renderer, ambients) {
    this.renderAmbient(renderer, ambients, AmbientLayer.FLOOR);
  }

  renderCrystalGlows(renderer, fighters) {
    const { crystals, crystalGlow } = this.definition;
    if (crystals.length === 0 || fighters.length === 0) {
      return;
    }
    renderer.save();
    renderer.setBlendMode('lighter');
    for (const [x, y, size] of crystals) {
      const { fighter, distance } = findNearestBlade(fighters, x, y);
      const intensity = clamp(1 - distance / crystalGlow.range, 0, 1);
      if (fighter && intensity > 0) {
        renderer.drawGlow(x, y, size * crystalGlow.radiusScale, fighter.appearance.saberColor, crystalGlow.alpha * intensity);
      }
    }
    renderer.restore();
  }

  renderAmbient(renderer, ambients, layer) {
    for (const ambient of ambients) {
      if (ambient.config.layer === layer) {
        this.drawAmbient(renderer, ambient);
      }
    }
  }

  drawAmbient(renderer, ambient) {
    const { color, alpha, radius, life, kind } = ambient.config;
    renderer.save();
    for (const particle of ambient.particles) {
      const progress = particle.time / life;
      const fade = Math.sin(Math.PI * progress);
      renderer.setAlpha(alpha * fade);
      if (kind === 'steam') {
        renderer.drawGlow(particle.x, particle.y, radius * (1 + progress), colors[color], alpha * fade);
      } else if (kind === 'ripple') {
        const size = radius * progress;
        renderer.strokeEllipse(particle.x, particle.y, size, size * 0.22, colors[color], 1.5);
      } else if (kind === 'cloud') {
        renderer.drawGlow(particle.x, particle.y, radius, colors[color], alpha * fade);
      } else if (kind === 'rain' || kind === 'gust') {
        const { driftSpeed, riseSpeed, streak } = ambient.config;
        if (kind === 'rain') renderer.setAlpha(alpha);
        renderer.line(particle.x, particle.y, particle.x + driftSpeed * streak, particle.y - riseSpeed * streak, colors[color], radius);
      } else if (kind === 'shimmer') {
        const y = particle.y + Math.sin(particle.time * SHIMMER_FREQUENCY + particle.x) * SHIMMER_AMPLITUDE;
        renderer.line(particle.x - radius, y, particle.x + radius, y, colors[color], 1);
      } else {
        renderer.fillCircle(particle.x, particle.y, radius, colors[color]);
      }
    }
    renderer.restore();
  }

  drawBackdrop(renderer) {
    for (const layer of this.definition.layers) {
      drawShapes(renderer, layer);
    }
    if (this.definition.crystals.length > 0) {
      this.drawCrystalBodies(renderer);
    }
  }

  drawCrystalBodies(renderer) {
    const isFungus = this.definition.crystalShape === 'fungus';
    for (const [x, y, size] of this.definition.crystals) {
      if (isFungus) {
        renderer.line(x, y, x, y + size * 0.9, colors.arenaWood, size * 0.3);
        renderer.fillEllipse(x, y, size, size * 0.45, colors.arenaFungus);
        continue;
      }
      const points = setCrystalPoints(x, y, size);
      renderer.fillPolygon(points, colors.arenaCrystal);
      renderer.polyline(points, colors.arenaCrystalEdge, 1.5);
    }
  }
}

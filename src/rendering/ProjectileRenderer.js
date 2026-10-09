import { getPowerTier } from '../combat/flowInteractions.js';
import { saberStyle } from '../config/fighterVisualConfig.js';
import { ProjectileKind, projectilesConfig } from '../config/projectilesConfig.js';
import { powersConfig } from '../config/powersConfig.js';
import { colors } from '../config/themeConfig.js';

const style = projectilesConfig.render;

export class ProjectileRenderer {
  constructor() {
    this.points = new Float32Array(style.fragmentPoints.length);
  }

  draw(renderer, projectiles, fighters) {
    if (!projectiles) {
      return;
    }
    for (const projectile of projectiles) {
      const owner = fighters[projectile.owner];
      if (!projectile.active || !owner) {
        continue;
      }
      if (projectile.kind === ProjectileKind.THROW) {
        this.drawFragment(renderer, projectile, owner);
      } else {
        this.drawSaber(renderer, projectile, owner);
      }
    }
  }

  drawFragment(renderer, projectile, owner) {
    const { x, y, radius } = projectile;
    const tier = getPowerTier(owner.flowLevel, powersConfig.tiers);
    const angle = projectile.age * style.fragmentSpin * (Math.sign(projectile.vx) || 1);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const shape = style.fragmentPoints;
    for (let i = 0; i < shape.length; i += 2) {
      const px = shape[i] * radius;
      const py = shape[i + 1] * radius;
      this.points[i] = x + px * cos - py * sin;
      this.points[i + 1] = y + px * sin + py * cos;
    }
    renderer.save();
    renderer.setBlendMode('lighter');
    renderer.drawGlow(x, y, radius * style.fragmentGlowScale, tier.color, style.fragmentGlowAlpha);
    renderer.restore();
    renderer.fillPolygon(this.points, colors.floorEdge);
    renderer.polyline(this.points, tier.color, style.fragmentEdgeWidth);
    const last = this.points.length - 2;
    renderer.line(this.points[last], this.points[last + 1], this.points[0], this.points[1], tier.color, style.fragmentEdgeWidth);
  }

  drawSaber(renderer, projectile, owner) {
    const { x, y } = projectile;
    const half = projectile.radius * style.saberLengthScale / 2;
    const angle = projectile.age * style.saberSpin * (Math.sign(projectile.vx) || 1);
    const dx = Math.cos(angle) * half;
    const dy = Math.sin(angle) * half;
    const color = owner.appearance.saberColor;
    renderer.save();
    renderer.setBlendMode('lighter');
    renderer.drawGlow(x, y, half * 2 * style.saberGlowScale, color, style.saberGlowAlpha);
    renderer.setAlpha(saberStyle.glowAlpha);
    renderer.line(x - dx, y - dy, x + dx, y + dy, color, saberStyle.glowWidth);
    renderer.setAlpha(1);
    renderer.line(x - dx, y - dy, x + dx, y + dy, colors.saberCore, saberStyle.coreWidth);
    renderer.restore();
  }
}

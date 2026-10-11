import { getPowerTier, resolveLevelBand } from '../combat/flowInteractions.js';
import { saberStyle } from '../config/fighterVisualConfig.js';
import { ProjectileKind, projectilesConfig } from '../config/projectilesConfig.js';
import { powersConfig } from '../config/powersConfig.js';
import { colors } from '../config/themeConfig.js';
import { drawRockCluster, getRockCount, getRockScale } from './rockCluster.js';

const style = projectilesConfig.render;

export class ProjectileRenderer {
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
    const tier = getPowerTier(owner.flowLevel, powersConfig.tiers);
    const size = resolveLevelBand(owner.flowLevel, projectilesConfig.throw.sizes);
    const angle = projectile.age * style.fragmentSpin * (Math.sign(projectile.vx) || 1);
    drawRockCluster(renderer, projectile.x, projectile.y, projectile.radius * getRockScale(size.id), angle, getRockCount(size.id), tier.color);
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

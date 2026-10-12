import { getPowerTier } from '../combat/flowInteractions.js';
import { saberStyle } from '../config/fighterVisualConfig.js';
import { ProjectileKind, projectilesConfig } from '../config/projectilesConfig.js';
import { powersConfig } from '../config/powersConfig.js';
import { colors } from '../config/themeConfig.js';
import { drawEnergyBlade } from './energyBlade.js';
import { drawRockCluster, getRockLook } from './rockCluster.js';

const style = projectilesConfig.render;

export class ProjectileRenderer {
  constructor() {
    this.wavePoints = new Float32Array(style.wave.points * 2);
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
      if (projectile.kind === ProjectileKind.THROW && projectile.source === 'arsenal') {
        this.drawArsenalBlade(renderer, projectile, owner);
      } else if (projectile.kind === ProjectileKind.THROW) {
        this.drawFragment(renderer, projectile, owner);
      } else if (projectile.kind === ProjectileKind.WAVE) {
        this.drawWave(renderer, projectile, owner);
      } else {
        this.drawSaber(renderer, projectile, owner);
      }
    }
  }

  drawFragment(renderer, projectile, owner) {
    const tier = getPowerTier(projectile.level || owner.flowLevel, powersConfig.tiers);
    const look = getRockLook(tier.id);
    const angle = projectile.age * style.fragmentSpin * (Math.sign(projectile.vx) || 1);
    drawRockCluster(renderer, projectile.x, projectile.y, projectile.radius * look.scale, angle, look.count, tier.color);
  }


  drawArsenalBlade(renderer, projectile, owner) {
    const tier = getPowerTier(owner.flowLevel, powersConfig.tiers);
    const blade = style.energyBlade;
    drawEnergyBlade(renderer, projectile.x, projectile.y, projectile.age * blade.spin * (Math.sign(projectile.vx) || 1), blade.length, tier.color);
  }

  drawWave(renderer, projectile, owner) {
    const wave = style.wave;
    const direction = Math.sign(projectile.vx) || 1;
    const half = projectile.radius * wave.heightScale;
    const last = wave.points - 1;
    for (let index = 0; index <= last; index += 1) {
      const t = index / last * 2 - 1;
      this.wavePoints[index * 2] = projectile.x + direction * projectile.radius * wave.bow * (1 - t * t);
      this.wavePoints[index * 2 + 1] = projectile.y + t * half;
    }
    const color = owner.appearance.saberColor;
    renderer.save();
    renderer.setBlendMode('lighter');
    renderer.setAlpha(wave.glowAlpha);
    renderer.polyline(this.wavePoints, color, wave.glowWidth);
    renderer.setAlpha(1);
    renderer.polyline(this.wavePoints, color, wave.width);
    renderer.polyline(this.wavePoints, colors.saberCore, wave.coreWidth);
    renderer.restore();
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

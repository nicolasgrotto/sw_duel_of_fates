import { getPowerTier } from '../combat/flowInteractions.js';
import { isBarrierUp, isChannelOpen, isUsingPower } from '../combat/PowerSystem.js';
import { hasStatus } from '../combat/StatusSystem.js';
import { powersConfig } from '../config/powersConfig.js';
import { colors } from '../config/themeConfig.js';
import { TAU, clamp, lerp } from '../utils/math.js';
import { createRandom } from '../utils/random.js';

const style = powersConfig.render;

function createBolt() {
  const count = style.boltSegments + 1;
  return {
    refreshedAt: -Infinity,
    offsets: new Float32Array(count),
    branchOffsets: new Float32Array(count),
    points: new Float32Array(count * 2),
    branch: new Float32Array(count * 2),
  };
}

export class PowerRenderer {
  constructor() {
    this.random = createRandom(style.seed);
    this.bolts = new Map();
  }

  getBolt(fighter) {
    let bolt = this.bolts.get(fighter);
    if (!bolt) {
      bolt = createBolt();
      this.bolts.set(fighter, bolt);
    }
    return bolt;
  }

  draw(renderer, fighters) {
    renderer.save();
    renderer.setBlendMode('lighter');
    for (const fighter of fighters) {
      if (isUsingPower(fighter)) {
        this.drawFighter(renderer, fighter);
      }
      if (hasStatus(fighter)) {
        this.drawStatus(renderer, fighter);
      }
    }
    renderer.restore();
  }

  drawStatus(renderer, fighter) {
    const status = style.status;
    const { combat, x, y, height } = fighter;
    const tier = getPowerTier(combat.statusLevel, powersConfig.tiers);
    const time = fighter.animation.time;
    if (combat.chokeTime > 0) {
      const pulse = (Math.sin(time * status.chokePulseSpeed) + 1) / 2;
      renderer.drawGlow(x, y - height * status.chokeHeight, tier.glowRadius * status.chokeRadius, tier.color, lerp(status.chokeAlpha[0], status.chokeAlpha[1], pulse));
    }
    if (combat.freezeTime > 0) {
      const centerY = y - height / 2;
      renderer.drawGlow(x, centerY, height * status.freezeRadiusY, tier.color, status.freezeAlpha);
      renderer.setAlpha(status.freezeLineAlpha);
      renderer.strokeEllipse(x, centerY, height * status.freezeRadiusX, height * status.freezeRadiusY, tier.color, status.freezeLineWidth);
      renderer.setAlpha(1);
    }
    if (combat.focusTime > 0) {
      const pulse = (Math.sin(time * status.focusPulseSpeed) + 1) / 2;
      renderer.drawGlow(x, y - height * status.focusHeight, tier.glowRadius * status.focusRadius, tier.color, lerp(status.focusAlpha[0], status.focusAlpha[1], pulse));
    }
    if (combat.healTime > 0) {
      const rise = (time * status.healRiseSpeed) % 1;
      renderer.drawGlow(x, y - height * lerp(status.healFrom, status.healTo, rise), tier.glowRadius * status.healRadius, tier.color, status.healAlpha * (1 - rise));
    }
  }

  drawFighter(renderer, fighter) {
    const { power } = fighter.combat;
    const tier = getPowerTier(fighter.flowLevel, powersConfig.tiers);
    const originX = fighter.x + fighter.facing * (fighter.width / 2 + style.handOffset);
    const originY = fighter.y - fighter.height * powersConfig.castHeight;

    if (fighter.stateTime < power.startup) {
      const scale = lerp(style.chargeMinScale, 1, clamp(fighter.stateTime / power.startup, 0, 1));
      renderer.drawGlow(originX, originY, tier.glowRadius * scale, tier.color, tier.glowAlpha);
      return;
    }
    if (isBarrierUp(fighter)) {
      this.drawBarrier(renderer, fighter, tier);
    } else if (isChannelOpen(fighter) && power.effect === 'lightning') {
      this.drawLightning(renderer, fighter, tier, originX, originY);
    }
  }

  drawBarrier(renderer, fighter, tier) {
    const centerX = fighter.x;
    const centerY = fighter.y - fighter.height * style.barrierCenter;
    const radiusX = fighter.height * style.barrierRadiusX;
    const radiusY = fighter.height * style.barrierRadiusY;
    const pulse = (Math.sin(fighter.animation.time * style.barrierPulseSpeed * TAU) + 1) / 2;
    renderer.drawGlow(centerX, centerY, radiusY * style.barrierGlowScale, tier.color, style.barrierGlowAlpha);
    renderer.setAlpha(lerp(style.barrierAlpha[0], style.barrierAlpha[1], pulse));
    renderer.strokeEllipse(centerX, centerY, radiusX, radiusY, tier.color, style.barrierLineWidth);
  }

  refreshBolt(bolt, time) {
    if (time >= bolt.refreshedAt && time - bolt.refreshedAt < style.boltRefresh) {
      return;
    }
    bolt.refreshedAt = time;
    const last = bolt.offsets.length - 1;
    for (let index = 0; index <= last; index += 1) {
      const envelope = Math.sin((index / last) * Math.PI);
      bolt.offsets[index] = (this.random() * 2 - 1) * style.boltJitter * envelope;
      bolt.branchOffsets[index] = (this.random() * 2 - 1) * style.boltJitter * style.branchJitterScale * envelope;
    }
  }

  tracePoints(points, offsets, fromX, fromY, toX, toY) {
    const last = offsets.length - 1;
    const length = Math.hypot(toX - fromX, toY - fromY) || 1;
    const normalX = -(toY - fromY) / length;
    const normalY = (toX - fromX) / length;
    for (let index = 0; index <= last; index += 1) {
      const t = index / last;
      points[index * 2] = lerp(fromX, toX, t) + normalX * offsets[index];
      points[index * 2 + 1] = lerp(fromY, toY, t) + normalY * offsets[index];
    }
  }

  drawLightning(renderer, fighter, tier, originX, originY) {
    const bolt = this.getBolt(fighter);
    const { powerTargetX: targetX, powerTargetY: targetY } = fighter.combat;
    this.refreshBolt(bolt, fighter.animation.time);
    this.tracePoints(bolt.points, bolt.offsets, originX, originY, targetX, targetY);
    this.tracePoints(bolt.branch, bolt.branchOffsets, originX, originY, targetX, targetY);

    renderer.setAlpha(style.boltGlowAlpha);
    renderer.polyline(bolt.points, tier.color, tier.boltWidth * style.boltGlowScale);
    renderer.setAlpha(style.branchAlpha);
    renderer.polyline(bolt.branch, tier.color, tier.boltWidth * style.branchWidthScale);
    renderer.setAlpha(1);
    renderer.polyline(bolt.points, tier.color, tier.boltWidth);
    renderer.polyline(bolt.points, colors.saberCore, tier.boltWidth * style.coreWidthScale);
    renderer.drawGlow(targetX, targetY, tier.glowRadius * style.impactGlowScale, tier.color, tier.glowAlpha);
  }
}

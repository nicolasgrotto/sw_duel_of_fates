import { getPowerTier, resolveLevelBand } from '../combat/flowInteractions.js';
import { isBarrierUp, isChannelOpen, isUsingPower } from '../combat/PowerSystem.js';
import { hasStatus } from '../combat/StatusSystem.js';
import { effectsConfig } from '../config/effectsConfig.js';
import { powersConfig } from '../config/powersConfig.js';
import { projectilesConfig } from '../config/projectilesConfig.js';
import { colors } from '../config/themeConfig.js';
import { easeOutCubic } from '../utils/easing.js';
import { TAU, clamp, lerp } from '../utils/math.js';
import { createRandom } from '../utils/random.js';
import { drawFighterBody } from './fighterRenderer.js';
import { drawRockCluster, getRockCount } from './rockCluster.js';

const style = powersConfig.render;

function createBolt(segments) {
  const count = segments + 1;
  return {
    refreshedAt: -Infinity,
    offsets: new Float32Array(count),
    branchOffsets: new Float32Array(count),
    points: new Float32Array(count * 2),
    branch: new Float32Array(count * 2),
  };
}

function createChannelView() {
  return {
    bolts: Array.from({ length: style.maxBolts }, () => createBolt(style.boltSegments)),
    arcs: Array.from({ length: style.maxBolts }, () => createBolt(style.storm.arcSegments)),
  };
}

const arcEnds = new Float32Array(4);

function setArcEnds(fromX, fromY, toX, toY) {
  arcEnds[0] = fromX;
  arcEnds[1] = fromY;
  arcEnds[2] = toX;
  arcEnds[3] = toY;
  return arcEnds;
}

function placeBodyArc(index, pose) {
  if (index === 0) return setArcEnds(pose.shoulderX + 3, pose.shoulderY + 3, pose.handX, pose.handY);
  if (index === 1) return setArcEnds(pose.hipX, pose.hipY, pose.shoulderX, pose.shoulderY);
  return setArcEnds(pose.handX, pose.handY, pose.hipX, pose.hipY);
}

export class PowerRenderer {
  constructor() {
    this.random = createRandom(style.seed);
    this.bolts = new Map();
  }

  getChannelView(fighter) {
    let view = this.bolts.get(fighter);
    if (!view) {
      view = createChannelView();
      this.bolts.set(fighter, view);
    }
    return view;
  }

  draw(renderer, fighters, poses = null) {
    renderer.save();
    renderer.setBlendMode('lighter');
    for (const fighter of fighters) {
      if (isUsingPower(fighter)) {
        this.drawFighter(renderer, fighter, poses?.get(fighter) ?? null);
      }
      if (hasStatus(fighter)) {
        this.drawStatus(renderer, fighter);
      }
    }
    renderer.restore();
  }

  drawFrozenEchoes(renderer, fighter, pose, floorY) {
    if (!(fighter.combat.freezeTime > 0)) {
      return;
    }
    const status = style.status;
    const color = getPowerTier(fighter.combat.statusLevel, powersConfig.tiers).color;
    const beat = Math.floor(fighter.animation.time / status.freezeEchoInterval);
    renderer.save();
    renderer.setAlpha(status.freezeEchoAlpha);
    for (let index = 0; index < status.freezeEchoOffsets.length; index += 1) {
      const offset = status.freezeEchoOffsets[index];
      const direction = (beat + index) % 2 === 0 ? 1 : -1;
      const offsetX = offset * direction;
      const offsetY = (offset / 2) * (index % 2 === 0 ? -direction : direction);
      renderer.translate(offsetX, offsetY);
      drawFighterBody(renderer, fighter, pose, floorY, false, color);
      renderer.translate(-offsetX, -offsetY);
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
    if (combat.wrathTime > 0) {
      const [fast, slow] = status.wrathFlicker;
      const flicker = (Math.sin(time * fast) + Math.sin(time * slow) + 2) / 4;
      renderer.drawGlow(x, y - height * status.wrathHeight, tier.glowRadius * status.wrathRadius, tier.color, lerp(status.wrathAlpha[0], status.wrathAlpha[1], flicker));
    }
    if (combat.healTime > 0) {
      const rise = (time * status.healRiseSpeed) % 1;
      renderer.drawGlow(x, y - height * lerp(status.healFrom, status.healTo, rise), tier.glowRadius * status.healRadius, tier.color, status.healAlpha * (1 - rise));
    }
  }

  drawFighter(renderer, fighter, pose) {
    const { power } = fighter.combat;
    const tier = getPowerTier(fighter.flowLevel, powersConfig.tiers);
    const originX = fighter.x + fighter.facing * (fighter.width / 2 + style.handOffset);
    const originY = fighter.y - fighter.height * powersConfig.castHeight;

    if (fighter.stateTime < power.startup && power.effect === 'throw') {
      this.drawRisingRocks(renderer, fighter, tier, power);
      return;
    }
    if (fighter.stateTime < power.startup) {
      const scale = power.effect === 'push'
        ? effectsConfig.shockwave.chargeScale
        : lerp(style.chargeMinScale, 1, clamp(fighter.stateTime / power.startup, 0, 1));
      renderer.drawGlow(originX, originY, tier.glowRadius * scale, tier.color, tier.glowAlpha);
      return;
    }
    if (isBarrierUp(fighter)) {
      this.drawBarrier(renderer, fighter, tier);
    } else if (isChannelOpen(fighter) && power.effect === 'lightning') {
      this.drawLightning(renderer, fighter, tier, originX, originY);
    } else if (isChannelOpen(fighter) && power.effect === 'storm') {
      renderer.setAlpha(style.storm.alpha);
      renderer.strokeEllipse(fighter.x, fighter.y - fighter.height / 2, power.range, power.range, tier.color, style.storm.lineWidth);
      renderer.setAlpha(1);
      if (pose) {
        this.drawStormArcs(renderer, fighter, pose, tier);
      }
    } else if (fighter.combat.redirectTime > 0) {
      renderer.drawGlow(originX, originY, tier.glowRadius * style.redirectGlowScale, tier.color, tier.glowAlpha);
    }
  }

  drawRisingRocks(renderer, fighter, tier, power) {
    const rocks = projectilesConfig.render.rocks;
    const size = resolveLevelBand(fighter.flowLevel, projectilesConfig.throw.sizes);
    const rise = easeOutCubic(clamp(fighter.stateTime / power.startup, 0, 1));
    const x = fighter.x + fighter.facing * fighter.width / 2;
    const y = lerp(fighter.y - size.radius * rocks.riseStart, fighter.y - fighter.height * projectilesConfig.height, rise);
    renderer.save();
    renderer.setBlendMode('source-over');
    drawRockCluster(renderer, x, y, size.radius, fighter.stateTime * rocks.riseSpin * fighter.facing, getRockCount(size.id), tier.color);
    renderer.restore();
  }

  drawBarrier(renderer, fighter, tier) {
    const centerX = fighter.x;
    const centerY = fighter.y - fighter.height * style.barrierCenter;
    const radiusX = fighter.height * style.barrierRadiusX * tier.barrierScale;
    const radiusY = fighter.height * style.barrierRadiusY * tier.barrierScale;
    const pulse = (Math.sin(fighter.animation.time * style.barrierPulseSpeed * TAU) + 1) / 2;
    renderer.drawGlow(centerX, centerY, radiusY * style.barrierGlowScale, tier.color, style.barrierGlowAlpha);
    renderer.setAlpha(lerp(style.barrierAlpha[0], style.barrierAlpha[1], pulse));
    renderer.strokeEllipse(centerX, centerY, radiusX, radiusY, tier.color, style.barrierLineWidth);
  }

  refreshBolt(bolt, time, jitter, branchScale) {
    if (time >= bolt.refreshedAt && time - bolt.refreshedAt < style.boltRefresh) {
      return;
    }
    bolt.refreshedAt = time;
    const last = bolt.offsets.length - 1;
    for (let index = 0; index <= last; index += 1) {
      const envelope = Math.sin((index / last) * Math.PI);
      bolt.offsets[index] = (this.random() * 2 - 1) * jitter * envelope;
      bolt.branchOffsets[index] = (this.random() * 2 - 1) * jitter * branchScale * envelope;
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
    const { bolts } = this.getChannelView(fighter);
    const { powerTargetX: targetX, powerTargetY: targetY } = fighter.combat;
    const time = fighter.animation.time;
    const count = Math.min(tier.bolts, bolts.length);
    for (let index = 0; index < count; index += 1) {
      const bolt = bolts[index];
      const boltTargetY = targetY + style.boltTargetOffsets[index];
      this.refreshBolt(bolt, time, style.boltJitter, style.branchJitterScale);
      this.tracePoints(bolt.points, bolt.offsets, originX, originY, targetX, boltTargetY);
      renderer.setAlpha(style.boltGlowAlpha);
      renderer.polyline(bolt.points, tier.color, tier.boltWidth * style.boltGlowScale);
      if (index === 0 && tier.branch) {
        this.tracePoints(bolt.branch, bolt.branchOffsets, originX, originY, targetX, boltTargetY);
        renderer.setAlpha(style.branchAlpha);
        renderer.polyline(bolt.branch, tier.color, tier.boltWidth * style.branchWidthScale);
      }
      renderer.setAlpha(1);
      renderer.polyline(bolt.points, tier.color, tier.boltWidth);
      renderer.polyline(bolt.points, colors.saberCore, tier.boltWidth * style.coreWidthScale);
    }
    renderer.drawGlow(targetX, targetY, tier.glowRadius * style.impactGlowScale, tier.color, tier.glowAlpha);
  }

  drawStormArcs(renderer, fighter, pose, tier) {
    const storm = style.storm;
    const { arcs } = this.getChannelView(fighter);
    const time = fighter.animation.time;
    const count = Math.min(tier.stormArcs, arcs.length);
    for (let index = 0; index < count; index += 1) {
      const arc = arcs[index];
      const ends = placeBodyArc(index, pose);
      this.refreshBolt(arc, time, storm.arcJitter, 0);
      this.tracePoints(
        arc.points, arc.offsets,
        fighter.x + fighter.facing * ends[0], fighter.y + ends[1],
        fighter.x + fighter.facing * ends[2], fighter.y + ends[3],
      );
      renderer.setAlpha(storm.arcGlowAlpha);
      renderer.polyline(arc.points, tier.color, tier.boltWidth * storm.arcGlowScale);
      renderer.setAlpha(storm.arcAlpha);
      renderer.polyline(arc.points, tier.color, tier.boltWidth * storm.arcWidthScale);
      renderer.polyline(arc.points, colors.saberCore, tier.boltWidth * storm.arcWidthScale * style.coreWidthScale);
    }
    renderer.setAlpha(1);
  }
}

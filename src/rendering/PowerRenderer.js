import { getPowerTier, resolveLevelBand } from '../combat/flowInteractions.js';
import { getPowerRange, isBarrierUp, isChannelOpen, isUsingPower } from '../combat/PowerSystem.js';
import { isStormShieldUp } from '../combat/StormSystem.js';
import { hasStatus } from '../combat/StatusSystem.js';
import { effectsConfig } from '../config/effectsConfig.js';
import { powersConfig } from '../config/powersConfig.js';
import { projectilesConfig } from '../config/projectilesConfig.js';
import { colors } from '../config/themeConfig.js';
import { easeOutCubic } from '../utils/easing.js';
import { TAU, clamp, lerp } from '../utils/math.js';
import { createRandom } from '../utils/random.js';
import { drawFighterBody } from './fighterRenderer.js';
import { drawRockCluster, getRockCount, getRockScale } from './rockCluster.js';

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
    arcs: Array.from({ length: Math.max(style.maxBolts, style.storm.shieldArcs) }, () => createBolt(style.storm.arcSegments)),
    calls: style.storm.callSpread.map(() => createBolt(style.storm.callSegments)),
  };
}

export function getStormDarkness(fighters) {
  let darkness = 0;
  for (const fighter of fighters) {
    const { power, powerEndTime } = fighter.combat;
    if (!isUsingPower(fighter) || !power.stormPhases) continue;
    const phases = power.stormPhases;
    const amount = fighter.stateTime < phases.invocation
      ? fighter.stateTime / phases.invocation
      : powerEndTime > 0 ? 1 - (fighter.stateTime - powerEndTime) / phases.recovery : 1;
    darkness = Math.max(darkness, clamp(amount, 0, 1));
  }
  return darkness * style.storm.darkAlpha;
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

  draw(renderer, fighters, poses = null, floorY = null) {
    renderer.save();
    renderer.setBlendMode('lighter');
    for (const fighter of fighters) {
      if (isUsingPower(fighter) && fighter.combat.power.stormPhases) {
        this.drawStorm(renderer, fighter, poses?.get(fighter) ?? null, floorY ?? fighter.y);
      } else if (isUsingPower(fighter)) {
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

  drawAura(renderer, fighter, pose, floorY) {
    const { combat } = fighter;
    if (!(combat.focusTime > 0) && !(combat.wrathTime > 0)) {
      return;
    }
    const status = style.status;
    const color = getPowerTier(combat.statusLevel, powersConfig.tiers).color;
    const time = fighter.animation.time;
    renderer.save();
    if (combat.wrathTime > 0) {
      const outline = status.wrathOutline;
      const flicker = (Math.sin(time * outline.flicker[0]) + Math.sin(time * outline.flicker[1]) + 2) / 4;
      const offset = lerp(outline.offset[0], outline.offset[1], flicker);
      renderer.setAlpha(lerp(outline.alpha[0], outline.alpha[1], flicker));
      this.drawOffsetSilhouettes(renderer, fighter, pose, floorY, color, offset, offset * outline.rise);
    } else {
      const outline = status.focusOutline;
      const breath = (Math.sin(time * outline.speed) + 1) / 2;
      renderer.setAlpha(lerp(outline.alpha[0], outline.alpha[1], breath));
      this.drawOffsetSilhouettes(renderer, fighter, pose, floorY, color, outline.offset, outline.offset);
    }
    renderer.restore();
  }

  drawOffsetSilhouettes(renderer, fighter, pose, floorY, color, side, up) {
    for (let index = 0; index < 4; index += 1) {
      const offsetX = index === 0 ? side : index === 1 ? -side : 0;
      const offsetY = index === 2 ? -up : index === 3 ? side : 0;
      renderer.translate(offsetX, offsetY);
      drawFighterBody(renderer, fighter, pose, floorY, false, color);
      renderer.translate(-offsetX, -offsetY);
    }
  }

  drawFocusMotes(renderer, fighter, tier, time) {
    const motes = style.status.focusMotes;
    const centerY = fighter.y - fighter.height * motes.height;
    for (let index = 0; index < motes.count; index += 1) {
      const angle = time * motes.speed + (index / motes.count) * TAU;
      const depth = (Math.sin(angle) + 1) / 2;
      renderer.drawGlow(
        fighter.x + Math.cos(angle) * fighter.height * motes.radiusX,
        centerY + Math.sin(angle) * fighter.height * motes.radiusY,
        motes.size, tier.color, motes.alpha * lerp(0.45, 1, depth),
      );
    }
  }

  drawWrathEmbers(renderer, fighter, tier, time) {
    const embers = style.status.wrathEmbers;
    const baseY = fighter.y - fighter.height * embers.height;
    for (let index = 0; index < embers.count; index += 1) {
      const progress = (time * embers.rate + index / embers.count) % 1;
      const lane = Math.sin(index * 12.9898) * 0.5;
      const x = fighter.x + lane * fighter.width * embers.spread + Math.sin((progress + index) * TAU) * 3;
      const y = baseY - progress * embers.rise;
      renderer.setAlpha(embers.alpha * (1 - progress));
      renderer.line(x, y, x, y + embers.length, tier.color, embers.width);
    }
    renderer.setAlpha(1);
  }

  drawSanctuary(renderer, fighter, tier, time) {
    const status = style.status;
    const maxShield = powersConfig.powers.sanctuary.shield * fighter.stats.power.potency;
    const integrity = clamp(fighter.combat.sanctuaryShield / maxShield, 0, 1);
    const centerX = fighter.x;
    const centerY = fighter.y - fighter.height * status.sanctuaryCenter;
    const radiusX = fighter.height * status.sanctuaryRadiusX;
    const radiusY = fighter.height * status.sanctuaryRadiusY;
    const pulse = (Math.sin(time * status.sanctuaryPulseSpeed * TAU) + 1) / 2;
    renderer.drawGlow(centerX, centerY, radiusY, tier.color, status.sanctuaryGlowAlpha * (0.5 + integrity / 2));
    renderer.setAlpha(lerp(status.sanctuaryAlpha[0], status.sanctuaryAlpha[1], pulse) * (0.5 + integrity / 2));
    renderer.strokeEllipse(centerX, centerY, radiusX, radiusY, tier.color, status.sanctuaryLineWidth);
    const [first, second] = status.sanctuaryCrackSteps;
    const cracks = integrity <= second ? status.sanctuaryCracks.length : integrity <= first ? status.sanctuaryCracks.length / 2 : 0;
    for (let index = 0; index < cracks; index += 1) {
      const [from, to] = status.sanctuaryCracks[index];
      const middle = (from + to) / 2;
      const depth = 1 - status.sanctuaryCrackDepth;
      renderer.line(
        centerX + Math.cos(from) * radiusX, centerY + Math.sin(from) * radiusY,
        centerX + Math.cos(middle) * radiusX * depth, centerY + Math.sin(middle) * radiusY * depth,
        tier.color, status.sanctuaryLineWidth * 0.6,
      );
      renderer.line(
        centerX + Math.cos(middle) * radiusX * depth, centerY + Math.sin(middle) * radiusY * depth,
        centerX + Math.cos(to) * radiusX, centerY + Math.sin(to) * radiusY,
        tier.color, status.sanctuaryLineWidth * 0.6,
      );
    }
    renderer.setAlpha(1);
  }

  drawConfusion(renderer, fighter, tier, time) {
    const status = style.status;
    const centerX = fighter.x;
    const centerY = fighter.y - fighter.height * status.confuseHeight;
    for (let ring = 0; ring < status.confuseRings; ring += 1) {
      const progress = (time * status.confuseRate + ring / status.confuseRings) % 1;
      const radius = fighter.height * lerp(status.confuseRadius[0], status.confuseRadius[1], progress);
      const warpX = 1 + Math.sin(time * status.confuseWarpSpeed[0] + ring * 2.1) * status.confuseWarp[0];
      const warpY = 1 + Math.cos(time * status.confuseWarpSpeed[1] + ring * 1.3) * status.confuseWarp[1];
      renderer.setAlpha(status.confuseAlpha * (1 - progress));
      renderer.strokeEllipse(centerX, centerY, radius * warpX, radius * status.confuseSquash * warpY, tier.color, status.confuseLineWidth);
    }
    renderer.setAlpha(1);
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
      this.drawFocusMotes(renderer, fighter, tier, time);
    }
    if (combat.wrathTime > 0) {
      const [fast, slow] = status.wrathFlicker;
      const flicker = (Math.sin(time * fast) + Math.sin(time * slow) + 2) / 4;
      renderer.drawGlow(x, y - height * status.wrathHeight, tier.glowRadius * status.wrathRadius, tier.color, lerp(status.wrathAlpha[0], status.wrathAlpha[1], flicker));
      this.drawWrathEmbers(renderer, fighter, tier, time);
    }
    if (combat.confuseTime > 0) {
      this.drawConfusion(renderer, fighter, tier, time);
    }
    if (combat.sanctuaryTime > 0 && combat.sanctuaryShield > 0) {
      this.drawSanctuary(renderer, fighter, tier, time);
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
    } else if (isChannelOpen(fighter) && power.effect === 'drain') {
      this.drawDrain(renderer, fighter, tier, originX, originY);
    } else if (fighter.combat.absorbTime > 0) {
      renderer.drawGlow(originX, originY, tier.glowRadius * style.absorbGlowScale, tier.color, tier.glowAlpha);
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
    drawRockCluster(renderer, x, y, size.radius * getRockScale(size.id), fighter.stateTime * rocks.riseSpin * fighter.facing, getRockCount(size.id), tier.color);
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

  drawDrain(renderer, fighter, tier, originX, originY) {
    const drain = style.drain;
    const { powerTargetX: targetX, powerTargetY: targetY } = fighter.combat;
    const length = Math.hypot(originX - targetX, originY - targetY) || 1;
    const reach = clamp((Math.abs(targetX - fighter.x) - fighter.width / 2) / getPowerRange(fighter, fighter.combat.power), 0, 1);
    const thin = 1 - clamp((reach - drain.thinFrom) / (1 - drain.thinFrom), 0, 1) * (1 - drain.thinAlpha);
    const normalX = -(originY - targetY) / length;
    const normalY = (originX - targetX) / length;
    renderer.setAlpha(drain.lineAlpha * thin);
    renderer.line(targetX, targetY, originX, originY, tier.color, drain.lineWidth);
    renderer.setAlpha(1);
    const phase = fighter.animation.time * drain.cyclesPerSecond;
    for (let index = 0; index < drain.motes; index += 1) {
      const t = (phase + index / drain.motes) % 1;
      const wobble = Math.sin((t + index) * Math.PI * 2) * drain.wobble * (1 - t);
      const x = lerp(targetX, originX, t) + normalX * wobble;
      const y = lerp(targetY, originY, t) + normalY * wobble;
      renderer.drawGlow(x, y, drain.moteRadius * lerp(1, 0.5, t), tier.color, drain.moteAlpha * thin);
    }
    renderer.drawGlow(originX, originY, tier.glowRadius * style.absorbGlowScale, tier.color, tier.glowAlpha * thin);
  }

  drawStorm(renderer, fighter, pose, floorY) {
    const tier = getPowerTier(fighter.flowLevel, powersConfig.tiers);
    const phases = fighter.combat.power.stormPhases;
    if (fighter.stateTime < phases.invocation) {
      if (pose) {
        this.drawStormArcs(renderer, fighter, pose, tier);
        this.drawStormCall(renderer, fighter, pose, tier, phases);
      }
    } else if (isStormShieldUp(fighter)) {
      this.drawStormShield(renderer, fighter, tier);
    }
    this.drawStormMarks(renderer, fighter, tier, floorY);
  }

  drawStormCall(renderer, fighter, pose, tier, phases) {
    const storm = style.storm;
    const { calls } = this.getChannelView(fighter);
    const scaleX = fighter.facing * (pose.turnScale ?? 1);
    const handX = fighter.x + scaleX * pose.freeHandX;
    const handY = fighter.y + pose.freeHandY - pose.bodyLift;
    const rise = easeOutCubic(clamp(fighter.stateTime / phases.invocation, 0, 1));
    const width = tier.boltWidth * storm.callWidthScale;
    const count = Math.min(tier.callBolts, calls.length);
    for (let index = 0; index < count; index += 1) {
      const call = calls[index];
      this.refreshBolt(call, fighter.animation.time, storm.callJitter, 0);
      this.tracePoints(call.points, call.offsets, handX, handY, handX + storm.callSpread[index] * rise, lerp(handY, storm.skyY, rise));
      renderer.setAlpha(style.boltGlowAlpha);
      renderer.polyline(call.points, tier.color, width * style.boltGlowScale);
      renderer.setAlpha(1);
      renderer.polyline(call.points, tier.color, width);
      renderer.polyline(call.points, colors.saberCore, width * style.coreWidthScale);
    }
    renderer.drawGlow(handX, handY, tier.glowRadius * storm.callGlowScale * rise, tier.color, tier.glowAlpha);
  }

  drawStormShield(renderer, fighter, tier) {
    const storm = style.storm;
    const { arcs } = this.getChannelView(fighter);
    const time = fighter.animation.time;
    const centerX = fighter.x;
    const centerY = fighter.y - fighter.height / 2;
    const radiusX = fighter.height * storm.shieldRadiusX;
    const radiusY = fighter.height * storm.shieldRadiusY;
    renderer.drawGlow(centerX, centerY, radiusY * storm.shieldGlowScale * 2, tier.color, storm.shieldGlowAlpha);
    for (let index = 0; index < storm.shieldArcs; index += 1) {
      const arc = arcs[index];
      const from = (index / storm.shieldArcs) * TAU + time * storm.shieldSpin;
      const to = from + storm.shieldSpan;
      this.refreshBolt(arc, time, storm.arcJitter, 0);
      this.tracePoints(
        arc.points, arc.offsets,
        centerX + Math.cos(from) * radiusX, centerY + Math.sin(from) * radiusY,
        centerX + Math.cos(to) * radiusX, centerY + Math.sin(to) * radiusY,
      );
      renderer.setAlpha(storm.arcGlowAlpha);
      renderer.polyline(arc.points, tier.color, tier.boltWidth * storm.arcGlowScale);
      renderer.setAlpha(storm.arcAlpha);
      renderer.polyline(arc.points, tier.color, tier.boltWidth * storm.arcWidthScale);
    }
    renderer.setAlpha(1);
  }

  drawStormMarks(renderer, fighter, tier, floorY) {
    const storm = style.storm;
    const { stormMarks, power } = fighter.combat;
    if (!stormMarks) return;
    for (const mark of stormMarks) {
      if (!mark.active) continue;
      const progress = easeOutCubic(clamp((fighter.stateTime - mark.markTime) / (mark.impactTime - mark.markTime), 0, 1));
      const radiusX = power.strikeWidth * lerp(storm.markWidthScale[0], storm.markWidthScale[1], progress);
      const alpha = lerp(storm.markAlpha[0], storm.markAlpha[1], progress);
      renderer.setAlpha(alpha * storm.markFillAlpha);
      renderer.fillEllipse(mark.x, floorY, radiusX, storm.markRadiusY, tier.color);
      renderer.setAlpha(alpha);
      renderer.strokeEllipse(mark.x, floorY, radiusX, storm.markRadiusY, tier.color, storm.markLineWidth);
      renderer.setAlpha(storm.columnAlpha * progress);
      renderer.line(mark.x, floorY, mark.x, floorY - storm.columnHeight, tier.color, power.strikeWidth * 0.5);
    }
    renderer.setAlpha(1);
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

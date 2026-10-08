import { proportions, saberStyle } from '../config/fighterVisualConfig.js';
import { colors } from '../config/themeConfig.js';
import { FighterState } from '../entities/fighterStates.js';

const HILT_BEHIND_HAND = 0.4;
const HILT_IN_FRONT_OF_HAND = 0.6;

function createBladeGeometry() {
  return {
    hiltStartX: 0,
    hiltStartY: 0,
    baseX: 0,
    baseY: 0,
    tipX: 0,
    tipY: 0,
  };
}

const blade = createBladeGeometry();
const secondBlade = createBladeGeometry();

function placeBlade(out, fighter, pose, angle, handX, handY, lengthScale) {
  const directionX = Math.cos(angle);
  const directionY = Math.sin(angle);
  const hiltLength = fighter.height * proportions.hiltLength * fighter.appearance.hiltScale;
  const bladeLength = fighter.appearance.bladeLength * pose.bladeExtension * lengthScale;

  out.hiltStartX = handX - directionX * hiltLength * HILT_BEHIND_HAND;
  out.hiltStartY = handY - directionY * hiltLength * HILT_BEHIND_HAND;
  out.baseX = handX + directionX * hiltLength * HILT_IN_FRONT_OF_HAND;
  out.baseY = handY + directionY * hiltLength * HILT_IN_FRONT_OF_HAND;
  out.tipX = out.baseX + directionX * bladeLength;
  out.tipY = out.baseY + directionY * bladeLength;
  return out;
}

function updateBladeGeometry(fighter, pose) {
  return placeBlade(blade, fighter, pose, pose.bladeAngle, pose.handX, pose.handY, 1);
}

function updateSecondBladeGeometry(fighter, pose) {
  const { dualBlade } = fighter.appearance;
  return placeBlade(
    secondBlade, fighter, pose,
    pose.bladeAngle + (dualBlade.angleOffsetDegrees * Math.PI) / 180,
    pose.handX + dualBlade.offsetX * fighter.height,
    pose.handY + dualBlade.offsetY * fighter.height,
    dualBlade.lengthScale,
  );
}

function toWorldX(fighter, pose, localX, localY) {
  const rotatedX = localX * Math.cos(pose.bodyRotation) - localY * Math.sin(pose.bodyRotation);
  return fighter.x + fighter.facing * rotatedX;
}

function toWorldY(fighter, pose, localX, localY) {
  const rotatedY = localX * Math.sin(pose.bodyRotation) + localY * Math.cos(pose.bodyRotation);
  return fighter.y + rotatedY - pose.bodyLift;
}

export function getBladeWorldPoints(fighter, pose, out) {
  updateBladeGeometry(fighter, pose);
  out.baseX = toWorldX(fighter, pose, blade.baseX, blade.baseY);
  out.baseY = toWorldY(fighter, pose, blade.baseX, blade.baseY);
  out.tipX = toWorldX(fighter, pose, blade.tipX, blade.tipY);
  out.tipY = toWorldY(fighter, pose, blade.tipX, blade.tipY);
  return out;
}

const worldBlade = { baseX: 0, baseY: 0, tipX: 0, tipY: 0 };

function isBladeLit(pose) {
  return pose.bladeVisible && pose.bladeExtension > 0;
}

export function drawSaberBodyLight(renderer, fighter, pose) {
  if (!isBladeLit(pose)) {
    return;
  }
  getBladeWorldPoints(fighter, pose, worldBlade);

  renderer.save();
  renderer.setBlendMode('lighter');
  renderer.drawGlow(
    (worldBlade.baseX + worldBlade.tipX) / 2,
    (worldBlade.baseY + worldBlade.tipY) / 2,
    saberStyle.bodyLightRadius,
    fighter.appearance.saberColor,
    saberStyle.bodyLightAlpha * pose.bladeExtension,
  );
  renderer.restore();
}

export function drawSaberFloorLight(renderer, fighter, pose, floorY) {
  if (!isBladeLit(pose)) {
    return;
  }
  updateBladeGeometry(fighter, pose);
  const centerX = fighter.x + (fighter.facing * (blade.baseX + blade.tipX)) / 2;

  renderer.save();
  renderer.setBlendMode('lighter');
  renderer.setAlpha(saberStyle.floorLightAlpha * pose.bladeExtension);
  renderer.fillEllipse(centerX, floorY, saberStyle.floorLightRadiusX, saberStyle.floorLightRadiusY, fighter.appearance.saberColor);
  renderer.restore();
}

function getGlowStrength(fighter) {
  if (fighter.state !== FighterState.STAGGERED) {
    return 1;
  }
  const wave = Math.abs(Math.sin(fighter.animation.time * saberStyle.staggerFlickerSpeed));
  return saberStyle.staggerFlickerMin + (1 - saberStyle.staggerFlickerMin) * wave;
}

function drawBlade(renderer, geometry, fighter, pose, flare) {
  const { saberColor, bladeWidthScale } = fighter.appearance;

  renderer.save();
  renderer.line(geometry.hiltStartX, geometry.hiltStartY, geometry.baseX, geometry.baseY, colors.saberHilt, saberStyle.hiltWidth * bladeWidthScale);
  if (!isBladeLit(pose)) {
    renderer.restore();
    return;
  }

  const glowStrength = getGlowStrength(fighter);
  renderer.setBlendMode('lighter');
  renderer.setAlpha(saberStyle.outerGlowAlpha * glowStrength);
  renderer.line(geometry.baseX, geometry.baseY, geometry.tipX, geometry.tipY, saberColor, saberStyle.outerGlowWidth * bladeWidthScale);
  if (flare > 0) {
    renderer.setAlpha(saberStyle.flareAlpha * flare);
    renderer.line(geometry.baseX, geometry.baseY, geometry.tipX, geometry.tipY, colors.saberFlare, saberStyle.flareWidth * bladeWidthScale);
  }
  renderer.setAlpha(saberStyle.glowAlpha * glowStrength);
  renderer.line(geometry.baseX, geometry.baseY, geometry.tipX, geometry.tipY, saberColor, saberStyle.glowWidth * bladeWidthScale);
  renderer.setAlpha(1);
  renderer.line(geometry.baseX, geometry.baseY, geometry.tipX, geometry.tipY, colors.saberCore, saberStyle.coreWidth * bladeWidthScale);
  renderer.restore();
}

export function drawSaber(renderer, fighter, pose, flare = 0) {
  renderer.save();
  renderer.translate(fighter.x, fighter.y);
  renderer.scale(fighter.facing, 1);
  renderer.translate(0, -pose.bodyLift);
  renderer.rotate(pose.bodyRotation);

  if (fighter.appearance.dualBlade) {
    drawBlade(renderer, updateSecondBladeGeometry(fighter, pose), fighter, pose, flare);
  }
  drawBlade(renderer, updateBladeGeometry(fighter, pose), fighter, pose, flare);

  renderer.restore();
}

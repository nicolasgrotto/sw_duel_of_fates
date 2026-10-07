import { proportions, saberStyle } from '../config/fighterVisualConfig.js';
import { colors } from '../config/themeConfig.js';
import { FighterState } from '../entities/fighterStates.js';

const HILT_BEHIND_HAND = 0.4;
const HILT_IN_FRONT_OF_HAND = 0.6;

const blade = {
  hiltStartX: 0,
  hiltStartY: 0,
  baseX: 0,
  baseY: 0,
  tipX: 0,
  tipY: 0,
};

function updateBladeGeometry(fighter, pose) {
  const directionX = Math.cos(pose.bladeAngle);
  const directionY = Math.sin(pose.bladeAngle);
  const hiltLength = fighter.height * proportions.hiltLength;
  const bladeLength = fighter.appearance.bladeLength * pose.bladeExtension;

  blade.hiltStartX = pose.handX - directionX * hiltLength * HILT_BEHIND_HAND;
  blade.hiltStartY = pose.handY - directionY * hiltLength * HILT_BEHIND_HAND;
  blade.baseX = pose.handX + directionX * hiltLength * HILT_IN_FRONT_OF_HAND;
  blade.baseY = pose.handY + directionY * hiltLength * HILT_IN_FRONT_OF_HAND;
  blade.tipX = blade.baseX + directionX * bladeLength;
  blade.tipY = blade.baseY + directionY * bladeLength;

  return blade;
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

export function drawSaber(renderer, fighter, pose, flare = 0) {
  updateBladeGeometry(fighter, pose);
  const { saberColor } = fighter.appearance;

  renderer.save();
  renderer.translate(fighter.x, fighter.y);
  renderer.scale(fighter.facing, 1);
  renderer.translate(0, -pose.bodyLift);
  renderer.rotate(pose.bodyRotation);

  renderer.line(blade.hiltStartX, blade.hiltStartY, blade.baseX, blade.baseY, colors.saberHilt, saberStyle.hiltWidth);

  if (!isBladeLit(pose)) {
    renderer.restore();
    return;
  }

  const glowStrength = getGlowStrength(fighter);
  renderer.setBlendMode('lighter');
  renderer.setAlpha(saberStyle.outerGlowAlpha * glowStrength);
  renderer.line(blade.baseX, blade.baseY, blade.tipX, blade.tipY, saberColor, saberStyle.outerGlowWidth);
  if (flare > 0) {
    renderer.setAlpha(saberStyle.flareAlpha * flare);
    renderer.line(blade.baseX, blade.baseY, blade.tipX, blade.tipY, colors.saberFlare, saberStyle.flareWidth);
  }
  renderer.setAlpha(saberStyle.glowAlpha * glowStrength);
  renderer.line(blade.baseX, blade.baseY, blade.tipX, blade.tipY, saberColor, saberStyle.glowWidth);
  renderer.setAlpha(1);
  renderer.line(blade.baseX, blade.baseY, blade.tipX, blade.tipY, colors.saberCore, saberStyle.coreWidth);

  renderer.restore();
}

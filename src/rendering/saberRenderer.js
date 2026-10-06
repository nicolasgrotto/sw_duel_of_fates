import { proportions, saberStyle } from '../config/fighterVisualConfig.js';
import { colors } from '../config/themeConfig.js';

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
  const bladeLength = fighter.appearance.bladeLength;

  blade.hiltStartX = pose.handX - directionX * hiltLength * HILT_BEHIND_HAND;
  blade.hiltStartY = pose.handY - directionY * hiltLength * HILT_BEHIND_HAND;
  blade.baseX = pose.handX + directionX * hiltLength * HILT_IN_FRONT_OF_HAND;
  blade.baseY = pose.handY + directionY * hiltLength * HILT_IN_FRONT_OF_HAND;
  blade.tipX = blade.baseX + directionX * bladeLength;
  blade.tipY = blade.baseY + directionY * bladeLength;

  return blade;
}

export function drawSaberFloorLight(renderer, fighter, pose, floorY) {
  if (!pose.bladeVisible) {
    return;
  }
  updateBladeGeometry(fighter, pose);
  const centerX = fighter.x + (fighter.facing * (blade.baseX + blade.tipX)) / 2;

  renderer.save();
  renderer.setBlendMode('lighter');
  renderer.setAlpha(saberStyle.floorLightAlpha);
  renderer.fillEllipse(centerX, floorY, saberStyle.floorLightRadiusX, saberStyle.floorLightRadiusY, fighter.appearance.saberColor);
  renderer.restore();
}

export function drawSaber(renderer, fighter, pose) {
  updateBladeGeometry(fighter, pose);
  const { saberColor } = fighter.appearance;

  renderer.save();
  renderer.translate(fighter.x, fighter.y);
  renderer.scale(fighter.facing, 1);
  renderer.translate(0, -pose.bodyLift);
  renderer.rotate(pose.bodyRotation);

  renderer.line(blade.hiltStartX, blade.hiltStartY, blade.baseX, blade.baseY, colors.saberHilt, saberStyle.hiltWidth);

  if (!pose.bladeVisible) {
    renderer.restore();
    return;
  }

  renderer.setBlendMode('lighter');
  renderer.setAlpha(saberStyle.outerGlowAlpha);
  renderer.line(blade.baseX, blade.baseY, blade.tipX, blade.tipY, saberColor, saberStyle.outerGlowWidth);
  renderer.setAlpha(saberStyle.glowAlpha);
  renderer.line(blade.baseX, blade.baseY, blade.tipX, blade.tipY, saberColor, saberStyle.glowWidth);
  renderer.setAlpha(1);
  renderer.line(blade.baseX, blade.baseY, blade.tipX, blade.tipY, colors.saberCore, saberStyle.coreWidth);

  renderer.restore();
}

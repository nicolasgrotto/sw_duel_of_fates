import { groundShadow, proportions } from '../config/fighterVisualConfig.js';
import { colors } from '../config/themeConfig.js';
import { clamp } from '../utils/math.js';

const legPoints = [0, 0, 0, 0, 0, 0];
const torsoPoints = [0, 0, 0, 0, 0, 0, 0, 0];
const capePoints = [0, 0, 0, 0, 0, 0, 0, 0];
const hoodTipPoints = [0, 0, 0, 0, 0, 0];

function setThreePoints(points, x0, y0, x1, y1, x2, y2) {
  points[0] = x0;
  points[1] = y0;
  points[2] = x1;
  points[3] = y1;
  points[4] = x2;
  points[5] = y2;
  return points;
}

function setFourPoints(points, x0, y0, x1, y1, x2, y2, x3, y3) {
  setThreePoints(points, x0, y0, x1, y1, x2, y2);
  points[6] = x3;
  points[7] = y3;
  return points;
}

function drawGroundShadow(renderer, fighter, floorY) {
  const heightAboveFloor = floorY - fighter.y;
  const scale = clamp(1 - heightAboveFloor / groundShadow.fadeHeight, groundShadow.minScale, 1);
  const radiusX = fighter.width * groundShadow.radiusXRatio * scale;

  renderer.fillEllipse(fighter.x, floorY, radiusX, groundShadow.radiusY * scale, colors.groundShadow);
}

function drawLeg(renderer, pose, kneeX, kneeY, footX, footY, color, width) {
  setThreePoints(legPoints, pose.hipX, pose.hipY, kneeX, kneeY, footX, footY);
  renderer.polyline(legPoints, color, width);
}

function drawCape(renderer, fighter, pose, shoulderWidth, flare, cloakColor) {
  const sway = pose.clothSway;

  setFourPoints(
    capePoints,
    pose.shoulderX + shoulderWidth / 2, pose.shoulderY,
    pose.shoulderX - shoulderWidth, pose.shoulderY,
    pose.hipX - shoulderWidth - flare * 1.6 - sway, -3,
    pose.hipX + shoulderWidth / 2 - sway / 2, -3,
  );
  renderer.fillPolygon(capePoints, cloakColor);
}

function drawTorso(renderer, fighter, pose, shoulderWidth, flare, cloakColor) {
  const hemY = pose.hipY + fighter.height * proportions.tunicLength;
  const sway = pose.clothSway;

  setFourPoints(
    torsoPoints,
    pose.shoulderX - shoulderWidth, pose.shoulderY,
    pose.shoulderX + shoulderWidth, pose.shoulderY,
    pose.hipX + shoulderWidth + flare - sway / 2, hemY,
    pose.hipX - shoulderWidth - flare - sway, hemY,
  );
  renderer.fillPolygon(torsoPoints, cloakColor);
}

function drawPauldrons(renderer, pose, shoulderWidth, trimColor) {
  const radius = shoulderWidth * 0.62;
  renderer.fillCircle(pose.shoulderX - shoulderWidth * 0.7, pose.shoulderY + radius * 0.4, radius, trimColor);
  renderer.fillCircle(pose.shoulderX + shoulderWidth * 0.7, pose.shoulderY + radius * 0.4, radius, trimColor);
}

function drawMask(renderer, pose, trimColor, bodyColor) {
  const { headX, headY, headRadius: radius } = pose;
  renderer.fillCircle(headX + radius * 0.3, headY + radius * 0.1, radius * 0.75, trimColor);
  renderer.line(headX - radius * 0.1, headY, headX + radius * 0.8, headY, bodyColor, radius * 0.1);
}

function drawHead(renderer, fighter, pose, cloakColor, bodyColor, trimColor) {
  const { headX, headY, headRadius: radius } = pose;
  const { hoodUp, masked } = fighter.appearance;

  if (!hoodUp) {
    renderer.fillEllipse(headX - radius * 0.7, headY + radius * 0.9, radius, radius * 0.55, cloakColor);
    renderer.fillCircle(headX, headY, radius, bodyColor);
    return;
  }

  const hoodRadius = radius * 1.3;
  setThreePoints(
    hoodTipPoints,
    headX, headY - hoodRadius,
    headX - radius * 1.6, headY - radius * 1.3,
    headX - hoodRadius, headY,
  );
  renderer.fillPolygon(hoodTipPoints, cloakColor);
  renderer.fillCircle(headX, headY, hoodRadius, cloakColor);
  if (masked) {
    drawMask(renderer, pose, trimColor, bodyColor);
    return;
  }
  renderer.fillCircle(headX + radius * 0.3, headY + radius * 0.1, radius * 0.75, bodyColor);
}

function drawArms(renderer, fighter, pose, cloakColor, bodyColor) {
  const { height } = fighter;
  const armWidth = height * proportions.armWidth;

  renderer.line(pose.shoulderX - 3, pose.shoulderY + 4, pose.handX - 2, pose.handY, bodyColor, armWidth);
  renderer.line(pose.shoulderX + 3, pose.shoulderY + 3, pose.handX, pose.handY, cloakColor, armWidth);
  renderer.fillCircle(pose.handX, pose.handY, height * proportions.handRadius, bodyColor);
}

export function drawFighterBody(renderer, fighter, pose, floorY, withShadow = true, overrideColor = null) {
  const { height, appearance } = fighter;
  const cloakColor = overrideColor ?? appearance.cloakColor;
  const bodyColor = overrideColor ?? appearance.bodyColor;
  const trimColor = overrideColor ?? appearance.trimColor;
  const shoulderWidth = height * proportions.shoulderWidth * appearance.shoulderScale;
  const flare = height * proportions.tunicFlare;
  const legWidth = height * proportions.legWidth;

  if (withShadow) {
    drawGroundShadow(renderer, fighter, floorY);
  }

  renderer.save();
  renderer.translate(fighter.x, fighter.y);
  renderer.scale(fighter.facing, 1);
  renderer.translate(0, -pose.bodyLift);
  renderer.rotate(pose.bodyRotation);

  if (appearance.longCape) {
    drawCape(renderer, fighter, pose, shoulderWidth, flare, cloakColor);
  }
  drawLeg(renderer, pose, pose.backKneeX, pose.backKneeY, pose.backFootX, pose.backFootY, bodyColor, legWidth);
  drawLeg(renderer, pose, pose.frontKneeX, pose.frontKneeY, pose.frontFootX, pose.frontFootY, bodyColor, legWidth);
  drawTorso(renderer, fighter, pose, shoulderWidth, flare, cloakColor);
  if (appearance.pauldrons) {
    drawPauldrons(renderer, pose, shoulderWidth, trimColor);
  }
  drawHead(renderer, fighter, pose, cloakColor, bodyColor, trimColor);
  drawArms(renderer, fighter, pose, cloakColor, bodyColor);

  renderer.restore();
}

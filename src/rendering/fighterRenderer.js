import { faceDetails, finisherStyle, groundShadow, proportions } from '../config/fighterVisualConfig.js';
import { colors } from '../config/themeConfig.js';
import { clamp, lerp } from '../utils/math.js';

const legPoints = [0, 0, 0, 0, 0, 0];
const torsoPoints = [0, 0, 0, 0, 0, 0, 0, 0];
const capePoints = [0, 0, 0, 0, 0, 0, 0, 0];
const hoodTipPoints = [0, 0, 0, 0, 0, 0];
const tunicLayerPoints = [0, 0, 0, 0, 0, 0, 0, 0];
const hairPoints = new Array(faceDetails.hair.length * 2).fill(0);

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

function drawCutLeg(renderer, fighter, pose, kneeX, kneeY, color, width) {
  renderer.line(pose.hipX, pose.hipY, kneeX, kneeY, color, width);
  drawEmber(renderer, kneeX, kneeY, fighter.stateTime, fighter.height);
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
  const hemY = pose.hipY + fighter.height * proportions.tunicLength * (fighter.appearance.tunicLengthScale ?? 1);
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

function drawTunicLayer(renderer, trimColor) {
  const top = proportions.tunicLayerStart;
  const bottom = top + proportions.tunicLayerThickness / (torsoPoints[5] - torsoPoints[1]);
  setFourPoints(
    tunicLayerPoints,
    lerp(torsoPoints[0], torsoPoints[6], top), lerp(torsoPoints[1], torsoPoints[7], top),
    lerp(torsoPoints[2], torsoPoints[4], top), lerp(torsoPoints[3], torsoPoints[5], top),
    lerp(torsoPoints[2], torsoPoints[4], bottom), lerp(torsoPoints[3], torsoPoints[5], bottom),
    lerp(torsoPoints[0], torsoPoints[6], bottom), lerp(torsoPoints[1], torsoPoints[7], bottom),
  );
  renderer.fillPolygon(tunicLayerPoints, trimColor);
}

const scarfPoints = [0, 0, 0, 0, 0, 0];

function drawScarf(renderer, pose, trimColor, height) {
  const sway = pose.clothSway;
  setThreePoints(
    scarfPoints,
    pose.shoulderX - 2, pose.shoulderY + 2,
    pose.shoulderX - height * 0.18 - sway, pose.shoulderY + height * 0.05,
    pose.shoulderX - height * 0.34 - sway * 1.6, pose.shoulderY + height * 0.14,
  );
  renderer.polyline(scarfPoints, trimColor, height * 0.03);
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

function drawHair(renderer, pose, hairColor) {
  const { headX, headY, headRadius: radius } = pose;
  for (let index = 0; index < faceDetails.hair.length; index += 1) {
    hairPoints[index * 2] = headX + faceDetails.hair[index][0] * radius;
    hairPoints[index * 2 + 1] = headY + faceDetails.hair[index][1] * radius;
  }
  renderer.fillPolygon(hairPoints, hairColor);
}

function drawEyes(renderer, fighter, pose) {
  const eyes = faceDetails.eyes[fighter.stats?.alignment];
  if (!eyes || fighter.appearance.masked) return;
  const { headX, headY, headRadius: radius } = pose;
  const x = headX + radius * eyes.forward;
  const y = headY + radius * eyes.lift;
  renderer.drawGlow(x, y, radius * eyes.haloRadius, eyes.iris, eyes.haloAlpha);
  renderer.setAlpha(1);
  renderer.fillCircle(x, y, radius * eyes.irisRadius, eyes.iris);
  renderer.fillCircle(x, y, radius * eyes.pupilRadius, eyes.pupil);
}

export function drawEmber(renderer, x, y, time, height) {
  const alpha = clamp(1 - time / finisherStyle.emberDuration, 0, 1);
  if (alpha <= 0) return;
  renderer.save();
  renderer.setBlendMode('lighter');
  renderer.setAlpha(alpha);
  renderer.fillCircle(x, y, height * finisherStyle.emberRadius, colors.finisherEmber);
  renderer.restore();
}

const headPiecePose = { headX: 0, headY: 0, headRadius: 0 };

export function drawSeveredHead(renderer, fighter, x, y, angle) {
  const { appearance, height } = fighter;
  headPiecePose.headRadius = height * proportions.headRadius;
  renderer.save();
  renderer.translate(x, y);
  renderer.rotate(angle);
  drawHead(renderer, fighter, headPiecePose, appearance.cloakColor, appearance.bodyColor, appearance.trimColor, false);
  renderer.restore();
}

function drawHead(renderer, fighter, pose, cloakColor, bodyColor, trimColor, withFace) {
  const { headX, headY, headRadius: radius } = pose;
  const { hoodUp, masked, hairColor } = fighter.appearance;
  const faceColor = withFace ? fighter.appearance.faceColor ?? bodyColor : bodyColor;

  if (!hoodUp) {
    renderer.fillEllipse(headX - radius * 0.7, headY + radius * 0.9, radius, radius * 0.55, cloakColor);
    renderer.fillCircle(headX, headY, radius, faceColor);
    if (hairColor && withFace) drawHair(renderer, pose, hairColor);
    if (withFace) drawEyes(renderer, fighter, pose);
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
  renderer.fillCircle(headX + radius * 0.3, headY + radius * 0.1, radius * 0.75, faceColor);
  if (withFace) drawEyes(renderer, fighter, pose);
}

function drawArm(renderer, fighter, startX, startY, handX, handY, color, handColor, cut) {
  const { height } = fighter;
  const armWidth = height * proportions.armWidth;
  if (!cut) {
    renderer.line(startX, startY, handX, handY, color, armWidth);
    renderer.fillCircle(handX, handY, height * proportions.handRadius, handColor);
    return;
  }
  const elbowX = lerp(startX, handX, 0.5);
  const elbowY = lerp(startY, handY, 0.5);
  renderer.line(startX, startY, elbowX, elbowY, color, armWidth);
  drawEmber(renderer, elbowX, elbowY, fighter.stateTime, height);
}

function drawArms(renderer, fighter, pose, cloakColor, bodyColor, handColor, severed) {
  const backHandX = lerp(pose.handX - 2, pose.freeHandX, pose.offHand);
  const backHandY = lerp(pose.handY, pose.freeHandY, pose.offHand);
  if (pose.offHand > 0 || severed === 'backArm') {
    drawArm(renderer, fighter, pose.shoulderX - 3, pose.shoulderY + 4, backHandX, backHandY, bodyColor, handColor, severed === 'backArm');
  } else {
    renderer.line(pose.shoulderX - 3, pose.shoulderY + 4, backHandX, backHandY, bodyColor, fighter.height * proportions.armWidth);
  }
  drawArm(renderer, fighter, pose.shoulderX + 3, pose.shoulderY + 3, pose.handX, pose.handY, cloakColor, handColor, severed === 'frontArm');
}

export function drawFighterBody(renderer, fighter, pose, floorY, withShadow = true, overrideColor = null, severed = null) {
  const { height, appearance } = fighter;
  const cloakColor = overrideColor ?? appearance.cloakColor;
  const bodyColor = overrideColor ?? appearance.bodyColor;
  const trimColor = overrideColor ?? appearance.trimColor;
  const handColor = overrideColor ?? appearance.gloveColor ?? bodyColor;
  const shoulderWidth = height * proportions.shoulderWidth * appearance.shoulderScale;
  const flare = height * proportions.tunicFlare;
  const legWidth = height * proportions.legWidth;

  if (withShadow) {
    drawGroundShadow(renderer, fighter, floorY);
  }

  renderer.save();
  renderer.translate(fighter.x, fighter.y);
  renderer.scale(fighter.facing * (pose.turnScale ?? 1), 1);
  renderer.translate(0, -pose.bodyLift);
  renderer.rotate(pose.bodyRotation);

  if (appearance.longCape) {
    drawCape(renderer, fighter, pose, shoulderWidth, flare, cloakColor);
  }
  if (severed === 'backLeg') {
    drawCutLeg(renderer, fighter, pose, pose.backKneeX, pose.backKneeY, bodyColor, legWidth);
  } else {
    drawLeg(renderer, pose, pose.backKneeX, pose.backKneeY, pose.backFootX, pose.backFootY, bodyColor, legWidth);
  }
  if (severed === 'frontLeg') {
    drawCutLeg(renderer, fighter, pose, pose.frontKneeX, pose.frontKneeY, bodyColor, legWidth);
  } else {
    drawLeg(renderer, pose, pose.frontKneeX, pose.frontKneeY, pose.frontFootX, pose.frontFootY, bodyColor, legWidth);
  }
  const wound = overrideColor ? null : fighter.combat?.wound;
  if (wound === 'leg' && severed !== 'frontLeg') {
    drawLeg(renderer, pose, pose.frontKneeX, pose.frontKneeY, pose.frontFootX, pose.frontFootY, colors.woundShade, legWidth);
  }
  if (appearance.scarf) {
    drawScarf(renderer, pose, trimColor, height);
  }
  drawTorso(renderer, fighter, pose, shoulderWidth, flare, cloakColor);
  if (appearance.layeredTunic) {
    drawTunicLayer(renderer, trimColor);
  }
  if (appearance.pauldrons) {
    drawPauldrons(renderer, pose, shoulderWidth, trimColor);
  }
  if (severed === 'frontHead') {
    drawEmber(renderer, pose.headX, pose.headY + pose.headRadius, fighter.stateTime, height);
  } else {
    drawHead(renderer, fighter, pose, cloakColor, bodyColor, trimColor, !overrideColor);
  }
  drawArms(renderer, fighter, pose, cloakColor, bodyColor, handColor, severed);
  if (wound === 'arm' && severed !== 'frontArm') {
    renderer.line(pose.shoulderX + 3, pose.shoulderY + 3, pose.handX, pose.handY, colors.woundShade, height * proportions.armWidth);
  }

  renderer.restore();
}

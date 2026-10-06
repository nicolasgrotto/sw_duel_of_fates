import { proportions } from '../config/fighterVisualConfig.js';
import { degreesToRadians } from '../utils/math.js';

export function createPose() {
  return {
    hipX: 0,
    hipY: 0,
    shoulderX: 0,
    shoulderY: 0,
    headX: 0,
    headY: 0,
    headRadius: 0,
    frontKneeX: 0,
    frontKneeY: 0,
    frontFootX: 0,
    frontFootY: 0,
    backKneeX: 0,
    backKneeY: 0,
    backFootX: 0,
    backFootY: 0,
    handX: 0,
    handY: 0,
    bladeAngle: 0,
    clothSway: 0,
  };
}

function placeKnees(pose, kneeBend) {
  pose.frontKneeX = (pose.hipX + pose.frontFootX) / 2 + kneeBend;
  pose.frontKneeY = (pose.hipY + pose.frontFootY) / 2;
  pose.backKneeX = (pose.hipX + pose.backFootX) / 2 + kneeBend / 2;
  pose.backKneeY = (pose.hipY + pose.backFootY) / 2;
}

export function computePose(fighter, pose) {
  const { height, appearance } = fighter;
  const lean = degreesToRadians(appearance.torsoLeanDegrees);
  const torsoLength = height * proportions.torsoLength;
  const stanceWidth = height * proportions.stanceWidth;

  pose.hipX = 0;
  pose.hipY = -height * proportions.legLength;
  pose.shoulderX = pose.hipX + Math.sin(lean) * torsoLength;
  pose.shoulderY = pose.hipY - Math.cos(lean) * torsoLength;

  pose.headRadius = height * proportions.headRadius;
  const neckLength = pose.headRadius + height * proportions.neckGap;
  pose.headX = pose.shoulderX + Math.sin(lean) * neckLength;
  pose.headY = pose.shoulderY - Math.cos(lean) * neckLength;

  pose.frontFootX = stanceWidth;
  pose.frontFootY = 0;
  pose.backFootX = -stanceWidth;
  pose.backFootY = 0;
  placeKnees(pose, height * proportions.kneeBend);

  pose.handX = pose.shoulderX + height * proportions.handForward;
  pose.handY = pose.hipY - height * proportions.handHeight;
  pose.bladeAngle = degreesToRadians(appearance.guardAngleDegrees);
  pose.clothSway = 0;

  return pose;
}

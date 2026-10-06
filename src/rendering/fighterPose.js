import { animation as animationStyle, proportions } from '../config/fighterVisualConfig.js';
import { TAU, clamp, degreesToRadians, lerp } from '../utils/math.js';

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

function placeFeet(pose, fighter) {
  const { height, animation } = fighter;
  const { walkPhase, walkBlend, airBlend } = animation;
  const stanceWidth = height * proportions.stanceWidth;
  const stepOffset = Math.sin(walkPhase) * height * animationStyle.stepLength * walkBlend;
  const stepLift = height * animationStyle.stepLift * walkBlend;
  const tuck = height * animationStyle.airLegTuck * airBlend;
  const tuckedStance = stanceWidth * (1 - animationStyle.airFootPull);

  pose.frontFootX = lerp(stanceWidth + stepOffset, tuckedStance, airBlend);
  pose.frontFootY = -Math.max(0, Math.cos(walkPhase)) * stepLift - tuck;
  pose.backFootX = lerp(-stanceWidth - stepOffset, -tuckedStance, airBlend);
  pose.backFootY = -Math.max(0, -Math.cos(walkPhase)) * stepLift - tuck;
}

function placeKnees(pose, kneeBend) {
  pose.frontKneeX = (pose.hipX + pose.frontFootX) / 2 + kneeBend;
  pose.frontKneeY = (pose.hipY + pose.frontFootY) / 2;
  pose.backKneeX = (pose.hipX + pose.backFootX) / 2 + kneeBend / 2;
  pose.backKneeY = (pose.hipY + pose.backFootY) / 2;
}

export function computePose(fighter, pose) {
  const { height, appearance, animation } = fighter;
  const { time, walkPhase, walkBlend, airBlend } = animation;
  const lean = degreesToRadians(appearance.torsoLeanDegrees);
  const torsoLength = height * proportions.torsoLength;
  const breathWave = Math.sin((time * TAU) / animationStyle.breathPeriod);
  const breath = breathWave * animationStyle.breathAmplitude * (1 - walkBlend * animationStyle.walkBreathDamping);
  const walkBob = Math.abs(Math.sin(walkPhase)) * animationStyle.walkBob * walkBlend;

  pose.hipX = 0;
  pose.hipY = -height * proportions.legLength + walkBob;
  pose.shoulderX = pose.hipX + Math.sin(lean) * torsoLength;
  pose.shoulderY = pose.hipY - Math.cos(lean) * torsoLength - breath;

  pose.headRadius = height * proportions.headRadius;
  const neckLength = pose.headRadius + height * proportions.neckGap;
  pose.headX = pose.shoulderX + Math.sin(lean) * neckLength;
  pose.headY = pose.shoulderY - Math.cos(lean) * neckLength;

  placeFeet(pose, fighter);
  placeKnees(pose, height * proportions.kneeBend * (1 + airBlend));

  pose.handX = pose.shoulderX + height * proportions.handForward;
  pose.handY = pose.hipY - height * proportions.handHeight - breath / 2;
  pose.bladeAngle = degreesToRadians(appearance.guardAngleDegrees + breathWave * animationStyle.saberSwayDegrees);

  const forwardSpeed = fighter.vx * fighter.facing;
  pose.clothSway = clamp(forwardSpeed * animationStyle.clothDrag, -animationStyle.maxClothSway, animationStyle.maxClothSway);

  return pose;
}

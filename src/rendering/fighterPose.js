import { AttackPhase, getAttackPhase, getPhaseProgress } from '../combat/attackPhases.js';
import { animation as animationStyle, combatPoses, proportions } from '../config/fighterVisualConfig.js';
import { FighterState } from '../entities/fighterStates.js';
import { easeInOutSine, easeInQuad, easeOutCubic, easeOutQuad } from '../utils/easing.js';
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
    bladeVisible: true,
    bodyRotation: 0,
    bodyLift: 0,
    clothSway: 0,
  };
}

const combatPose = {
  leanDegrees: 0,
  crouch: 0,
  reach: 0,
  lift: 0,
  bladeDegrees: 0,
  bladeVisible: true,
  bodyRotationDegrees: 0,
  bodyLift: 0,
};

function resetCombatPose(guardDegrees) {
  combatPose.leanDegrees = 0;
  combatPose.crouch = 0;
  combatPose.reach = 0;
  combatPose.lift = 0;
  combatPose.bladeDegrees = guardDegrees;
  combatPose.bladeVisible = true;
  combatPose.bodyRotationDegrees = 0;
  combatPose.bodyLift = 0;
}

function applyAttackPose(fighter, guardDegrees) {
  const { attack, attackType } = fighter.combat;
  const style = combatPoses.attacks[attackType];
  const progress = getPhaseProgress(attack, fighter.stateTime);

  switch (getAttackPhase(attack, fighter.stateTime)) {
    case AttackPhase.STARTUP: {
      const amount = easeOutCubic(progress);
      combatPose.bladeDegrees = lerp(guardDegrees, style.windupDegrees, amount);
      combatPose.leanDegrees = lerp(0, style.windupLean, amount);
      combatPose.lift = lerp(0, style.windupLift, amount);
      break;
    }
    case AttackPhase.ACTIVE: {
      const amount = easeOutQuad(progress);
      combatPose.bladeDegrees = lerp(style.windupDegrees, style.strikeDegrees, amount);
      combatPose.leanDegrees = lerp(style.windupLean, style.strikeLean, amount);
      combatPose.lift = lerp(style.windupLift, 0, amount);
      combatPose.reach = lerp(0, style.strikeReach, amount);
      break;
    }
    default: {
      const amount = easeInOutSine(progress);
      combatPose.bladeDegrees = lerp(style.strikeDegrees, guardDegrees, amount);
      combatPose.leanDegrees = lerp(style.strikeLean, 0, amount);
      combatPose.reach = lerp(style.strikeReach, 0, amount);
      break;
    }
  }
}

function applyStunnedPose(fighter) {
  const style = combatPoses.stunned;
  const sway = Math.sin(fighter.stateTime * style.swaySpeed * TAU) * style.swayDegrees;

  combatPose.leanDegrees = style.lean;
  combatPose.crouch = style.crouch;
  combatPose.bladeDegrees = style.bladeDegrees + sway;
}

function resolveCombatPose(fighter, guardDegrees) {
  resetCombatPose(guardDegrees);

  switch (fighter.state) {
    case FighterState.ATTACKING:
    case FighterState.HEAVY_ATTACK:
      applyAttackPose(fighter, guardDegrees);
      break;
    case FighterState.BLOCKING: {
      const { block } = combatPoses;
      combatPose.bladeDegrees = block.bladeDegrees;
      combatPose.reach = block.reach;
      combatPose.lift = block.lift;
      combatPose.crouch = block.crouch;
      break;
    }
    case FighterState.DODGING: {
      const { dodge } = combatPoses;
      combatPose.leanDegrees = dodge.lean * fighter.combat.dodgeDirection * fighter.facing;
      combatPose.crouch = dodge.crouch;
      break;
    }
    case FighterState.HIT: {
      const { hit } = combatPoses;
      const recovery = 1 - easeOutQuad(clamp(fighter.stateTime / fighter.combat.stunDuration, 0, 1));
      combatPose.leanDegrees = hit.lean * recovery;
      combatPose.bladeDegrees = guardDegrees + hit.bladeDropDegrees * recovery;
      break;
    }
    case FighterState.STUNNED:
      applyStunnedPose(fighter);
      break;
    case FighterState.DEAD: {
      const { dead } = combatPoses;
      applyStunnedPose(fighter);
      combatPose.bladeVisible = false;
      const fall = easeInQuad(clamp(fighter.stateTime / dead.fallDuration, 0, 1));
      const backward = fighter.combat.fallDirection === -fighter.facing;
      combatPose.bodyRotationDegrees = (backward ? -1 : 1) * fall * dead.fallDegrees;
      combatPose.bodyLift = fall * dead.lift * fighter.height;
      break;
    }
    default:
      break;
  }
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
  const breathWave = Math.sin((time * TAU) / animationStyle.breathPeriod);
  const breath = breathWave * animationStyle.breathAmplitude * (1 - walkBlend * animationStyle.walkBreathDamping);
  const walkBob = Math.abs(Math.sin(walkPhase)) * animationStyle.walkBob * walkBlend;

  resolveCombatPose(fighter, appearance.guardAngleDegrees);

  const lean = degreesToRadians(appearance.torsoLeanDegrees + combatPose.leanDegrees);
  const torsoLength = height * proportions.torsoLength;

  pose.hipX = 0;
  pose.hipY = -height * proportions.legLength + walkBob + combatPose.crouch;
  pose.shoulderX = pose.hipX + Math.sin(lean) * torsoLength;
  pose.shoulderY = pose.hipY - Math.cos(lean) * torsoLength - breath;

  pose.headRadius = height * proportions.headRadius;
  const neckLength = pose.headRadius + height * proportions.neckGap;
  pose.headX = pose.shoulderX + Math.sin(lean) * neckLength;
  pose.headY = pose.shoulderY - Math.cos(lean) * neckLength;

  placeFeet(pose, fighter);
  placeKnees(pose, height * proportions.kneeBend * (1 + airBlend));

  pose.handX = pose.shoulderX + height * (proportions.handForward + combatPose.reach);
  pose.handY = pose.hipY - height * (proportions.handHeight + combatPose.lift) - breath / 2;
  pose.bladeAngle = degreesToRadians(combatPose.bladeDegrees + breathWave * animationStyle.saberSwayDegrees);
  pose.bladeVisible = combatPose.bladeVisible;
  pose.bodyRotation = degreesToRadians(combatPose.bodyRotationDegrees);
  pose.bodyLift = combatPose.bodyLift;

  const forwardSpeed = fighter.vx * fighter.facing;
  pose.clothSway = clamp(forwardSpeed * animationStyle.clothDrag, -animationStyle.maxClothSway, animationStyle.maxClothSway);

  return pose;
}

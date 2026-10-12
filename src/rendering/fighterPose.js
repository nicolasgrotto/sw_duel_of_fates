import { AttackPhase, getAttackPhase, getPhaseProgress } from '../combat/attackPhases.js';
import { combatRulesConfig } from '../config/combatRulesConfig.js';
import { effectsConfig } from '../config/effectsConfig.js';
import { animation as animationStyle, combatPoses, motionStyles, powerKeyframes, proportions, techniqueKeyframes } from '../config/fighterVisualConfig.js';
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
    bladeExtension: 1,
    bodyRotation: 0,
    bodyLift: 0,
    turnScale: 1,
    clothSway: 0,
    offHand: 0,
    freeHandX: 0,
    freeHandY: 0,
    computed: false,
    chain: createChainMemory(),
  };
}

const TRACK_CHANNELS = ['bladeDegrees', 'leanDegrees', 'crouch', 'reach', 'lift', 'step', 'slide', 'hip', 'offHand', 'offHandDegrees'];
const KEY_CHANNELS = { blade: 'bladeDegrees', lean: 'leanDegrees', crouch: 'crouch', reach: 'reach', lift: 'lift', step: 'step', slide: 'slide', hip: 'hip', offHand: 'offHand', offHandDegrees: 'offHandDegrees', twirl: 'twirl', turn: 'turn' };
const PHASE_OFFSET = { [AttackPhase.STARTUP]: 0, [AttackPhase.ACTIVE]: 1, [AttackPhase.RECOVERY]: 2 };
const TRACK_END = 3;
const EASINGS = {
  linear: (t) => t,
  in: easeInQuad,
  out: easeOutCubic,
  outQuad: easeOutQuad,
  inOut: easeInOutSine,
};

function createChainMemory() {
  return {
    attack: null,
    stateTime: 0,
    wasAttack: false,
    blending: false,
    origin: new Float64Array(TRACK_CHANNELS.length),
    last: new Float64Array(TRACK_CHANNELS.length),
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
  step: 0,
  slide: 0,
  hip: 0,
  offHand: 0,
  offHandDegrees: 0,
  turn: 0,
};

function resetCombatPose(guardDegrees) {
  combatPose.step = 0;
  combatPose.slide = 0;
  combatPose.hip = 0;
  combatPose.offHand = 0;
  combatPose.offHandDegrees = combatPoses.keyframeDefaults.offHandDegrees;
  combatPose.turn = 0;
  combatPose.leanDegrees = 0;
  combatPose.crouch = 0;
  combatPose.reach = 0;
  combatPose.lift = 0;
  combatPose.bladeDegrees = guardDegrees;
  combatPose.bladeVisible = true;
  combatPose.bodyRotationDegrees = 0;
  combatPose.bodyLift = 0;
}

function resolveAttackPoses(style) {
  const attacks = {};
  for (const [key, pose] of Object.entries(combatPoses.attacks)) {
    attacks[key] = { ...pose, followThrough: style.followThrough, recoveryTwirl: 0, ...style.attacks[key] };
  }
  const attackTypes = {};
  for (const [key, { from, ...override }] of Object.entries(style.attackTypes)) {
    attackTypes[key] = { ...attacks[from], ...override };
  }
  return { attacks, attackTypes };
}

function resolveTrackKey(key, defaults) {
  const values = { ...defaults };
  for (const [name, channel] of Object.entries(KEY_CHANNELS)) {
    if (key[name] !== undefined) values[channel] = key[name];
  }
  return { time: PHASE_OFFSET[key.phase] + key.at, ease: EASINGS[key.ease ?? 'inOut'], values };
}

function resolveTrack(keys) {
  const defaults = { bladeDegrees: null, twirl: 0, turn: combatPoses.keyframeDefaults.turn };
  for (const channel of TRACK_CHANNELS) {
    if (channel !== 'bladeDegrees') defaults[channel] = combatPoses.keyframeDefaults[channel];
  }
  const track = [resolveTrackKey({ phase: AttackPhase.STARTUP, at: 0 }, defaults)];
  for (const key of keys) track.push(resolveTrackKey(key, defaults));
  if (track.at(-1).time < TRACK_END) track.push(resolveTrackKey({ phase: AttackPhase.RECOVERY, at: 1 }, defaults));
  return track;
}

function resolveKeyframes(style) {
  if (!style.keyframes) return null;
  return Object.fromEntries(Object.entries(style.keyframes).map(([id, keys]) => [id, resolveTrack(keys)]));
}

function resolveMotionStyle(style) {
  return {
    ...style,
    ...resolveAttackPoses(style),
    tracks: resolveKeyframes(style),
    block: { ...combatPoses.block, ...style.block },
    lock: { ...motionStyles.standard.lock, ...style.lock },
    lockVictory: { ...motionStyles.standard.lockVictory, ...style.lockVictory },
  };
}

export const noLockContext = Object.freeze({ advantage: 0, victory: false, flourish: false });

export function getBladeLockAdvantage(fighter, fighters) {
  const opponent = fighters[fighter.combat.lockOpponent];
  if (fighter.state !== FighterState.BLADE_LOCK || !opponent) {
    return 0;
  }
  return clamp((fighter.combat.lockPresses - opponent.combat.lockPresses) / combatRulesConfig.bladeLock.winMargin, -1, 1);
}

function getLockEntry(fighter) {
  return easeOutCubic(clamp(fighter.combat.lockTime / combatPoses.bladeLock.entryDuration, 0, 1));
}

function getLockPressPush(fighter) {
  const { lockTime, lockLastPress, lockPresses } = fighter.combat;
  const elapsed = lockTime - lockLastPress;
  if (lockPresses === 0 || elapsed >= combatPoses.bladeLock.pressPushDuration) {
    return 0;
  }
  return 1 - elapsed / combatPoses.bladeLock.pressPushDuration;
}

function applyBladeLockPose(fighter, motion, advantage) {
  const { lock } = motion;
  const entry = getLockEntry(fighter);
  combatPose.leanDegrees = (lock.lean + advantage * lock.advantageLean) * entry;
  combatPose.crouch = (lock.crouch + Math.max(0, -advantage) * lock.advantageCrouch) * entry;
  combatPose.reach = (lock.reach + getLockPressPush(fighter) * lock.pressPush) * entry;
  combatPose.lift = lock.lift * entry;
}

function applyLockVictoryPose(fighter, guardDegrees, motion) {
  const victory = motion.lockVictory;
  const progress = clamp(fighter.stateTime / fighter.combat.stunDuration, 0, 1);
  if (progress < victory.sweepShare) {
    const amount = easeOutQuad(progress / victory.sweepShare);
    combatPose.bladeDegrees = lerp(victory.fromDegrees, victory.sweepDegrees, amount);
    combatPose.leanDegrees = victory.lean * amount;
    return;
  }
  const amount = easeInOutSine((progress - victory.sweepShare) / (1 - victory.sweepShare));
  combatPose.bladeDegrees = lerp(victory.sweepDegrees, guardDegrees, amount) + victory.twirl * amount;
  combatPose.leanDegrees = victory.lean * (1 - amount);
}

function placeLockedBlade(pose, fighter, motion, advantage) {
  const { bladeLock } = combatPoses;
  const time = fighter.animation.time;
  const growth = clamp(fighter.combat.lockTime / combatRulesConfig.bladeLock.maxDuration, 0, 1);
  const amplitude = lerp(motion.lock.tremor[0], motion.lock.tremor[1], growth);
  pose.handX += Math.sin(time * bladeLock.tremorRates[0] * TAU) * amplitude;
  pose.handY += Math.sin(time * bladeLock.tremorRates[1] * TAU) * amplitude;
  const contactX = combatRulesConfig.bladeLock.distance / 2 + advantage * effectsConfig.bladeLock.contactShift;
  const contactY = -effectsConfig.bladeLock.contactHeight + Math.sin(time * bladeLock.tremorRates[1] * TAU) * bladeLock.contactJitter;
  const contactAngle = Math.atan2(contactY - pose.handY, contactX - pose.handX);
  pose.bladeAngle = lerp(pose.bladeAngle, contactAngle, getLockEntry(fighter));
}

const techniqueTracks = {
  spin: resolveTrack(techniqueKeyframes.spin),
  saberThrow: resolveTrack(techniqueKeyframes.saberThrow),
  counterRiposte: resolveTrack(techniqueKeyframes.counterRiposte),
  dashSlash: Object.fromEntries(Object.entries(techniqueKeyframes.dashSlash).map(([variant, keys]) => [variant, resolveTrack(keys)])),
};

const powerTracks = Object.fromEntries(Object.entries(powerKeyframes).map(([id, keys]) => [id, resolveTrack(keys)]));

const resolvedMotionStyles = Object.fromEntries(
  Object.entries(motionStyles).map(([id, style]) => [id, resolveMotionStyle(style)]),
);

function getAttackStyle(motion, attack, attackType) {
  return motion.attackTypes[attackType] ?? motion.attacks[attack.pose ?? attackType];
}

function getFollowThrough(style, progress) {
  return (style.strikeDegrees - style.windupDegrees) * style.followThrough * Math.sin(Math.PI * clamp(progress * 2, 0, 1));
}

function getTrackChannel(key, channel, guardDegrees) {
  if (channel !== 'bladeDegrees') return key.values[channel];
  return (key.values.bladeDegrees ?? guardDegrees) + key.values.twirl;
}

function applyTrackPose(track, fighter, guardDegrees, attack = fighter.combat.attack) {
  const phase = PHASE_OFFSET[getAttackPhase(attack, fighter.stateTime)];
  const time = phase === undefined ? TRACK_END : phase + clamp(getPhaseProgress(attack, fighter.stateTime), 0, 1);
  let index = 1;
  while (index < track.length - 1 && track[index].time < time) index += 1;
  const from = track[index - 1];
  const to = track[index];
  const span = to.time - from.time;
  const amount = span > 0 ? to.ease(clamp((time - from.time) / span, 0, 1)) : 1;
  for (const channel of TRACK_CHANNELS) {
    combatPose[channel] = lerp(getTrackChannel(from, channel, guardDegrees), getTrackChannel(to, channel, guardDegrees), amount);
  }
  combatPose.turn = lerp(from.values.turn, to.values.turn, amount);
}

function getTechniqueTrack(motion, key) {
  if (key === 'dashSlash') return techniqueTracks.dashSlash[motion.dashSlash] ?? techniqueTracks.dashSlash.rising;
  return techniqueTracks[key] ?? null;
}

function getAttackTrack(motion, attack, attackType, flourish) {
  if (flourish && attackType === 'riposte') return techniqueTracks.counterRiposte;
  const key = attack.pose ?? attackType;
  const ownTrack = attackType === attack.attack ? null : motion.tracks?.[attackType];
  return ownTrack ?? motion.tracks?.[key] ?? getTechniqueTrack(motion, key);
}

function applyAttackPose(fighter, guardDegrees, motion, flourish) {
  const { attack, attackType } = fighter.combat;
  const track = getAttackTrack(motion, attack, attackType, flourish);
  if (track) {
    applyTrackPose(track, fighter, guardDegrees);
    return;
  }
  const style = getAttackStyle(motion, attack, attackType);
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
      combatPose.bladeDegrees = lerp(style.strikeDegrees, guardDegrees, amount) + getFollowThrough(style, progress) + style.recoveryTwirl * amount;
      combatPose.leanDegrees = lerp(style.strikeLean, 0, amount);
      combatPose.reach = lerp(style.strikeReach, 0, amount);
      break;
    }
  }
}

function getPowerPoseAmount(fighter, power) {
  if (fighter.stateTime < power.startup) {
    return easeOutCubic(clamp(fighter.stateTime / power.startup, 0, 1));
  }
  const releasedAt = power.channel ? fighter.combat.powerEndTime : power.startup + power.active;
  if (power.channel && releasedAt === 0) {
    return 1;
  }
  return 1 - easeInOutSine(clamp((fighter.stateTime - releasedAt) / power.recovery, 0, 1));
}

function applyPowerPose(fighter, guardDegrees) {
  const { power } = fighter.combat;
  if (!power) {
    return;
  }
  if (powerTracks[power.pose]) {
    applyTrackPose(powerTracks[power.pose], fighter, guardDegrees, power);
    return;
  }
  const style = combatPoses.powers[power.pose];
  const amount = getPowerPoseAmount(fighter, power);
  const tremble = Math.sin(fighter.stateTime * style.trembleSpeed * TAU) * style.tremble;
  combatPose.bladeDegrees = lerp(guardDegrees, style.bladeDegrees, amount);
  combatPose.leanDegrees = (style.lean + tremble) * amount;
  combatPose.crouch = style.crouch * amount;
  combatPose.reach = style.reach * amount;
  combatPose.lift = style.lift * amount;
  if (style.offHand) {
    combatPose.offHand = style.offHand * amount;
    combatPose.offHandDegrees = lerp(combatPoses.keyframeDefaults.offHandDegrees, style.offHandDegrees, amount);
  }
}

function isChoked(fighter) {
  return fighter.state === FighterState.STUNNED && fighter.combat.chokeTime > 0;
}

function getChokeRise(fighter) {
  return easeOutCubic(clamp(fighter.stateTime / combatPoses.choked.riseTime, 0, 1));
}

function getChokeLift(fighter) {
  const style = combatPoses.choked;
  const hold = clamp(fighter.stateTime / style.holdTime, 0, 1);
  return getChokeRise(fighter) * lerp(style.lift, style.maxLift, easeInOutSine(hold));
}

function applyChokedPose(fighter) {
  const style = combatPoses.choked;
  const shake = Math.sin(fighter.animation.time * style.trembleSpeed * TAU);
  const rise = getChokeRise(fighter);
  combatPose.leanDegrees = style.lean + shake * style.trembleDegrees * rise;
  combatPose.bladeDegrees = style.bladeDegrees;
  combatPose.bodyLift = getChokeLift(fighter) * fighter.height + shake * style.trembleLift * rise;
}

function hangFeet(pose, fighter, rise) {
  const style = combatPoses.choked;
  const spread = fighter.height * style.footSpread;
  const swing = Math.sin(fighter.animation.time * style.legSwingSpeed * TAU) * fighter.height * style.legSwing;
  pose.frontFootX = lerp(pose.frontFootX, spread + swing, rise);
  pose.backFootX = lerp(pose.backFootX, -spread + swing * 0.6, rise);
  pose.frontFootY = lerp(pose.frontFootY, 0, rise);
  pose.backFootY = lerp(pose.backFootY, 0, rise);
}

function graspNeck(pose, rise) {
  const style = combatPoses.choked;
  const neckY = pose.headY + pose.headRadius * style.neckDrop;
  pose.handX = lerp(pose.handX, pose.headX + pose.headRadius * style.neckForward, rise);
  pose.handY = lerp(pose.handY, neckY, rise);
  pose.offHand = rise;
  pose.freeHandX = lerp(pose.freeHandX, pose.headX + pose.headRadius * style.freeNeckForward, rise);
  pose.freeHandY = lerp(pose.freeHandY, neckY, rise);
}

function applyStunnedPose(fighter) {
  const style = combatPoses.stunned;
  const sway = Math.sin(fighter.stateTime * style.swaySpeed * TAU) * style.swayDegrees;

  combatPose.leanDegrees = style.lean;
  combatPose.crouch = style.crouch;
  combatPose.bladeDegrees = style.bladeDegrees + sway;
}

export function getMotionStyle(fighter) {
  return resolvedMotionStyles[fighter.appearance.motion] ?? resolvedMotionStyles.standard;
}

export function getEvadeVariant(fighter, justSucceeded = false) {
  const variants = getMotionStyle(fighter).evade;
  const index = Math.max(0, fighter.combat.evadeStreak - (justSucceeded ? 1 : 0));
  return variants[index % variants.length];
}

function resolveCombatPose(fighter, guardDegrees, motion, forceEvade, lockContext) {
  resetCombatPose(guardDegrees);

  if (forceEvade || (fighter.state === FighterState.DODGING && fighter.combat.evading)) {
    const { releaseTime } = combatPoses.evade;
    const profile = fighter.combat.dodgeProfile;
    const amount = forceEvade ? 1 : 1 - easeInOutSine(clamp((fighter.stateTime - releaseTime) / (profile.duration - releaseTime), 0, 1));
    const variant = getEvadeVariant(fighter, forceEvade);
    combatPose.leanDegrees = variant.lean * amount;
    combatPose.crouch = variant.crouch * amount;
    combatPose.bladeDegrees = guardDegrees + variant.bladeOffset * amount;
    return;
  }
  switch (fighter.state) {
    case FighterState.ATTACKING:
    case FighterState.HEAVY_ATTACK:
      applyAttackPose(fighter, guardDegrees, motion, lockContext.flourish);
      break;
    case FighterState.CASTING:
    case FighterState.CHANNELING:
      applyPowerPose(fighter, guardDegrees);
      break;
    case FighterState.BLOCKING: {
      const { block } = motion;
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
    case FighterState.BLADE_LOCK:
      applyBladeLockPose(fighter, motion, lockContext.advantage);
      break;
    case FighterState.HIT: {
      if (lockContext.victory) {
        applyLockVictoryPose(fighter, guardDegrees, motion);
        break;
      }
      const { hit } = combatPoses;
      const recovery = 1 - easeOutQuad(clamp(fighter.stateTime / fighter.combat.stunDuration, 0, 1));
      combatPose.leanDegrees = hit.lean * recovery;
      combatPose.bladeDegrees = guardDegrees + hit.bladeDropDegrees * recovery;
      break;
    }
    case FighterState.STAGGERED: {
      const { staggered } = combatPoses;
      const recovery = 1 - easeInOutSine(clamp(fighter.stateTime / fighter.combat.stunDuration, 0, 1));
      combatPose.leanDegrees = staggered.lean * recovery;
      combatPose.crouch = staggered.crouch * recovery;
      combatPose.bladeDegrees = lerp(guardDegrees, staggered.bladeDegrees, recovery);
      break;
    }
    case FighterState.STUNNED:
      if (isChoked(fighter)) applyChokedPose(fighter);
      else applyStunnedPose(fighter);
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

function isAttacking(fighter) {
  return (fighter.state === FighterState.ATTACKING || fighter.state === FighterState.HEAVY_ATTACK) && fighter.combat.attack !== null;
}

function nearestDegrees(origin, target) {
  return target + ((((origin - target) % 360) + 540) % 360) - 180;
}

function blendChainedAttack(pose, fighter, motion) {
  const { chain } = pose;
  const attack = isAttacking(fighter) ? fighter.combat.attack : null;
  if (!motion.tracks) {
    chain.wasAttack = false;
    return;
  }
  if (attack && chain.wasAttack && (attack !== chain.attack || fighter.stateTime < chain.stateTime)) {
    chain.origin.set(chain.last);
    chain.blending = true;
  }
  if (attack && chain.blending) {
    const amount = fighter.stateTime / combatPoses.keyframeDefaults.chainBlend;
    if (amount >= 1) {
      chain.blending = false;
    } else {
      const eased = easeOutQuad(clamp(amount, 0, 1));
      for (let index = 0; index < TRACK_CHANNELS.length; index += 1) {
        const channel = TRACK_CHANNELS[index];
        const origin = channel === 'bladeDegrees' ? nearestDegrees(chain.origin[index], combatPose[channel]) : chain.origin[index];
        combatPose[channel] = lerp(origin, combatPose[channel], eased);
      }
    }
  }
  if (!attack) chain.blending = false;
  for (let index = 0; index < TRACK_CHANNELS.length; index += 1) chain.last[index] = combatPose[TRACK_CHANNELS[index]];
  chain.attack = attack;
  chain.stateTime = fighter.stateTime;
  chain.wasAttack = attack !== null;
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
  pose.frontFootX += combatPose.step * height;
  pose.backFootX = lerp(-stanceWidth - stepOffset, -tuckedStance, airBlend) - combatPose.slide * height;
  pose.backFootY = -Math.max(0, -Math.cos(walkPhase)) * stepLift - tuck;
}

function placeKnees(pose, kneeBend) {
  pose.frontKneeX = (pose.hipX + pose.frontFootX) / 2 + kneeBend;
  pose.frontKneeY = (pose.hipY + pose.frontFootY) / 2;
  pose.backKneeX = (pose.hipX + pose.backFootX) / 2 + kneeBend / 2;
  pose.backKneeY = (pose.hipY + pose.backFootY) / 2;
}

function getTurnScale(turn) {
  const scale = Math.cos(turn * TAU);
  const minimum = combatPoses.keyframeDefaults.minTurnScale;
  return Math.abs(scale) < minimum ? Math.sign(scale || 1) * minimum : scale;
}

export function computePose(fighter, pose, forceEvade = false, lockContext = noLockContext) {
  if (!forceEvade && pose.computed && fighter.combat.freezeTime > 0) {
    return pose;
  }
  const { height, appearance, animation } = fighter;
  const { time, walkPhase, walkBlend, airBlend } = animation;
  const motion = getMotionStyle(fighter);
  const { stance } = motion;
  const breathWave = Math.sin((time * TAU) / animationStyle.breathPeriod);
  const exhausted = fighter.combat.exhausted === true;
  const breathScale = stance.breathScale * (exhausted ? animationStyle.exhaustedBreathScale : 1);
  const breath = breathWave * animationStyle.breathAmplitude * breathScale * (1 - walkBlend * animationStyle.walkBreathDamping);
  const walkBob = Math.abs(Math.sin(walkPhase)) * animationStyle.walkBob * stance.bobScale * walkBlend;

  const droop = exhausted ? animationStyle.exhaustedDroopDegrees : 0;
  resolveCombatPose(fighter, appearance.guardAngleDegrees + stance.guardOffset + droop, motion, forceEvade, lockContext);
  if (!forceEvade) blendChainedAttack(pose, fighter, motion);

  const lean = degreesToRadians(appearance.torsoLeanDegrees + stance.lean + combatPose.leanDegrees);
  const torsoLength = height * proportions.torsoLength;

  pose.hipX = combatPose.hip * height;
  pose.hipY = -height * proportions.legLength + walkBob + stance.crouch + combatPose.crouch;
  pose.shoulderX = pose.hipX + Math.sin(lean) * torsoLength;
  pose.shoulderY = pose.hipY - Math.cos(lean) * torsoLength - breath;

  pose.headRadius = height * proportions.headRadius;
  const neckLength = pose.headRadius + height * proportions.neckGap;
  pose.headX = pose.shoulderX + Math.sin(lean) * neckLength;
  pose.headY = pose.shoulderY - Math.cos(lean) * neckLength;

  const chokeRise = isChoked(fighter) ? getChokeRise(fighter) : 0;
  placeFeet(pose, fighter);
  if (chokeRise > 0) hangFeet(pose, fighter, chokeRise);
  placeKnees(pose, height * proportions.kneeBend * (1 + airBlend));

  pose.handX = pose.shoulderX + height * (proportions.handForward + combatPose.reach);
  pose.handY = pose.hipY - height * (proportions.handHeight + combatPose.lift) - breath / 2;
  const freeArm = degreesToRadians(combatPose.offHandDegrees);
  pose.offHand = combatPose.offHand;
  pose.freeHandX = pose.shoulderX + Math.cos(freeArm) * height * proportions.freeArmLength;
  pose.freeHandY = pose.shoulderY + Math.sin(freeArm) * height * proportions.freeArmLength;
  if (chokeRise > 0) graspNeck(pose, chokeRise);
  pose.bladeAngle = degreesToRadians(combatPose.bladeDegrees + breathWave * animationStyle.saberSwayDegrees * stance.swayScale);
  if (fighter.state === FighterState.BLADE_LOCK) {
    placeLockedBlade(pose, fighter, motion, lockContext.advantage);
  }
  pose.bladeVisible = combatPose.bladeVisible && !fighter.combat.saberThrown;
  pose.bodyRotation = degreesToRadians(combatPose.bodyRotationDegrees);
  pose.turnScale = getTurnScale(combatPose.turn);
  pose.bodyLift = combatPose.bodyLift;

  const forwardSpeed = fighter.vx * fighter.facing;
  pose.clothSway = clamp(forwardSpeed * animationStyle.clothDrag, -animationStyle.maxClothSway, animationStyle.maxClothSway);
  pose.computed = true;

  return pose;
}

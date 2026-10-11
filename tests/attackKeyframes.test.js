import { it } from 'node:test';
import assert from 'node:assert/strict';
import { combatPoses, motionStyles, proportions } from '../src/config/fighterVisualConfig.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { computePose, createPose, getMotionStyle } from '../src/rendering/fighterPose.js';
import { degreesToRadians } from '../src/utils/math.js';
import { spawnFighter } from './helpers.js';

function attackAt(fighter, moveId, phase, at) {
  const move = fighter.moves[moveId];
  const offsets = { startup: 0, active: move.startup, recovery: move.startup + move.active };
  const lengths = { startup: move.startup, active: move.active, recovery: move.recovery };
  if (fighter.state !== FighterState.HEAVY_ATTACK && fighter.state !== FighterState.ATTACKING || fighter.combat.attack !== move) {
    fighter.restartState(move.type === 'heavy' ? FighterState.HEAVY_ATTACK : FighterState.ATTACKING);
  }
  fighter.combat.attack = move;
  fighter.combat.attackType = moveId;
  fighter.stateTime = offsets[phase] + lengths[phase] * at;
  return move;
}

it('uses key pose tracks only for styles that declare them', () => {
  assert.ok(getMotionStyle(spawnFighter(0, 1, 'guardian')).tracks.heavy);
  assert.ok(getMotionStyle(spawnFighter(0, 1, 'wasp')).tracks.light5);
  assert.equal(getMotionStyle(spawnFighter(0, 1, 'shadow')).tracks, null);
  assert.equal(motionStyles.standard.keyframes, undefined);
});

it('reaches each key pose at its phase point with the declared channels', () => {
  const fighter = spawnFighter(0, 1, 'guardian');
  const keys = motionStyles.guardian.keyframes.heavy;
  const windup = keys[1];
  attackAt(fighter, 'heavy', 'startup', 1 - 1e-9);
  const atWindup = computePose(fighter, createPose());
  assert.ok(Math.abs(atWindup.bladeAngle - degreesToRadians(windup.blade)) < 1e-3);
  assert.ok(Math.abs(atWindup.hipX - windup.hip * fighter.height) < 1e-6);

  const guard = computePose(spawnFighter(0, 1, 'guardian'), createPose());
  const strike = keys[3];
  attackAt(fighter, 'heavy', 'active', 1 - 1e-9);
  const atStrike = computePose(fighter, createPose());
  assert.ok(Math.abs(atStrike.frontFootX - guard.frontFootX - strike.step * fighter.height) < 1e-3);
  assert.ok(Math.abs(guard.backFootX - atStrike.backFootX - strike.slide * fighter.height) < 1e-3);
  assert.ok(Math.abs(atStrike.hipX - strike.hip * fighter.height) < 1e-6);
});

it('frees the second hand only where a track asks for it', () => {
  const fighter = spawnFighter(0, 1, 'guardian');
  attackAt(fighter, 'heavy', 'active', 0.5);
  assert.equal(computePose(fighter, createPose()).offHand, 0);
  attackAt(fighter, 'shove', 'active', 1 - 1e-9);
  const shove = computePose(fighter, createPose());
  assert.equal(shove.offHand, 1);
  assert.ok(shove.freeHandX > shove.shoulderX + fighter.height * proportions.freeArmLength * 0.9);
});

it('adds the blade twirl through the wasp heavy recovery and lands back on guard', () => {
  const fighter = spawnFighter(0, 1, 'wasp');
  const guard = computePose(spawnFighter(0, 1, 'wasp'), createPose()).bladeAngle;
  attackAt(fighter, 'heavy', 'recovery', 0.65);
  const middle = computePose(fighter, createPose()).bladeAngle;
  attackAt(fighter, 'heavy', 'recovery', 1);
  const end = computePose(fighter, createPose()).bladeAngle;
  assert.ok(Math.abs(end - guard - Math.PI * 2) < 1e-6);
  assert.ok(middle - guard > Math.PI);
});

it('blends a chained attack from the previous pose instead of jumping to guard', () => {
  const fighter = spawnFighter(0, 1, 'wasp');
  const pose = createPose();
  attackAt(fighter, 'light', 'recovery', 0.3);
  const before = computePose(fighter, pose).bladeAngle;
  attackAt(fighter, 'light2', 'startup', 0);
  const chained = computePose(fighter, pose).bladeAngle;
  assert.ok(Math.abs(chained - before) < 1e-6);

  const fresh = spawnFighter(0, 1, 'wasp');
  attackAt(fresh, 'light2', 'startup', 0);
  const unchained = computePose(fresh, createPose()).bladeAngle;
  assert.ok(Math.abs(unchained - chained) > 0.1);

  fighter.stateTime = combatPoses.keyframeDefaults.chainBlend + 0.01;
  fresh.stateTime = fighter.stateTime;
  assert.ok(Math.abs(computePose(fighter, pose).bladeAngle - computePose(fresh, createPose()).bladeAngle) < 1e-9);
});

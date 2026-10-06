import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getAttackDuration } from '../src/combat/attackPhases.js';
import { animation as animationStyle, combatPoses } from '../src/config/fighterVisualConfig.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { degreesToRadians } from '../src/utils/math.js';
import { computePose, createPose } from '../src/rendering/fighterPose.js';
import { AnimationSystem } from '../src/systems/AnimationSystem.js';
import { STEP, repeat, spawnFighter } from './helpers.js';

function createAnimator() {
  return new AnimationSystem(animationStyle);
}

describe('AnimationSystem', () => {
  it('blends into the walk smoothly instead of instantly', () => {
    const fighter = spawnFighter(400);
    const animator = createAnimator();
    fighter.vx = fighter.stats.movement.walkSpeed;

    animator.update([fighter], STEP);
    assert.ok(fighter.animation.walkBlend > 0 && fighter.animation.walkBlend < 0.5);

    repeat(120, () => animator.update([fighter], STEP));
    assert.ok(fighter.animation.walkBlend > 0.99);
  });

  it('blends out of the walk smoothly when the fighter stops', () => {
    const fighter = spawnFighter(400);
    const animator = createAnimator();
    fighter.vx = fighter.stats.movement.walkSpeed;
    repeat(120, () => animator.update([fighter], STEP));

    fighter.vx = 0;
    animator.update([fighter], STEP);

    assert.ok(fighter.animation.walkBlend > 0.5);
  });

  it('runs the walk cycle backward when walking backward', () => {
    const fighter = spawnFighter(400, 1);
    const animator = createAnimator();
    fighter.vx = -100;

    animator.update([fighter], STEP);

    assert.ok(fighter.animation.walkPhase > Math.PI);
  });

  it('does not advance the walk cycle in the air', () => {
    const fighter = spawnFighter(400);
    const animator = createAnimator();
    fighter.grounded = false;
    fighter.vx = 200;

    repeat(10, () => animator.update([fighter], STEP));

    assert.equal(fighter.animation.walkPhase, 0);
    assert.ok(fighter.animation.airBlend > 0.5);
  });
});

describe('fighterPose', () => {
  it('breathes while idle', () => {
    const fighter = spawnFighter(400);
    const first = computePose(fighter, createPose()).shoulderY;

    fighter.animation.time = animationStyle.breathPeriod / 4;
    const second = computePose(fighter, createPose()).shoulderY;

    assert.notEqual(first, second);
  });

  it('opens the stride while walking', () => {
    const fighter = spawnFighter(400);
    const idle = computePose(fighter, createPose());
    const idleStride = idle.frontFootX - idle.backFootX;

    fighter.animation.walkBlend = 1;
    fighter.animation.walkPhase = Math.PI / 2;
    const walking = computePose(fighter, createPose());

    assert.ok(walking.frontFootX - walking.backFootX > idleStride);
  });

  it('tucks the legs in the air', () => {
    const fighter = spawnFighter(400);
    fighter.animation.airBlend = 1;

    const pose = computePose(fighter, createPose());

    assert.ok(pose.frontFootY < 0);
    assert.ok(pose.backFootY < 0);
  });

  it('drags the cloth behind the movement and limits it', () => {
    const fighter = spawnFighter(400, 1);
    fighter.vx = 100000;

    const pose = computePose(fighter, createPose());

    assert.equal(pose.clothSway, animationStyle.maxClothSway);
  });

  it('builds the same local pose for both facing directions', () => {
    const right = spawnFighter(400, 1);
    const left = spawnFighter(400, -1);
    right.vx = 50;
    left.vx = -50;

    assert.deepEqual(computePose(right, createPose()), computePose(left, createPose()));
  });
});

describe('fighterPose in combat', () => {
  function poseAt(fighter, state, time) {
    fighter.restartState(state);
    fighter.stateTime = time;
    return computePose(fighter, createPose());
  }

  function startAttack(fighter, attackType) {
    fighter.combat.attack = fighter.stats.attacks[attackType];
    fighter.combat.attackType = attackType;
    return fighter.combat.attack;
  }

  it('raises the blade back in the startup and strikes forward in the active phase', () => {
    const fighter = spawnFighter(400);
    const attack = startAttack(fighter, 'light');
    const style = combatPoses.attacks.light;

    const windup = poseAt(fighter, FighterState.ATTACKING, attack.startup - 0.001);
    const strike = poseAt(fighter, FighterState.ATTACKING, attack.startup + attack.active - 0.001);

    assert.ok(Math.abs(windup.bladeAngle - degreesToRadians(style.windupDegrees)) < 0.1);
    assert.ok(Math.abs(strike.bladeAngle - degreesToRadians(style.strikeDegrees)) < 0.1);
  });

  it('returns the blade to the guard at the end of the recovery', () => {
    const fighter = spawnFighter(400);
    const attack = startAttack(fighter, 'heavy');

    const end = poseAt(fighter, FighterState.HEAVY_ATTACK, getAttackDuration(attack) - 0.0001);

    assert.ok(Math.abs(end.bladeAngle - degreesToRadians(fighter.appearance.guardAngleDegrees)) < 0.1);
  });

  it('holds the blade up in front of the body while blocking', () => {
    const fighter = spawnFighter(400);

    const pose = poseAt(fighter, FighterState.BLOCKING, 0);

    assert.ok(Math.abs(pose.bladeAngle - degreesToRadians(combatPoses.block.bladeDegrees)) < 0.1);
  });

  it('falls backward, lies on the floor and turns the blade off when dead', () => {
    const fighter = spawnFighter(400);
    fighter.combat.fallDirection = -fighter.facing;

    const pose = poseAt(fighter, FighterState.DEAD, combatPoses.dead.fallDuration);

    assert.equal(pose.bladeVisible, false);
    assert.equal(pose.bodyRotation, degreesToRadians(-combatPoses.dead.fallDegrees));
    assert.ok(pose.bodyLift > 0);
  });

  it('falls forward when the fall direction is forward', () => {
    const fighter = spawnFighter(400);
    fighter.combat.fallDirection = fighter.facing;

    const pose = poseAt(fighter, FighterState.DEAD, combatPoses.dead.fallDuration);

    assert.equal(pose.bodyRotation, degreesToRadians(combatPoses.dead.fallDegrees));
  });
});

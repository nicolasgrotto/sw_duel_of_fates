import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { animation as animationStyle } from '../src/config/fighterVisualConfig.js';
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

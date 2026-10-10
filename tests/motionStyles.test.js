import { it } from 'node:test';
import assert from 'node:assert/strict';
import { getAttackDuration } from '../src/combat/attackPhases.js';
import { getAttackHitbox } from '../src/combat/hitboxes.js';
import { combatPoses, motionStyles } from '../src/config/fighterVisualConfig.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { computePose, createPose, getMotionStyle } from '../src/rendering/fighterPose.js';
import { TAU, degreesToRadians } from '../src/utils/math.js';
import { spawnFighter } from './helpers.js';

function attackPose(fighter, attackType, time) {
  const attack = fighter.stats.attacks[attackType];
  fighter.combat.attack = attack;
  fighter.combat.attackType = attackType;
  fighter.restartState(attack.type === 'heavy' ? FighterState.HEAVY_ATTACK : FighterState.ATTACKING);
  fighter.stateTime = time;
  return computePose(fighter, createPose());
}

function angleDistance(a, b) {
  const difference = (((a - b) % TAU) + TAU) % TAU;
  return Math.min(difference, TAU - difference);
}

it('keeps the standard style identical to the v2 poses', () => {
  const standard = getMotionStyle(spawnFighter(400, 1, 'shadow'));
  assert.deepEqual(motionStyles.standard.stance, { crouch: 0, lean: 0, guardOffset: 0, breathScale: 1, swayScale: 1, bobScale: 1 });
  for (const [key, pose] of Object.entries(combatPoses.attacks)) {
    assert.deepEqual(standard.attacks[key], { ...pose, followThrough: 0, recoveryTwirl: 0 });
  }
  assert.deepEqual(standard.block, combatPoses.block);
});

it('gives the guardian and the wasp their own styles, kept by skins', () => {
  assert.equal(getMotionStyle(spawnFighter(400, 1, 'guardian')), getMotionStyle(spawnFighter(400, 1, 'guardian')));
  assert.notEqual(getMotionStyle(spawnFighter(400, 1, 'guardian')), getMotionStyle(spawnFighter(400, 1, 'shadow')));
  assert.equal(spawnFighter(400, 1, 'wasp').appearance.motion, 'wasp');
  assert.equal(spawnFighter(400, 1, 'guardian').appearance.motion, 'guardian');
});

it('does not change any hitbox when the motion style changes', () => {
  const styled = spawnFighter(400, 1, 'wasp');
  const plain = spawnFighter(400, 1, 'wasp');
  plain.appearance = { ...plain.appearance, motion: 'standard' };
  for (const [type, attack] of Object.entries(styled.stats.attacks)) {
    if (!attack.hitbox) continue;
    const a = { left: 0, right: 0, top: 0, bottom: 0 };
    const b = { left: 0, right: 0, top: 0, bottom: 0 };
    assert.deepEqual(getAttackHitbox(styled, attack, a), getAttackHitbox(plain, attack, b), type);
  }
});

it('turns the wasp blade without a jump from the strike and lands back on the guard', () => {
  const wasp = spawnFighter(400, 1, 'wasp');
  const guard = degreesToRadians(wasp.appearance.guardAngleDegrees + getMotionStyle(wasp).stance.guardOffset);
  for (const type of ['light5', 'heavy']) {
    const attack = wasp.stats.attacks[type];
    const strikeEnd = attack.startup + attack.active;
    const before = attackPose(wasp, type, strikeEnd - 1e-6).bladeAngle;
    const after = attackPose(wasp, type, strikeEnd + 1e-6).bladeAngle;
    assert.ok(angleDistance(before, after) < 0.01, type);
    const end = attackPose(wasp, type, getAttackDuration(attack) - 1e-6).bladeAngle;
    assert.ok(angleDistance(end, guard) < 0.08, type);
    const middle = attackPose(wasp, type, strikeEnd + attack.recovery / 2).bladeAngle;
    assert.ok(angleDistance(middle, guard) > 0.5, type);
  }
});

it('keeps the stance offset continuous between idle and the end of an action', () => {
  const guardian = spawnFighter(400, 1, 'guardian');
  const idle = computePose(guardian, createPose());
  const attack = guardian.stats.attacks.light;
  const end = attackPose(guardian, 'light', getAttackDuration(attack) - 1e-6);
  assert.ok(Math.abs(end.hipY - idle.hipY) < 1e-6);
  assert.ok(Math.abs(end.bladeAngle - idle.bladeAngle) < 0.05);
});

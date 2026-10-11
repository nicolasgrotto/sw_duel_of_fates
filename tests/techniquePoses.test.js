import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createBox, getAttackHitbox } from '../src/combat/hitboxes.js';
import { computePose, createPose } from '../src/rendering/fighterPose.js';
import { getBladeWorldPoints } from '../src/rendering/saberRenderer.js';
import { spawnFighter } from './helpers.js';

function attackAt(fighter, moveId, time) {
  const move = fighter.moves[moveId];
  fighter.restartState(move.type === 'heavy' ? 'HEAVY_ATTACK' : 'ATTACKING');
  fighter.combat.attack = move;
  fighter.combat.attackType = moveId;
  fighter.stateTime = time;
  fighter.animation.time = time;
  return move;
}

function poseAt(fighter, moveId, time) {
  attackAt(fighter, moveId, time);
  return computePose(fighter, createPose());
}

function bladeTouchesBox(blade, box) {
  for (let step = 0; step <= 20; step += 1) {
    const x = blade.baseX + (blade.tipX - blade.baseX) * step / 20;
    const y = blade.baseY + (blade.tipY - blade.baseY) * step / 20;
    if (x >= box.left && x <= box.right && y >= box.top && y <= box.bottom) return true;
  }
  return false;
}

function assertBladeReachesHitbox(id, moveId, facing) {
  const fighter = spawnFighter(500, facing, id);
  const move = fighter.moves[moveId];
  const box = getAttackHitbox(fighter, move, createBox());
  const blade = {};
  let touches = false;
  for (let sample = 0; sample <= 60; sample += 1) {
    const pose = poseAt(fighter, moveId, move.startup + move.active * sample / 60);
    if (bladeTouchesBox(getBladeWorldPoints(fighter, pose, blade), box)) touches = true;
  }
  assert.ok(touches, `${id}/${moveId}/${facing}`);
}

describe('technique keyframe tracks', () => {
  it('turns the body during the spin and faces front again in the recovery', () => {
    const fighter = spawnFighter(500, 1, 'shadow');
    const move = fighter.moves.spin;
    assert.equal(poseAt(fighter, 'spin', move.startup).turnScale, 1);
    const middle = poseAt(fighter, 'spin', move.startup + move.active / 2);
    assert.ok(middle.turnScale < -0.9);
    const quarter = poseAt(fighter, 'spin', move.startup + move.active / 4);
    assert.ok(Math.abs(quarter.turnScale) < 0.2);
    const end = poseAt(fighter, 'spin', move.startup + move.active + move.recovery * 0.999);
    assert.ok(end.turnScale > 0.99);
  });

  it('pulls the blade behind the shoulder before the spin', () => {
    const fighter = spawnFighter(500, 1, 'forge');
    const pose = poseAt(fighter, 'spin', fighter.moves.spin.startup);
    assert.ok(Math.cos(pose.bladeAngle) < -0.8);
  });

  it('cuts upward in the rising dash slash and downward in the guardian falling variant', () => {
    for (const [id, startupSign, strikeSign] of [['shadow', 1, -1], ['wasp', 1, -1], ['ember', 1, -1], ['guardian', -1, 1]]) {
      const fighter = spawnFighter(500, 1, id);
      const move = fighter.moves.dashSlash;
      const windup = poseAt(fighter, 'dashSlash', move.startup);
      const strike = poseAt(fighter, 'dashSlash', move.startup + move.active);
      assert.equal(Math.sign(Math.sin(windup.bladeAngle)), startupSign, `${id} windup`);
      assert.equal(Math.sign(Math.sin(strike.bladeAngle)), strikeSign, `${id} strike`);
    }
  });

  it('crouches into the rising dash slash', () => {
    const shadow = spawnFighter(500, 1, 'shadow');
    const guardian = spawnFighter(500, 1, 'guardian');
    const low = poseAt(shadow, 'dashSlash', shadow.moves.dashSlash.startup);
    const high = poseAt(guardian, 'dashSlash', guardian.moves.dashSlash.startup);
    assert.ok(low.hipY - computePose(spawnFighter(500, 1, 'shadow'), createPose()).hipY > 10);
    assert.ok(high.handY < low.handY);
  });

  it('winds the thrown blade behind the body and releases with the arm extended', () => {
    for (const id of ['guardian', 'wasp', 'ember', 'forge']) {
      const fighter = spawnFighter(500, 1, id);
      const move = fighter.moves.saberThrow;
      const idle = computePose(spawnFighter(500, 1, id), createPose());
      const windup = poseAt(fighter, 'saberThrow', move.startup);
      const release = poseAt(fighter, 'saberThrow', move.startup + move.active);
      assert.ok(Math.cos(windup.bladeAngle) < -0.7, `${id} windup`);
      assert.ok(windup.backFootX < idle.backFootX, `${id} slide`);
      assert.ok(release.handX - idle.handX > fighter.height * 0.15, `${id} release`);
      assert.ok(release.frontFootX > idle.frontFootX, `${id} step`);
    }
  });

  for (const [id, moveId] of [['shadow', 'spin'], ['forge', 'spin'], ['shadow', 'dashSlash'], ['guardian', 'dashSlash'], ['wasp', 'dashSlash'], ['ember', 'dashSlash']]) {
    for (const facing of [-1, 1]) {
      it(`${id}/${moveId}/${facing}: the blade reaches the real hitbox during active`, () => {
        assertBladeReachesHitbox(id, moveId, facing);
      });
    }
  }

});

import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { characters } from '../src/characters/characterData.js';
import { createFighterFromCharacter } from '../src/characters/characterFactory.js';
import { createProtagonistCharacter } from '../src/characters/protagonist.js';
import { storyConfig } from '../src/config/storyConfig.js';
import { createBox, getAttackHitbox } from '../src/combat/hitboxes.js';
import { getMotionStyle, computePose, createPose } from '../src/rendering/fighterPose.js';
import { getBladeWorldPoints } from '../src/rendering/saberRenderer.js';
import { STEP, createSimulation, segmentEntersBox, spawnFighter } from './helpers.js';

const baseline = JSON.parse(readFileSync(new URL('./fixtures/attackPoses-v2.json', import.meta.url)));
const MAX_CHAIN_ANGLE = Math.PI / 3;
const TECHNIQUES = new Set(['spin', 'dashSlash', 'saberThrow']);

function attackAt(fighter, moveId, time) {
  const move = fighter.moves[moveId];
  fighter.restartState(move.type === 'heavy' ? 'HEAVY_ATTACK' : 'ATTACKING');
  fighter.combat.attack = move;
  fighter.combat.attackType = moveId;
  fighter.stateTime = time;
  fighter.animation.time = time;
  return move;
}

const HISTORICAL_APPEARANCE = { sovereign: { torsoLeanDegrees: -2, shoulderScale: 1.1 } };

function asStandard(fighter) {
  fighter.appearance = { ...fighter.appearance, ...HISTORICAL_APPEARANCE[fighter.id], motion: 'standard' };
  return fighter;
}

function angularDistance(a, b) {
  return Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
}

function assertTransitionFrame(previous, angle, label) {
  const change = angularDistance(angle, previous);
  assert.ok(change <= MAX_CHAIN_ANGLE, `${label}: ${(change * 180 / Math.PI).toFixed(2)} degrees`);
}

function assertHistoricalPoses(fighter, moves, label) {
  assert.deepEqual(Object.keys(fighter.moves).sort(), Object.keys(moves).sort());
  for (const [moveId, rows] of Object.entries(moves)) {
    if (TECHNIQUES.has(moveId)) continue;
    const move = fighter.moves[moveId];
    let row = 0;
    for (const phase of baseline.phases) {
      for (const point of baseline.points) {
        const offset = phase === 'startup' ? 0 : move.startup + (phase === 'recovery' ? move.active : 0);
        attackAt(fighter, moveId, offset + move[phase] * point);
        const pose = computePose(fighter, createPose());
        for (const [column, field] of baseline.fields.entries()) {
          assert.ok(pose[field] === rows[row][column], `${label}/${moveId}/${phase}/${point}/${fighter.facing}/${field}`);
        }
        assert.equal(pose.offHand, 0);
        row += 1;
      }
    }
  }
}

function checkBufferedHeavy(fighter, fromId, toId) {
  const simulation = createSimulation([fighter, spawnFighter(fighter.facing === 1 ? 1100 : 100, -fighter.facing)]);
  assert.ok(simulation.combat.tryAttack(fighter, fromId));
  const move = fighter.moves[fromId];
  const duration = move.startup + move.active + move.recovery;
  const pose = createPose();
  let previous = computePose(fighter, pose).bladeAngle;
  let transitionFrames = 0;
  const limit = Math.ceil(duration / STEP) + 8;
  for (let frame = 0; frame < limit && transitionFrames < 5; frame += 1) {
    fighter.intent.heavyAttack = fighter.stateTime >= duration - STEP * 3;
    fighter.intent.moveX = toId === 'forwardHeavy' ? fighter.facing : 0;
    simulation.step(STEP);
    const angle = computePose(fighter, pose).bladeAngle;
    if (fighter.combat.attackType === toId) {
      assertTransitionFrame(previous, angle, `${fighter.id}/${fromId} → ${toId}, transition frame ${transitionFrames}`);
      transitionFrames += 1;
    }
    previous = angle;
    fighter.clearIntent();
  }
  assert.equal(transitionFrames, 5, `buffered ${toId} must start in the real simulation`);
}

describe('historical attack animation contract (198525b)', () => {
  it('covers every character, either through the v2 baseline or through keyframe tracks', () => {
    for (const id of Object.keys(baseline.poses)) assert.ok(characters[id], id);
    for (const id of Object.keys(characters)) {
      assert.ok(baseline.poses[id] || baseline.moves[id], `${id} has no historical contract`);
      assert.ok(getMotionStyle(spawnFighter(500, 1, id)).tracks, `${id} has no keyframe tracks`);
    }
  });

  for (const [id, moves] of Object.entries(baseline.poses)) {
    it(`${id}: preserves every v2 pose channel in every move and phase`, () => {
      for (const facing of [-1, 1]) {
        const fighter = asStandard(spawnFighter(500, facing, id));
        assertHistoricalPoses(fighter, moves, id);
      }
    });
  }

  for (const [style, { profile, poses }] of Object.entries(baseline.protagonists)) {
    it(`protagonist/${style}: preserves every v2 pose channel in every move and phase`, () => {
      for (const facing of [-1, 1]) {
        const fighter = asStandard(createFighterFromCharacter(createProtagonistCharacter(profile, storyConfig), { x: 500, y: 600, facing }));
        assert.equal(getMotionStyle(fighter).tracks, null);
        assertHistoricalPoses(fighter, poses, `protagonist/${style}`);
      }
    });
  }

  for (const id of ['guardian', 'wasp']) {
    it(`${id}: preserves startup, active, recovery and hitbox dimensions for all moves`, () => {
      const fighter = spawnFighter(500, 1, id);
      const actual = Object.fromEntries(Object.entries(fighter.moves).map(([key, move]) => [key, {
        startup: move.startup, active: move.active, recovery: move.recovery,
        reach: key === 'saberThrow' ? undefined : move.hitbox.reach, top: move.hitbox.top, bottom: move.hitbox.bottom,
      }]));
      const expectedMoves = structuredClone(baseline.moves[id]);
      if (expectedMoves.saberThrow) expectedMoves.saberThrow.reach = undefined;
      assert.deepEqual(actual, expectedMoves);
      for (const facing of [-1, 1]) {
        fighter.facing = facing;
        for (const [key, expected] of Object.entries(baseline.moves[id])) {
          if (key === 'saberThrow') continue;
          const hitbox = getAttackHitbox(fighter, fighter.moves[key], createBox());
          assert.equal(hitbox.top, fighter.y - fighter.height * expected.top);
          assert.equal(hitbox.bottom, fighter.y - fighter.height * expected.bottom);
          const far = fighter.x + facing * (fighter.width / 2 + expected.reach);
          assert.equal(facing === 1 ? hitbox.right : hitbox.left, far);
        }
      }
    });
  }
});

describe('combo variety', () => {
  for (const id of Object.keys(characters)) {
    it(`${id}: each light combo step swings a different arc from the step before`, () => {
      const fighter = spawnFighter(500, 1, id);
      const arcOf = (moveId) => {
        const move = fighter.moves[moveId];
        return [move.startup, move.startup + move.active].map((time) => {
          attackAt(fighter, moveId, time);
          return computePose(fighter, createPose()).bladeAngle;
        });
      };
      for (const [fromId, from] of Object.entries(fighter.moves).filter(([key]) => /^light\d*$/.test(key))) {
        for (const toId of from.cancelsInto) {
          const [fromStart, fromEnd] = arcOf(fromId);
          const [toStart, toEnd] = arcOf(toId);
          const difference = Math.max(angularDistance(fromStart, toStart), angularDistance(fromEnd, toEnd));
          assert.ok(difference > Math.PI / 6, `${id}/${fromId} → ${toId}: ${(difference * 180 / Math.PI).toFixed(1)} degrees`);
        }
      }
    });
  }
});

describe('keyframe blade geometry and chain continuity', () => {
  for (const id of Object.keys(characters)) {
    const template = spawnFighter(500, 1, id);
    const tracks = getMotionStyle(template).tracks;
    for (const [moveId, move] of Object.entries(template.moves)) {
      if (!(tracks[moveId] ?? tracks[move.pose])) continue;
      for (const facing of [-1, 1]) {
        it(`${id}/${moveId}/${facing}: blade enters the real hitbox during active`, () => {
          const fighter = spawnFighter(500, facing, id);
          const pose = createPose();
          const box = getAttackHitbox(fighter, fighter.moves[moveId], createBox());
          const blade = {};
          let intersects = false;
          for (let sample = 0; sample < 120; sample += 1) {
            attackAt(fighter, moveId, move.startup + move.active * sample / 120);
            getBladeWorldPoints(fighter, computePose(fighter, pose), blade);
            if (segmentEntersBox(blade, box)) intersects = true;
          }
          assert.ok(intersects, `${id}/${moveId}: no blade segment intersects the active hitbox`);
        });
      }
    }

    for (const [fromId, from] of Object.entries(template.moves).filter(([key]) => /^light\d*$/.test(key))) {
      const destinations = [...from.cancelsInto, 'heavy', 'forwardHeavy'];
      for (const toId of destinations) {
        for (const facing of [-1, 1]) {
          it(`${id}/${fromId} → ${toId}/${facing}: changes at most 60 degrees per 60 Hz transition frame`, () => {
            const fighter = spawnFighter(500, facing, id);
            const cancel = from.cancelsInto.includes(toId);
            if (!cancel) {
              checkBufferedHeavy(fighter, fromId, toId);
              return;
            }
            const times = Array.from({ length: Math.ceil(from.recovery / STEP) }, (_, index) => from.startup + from.active + index * STEP);
            for (const time of times) {
              const pose = createPose();
              attackAt(fighter, fromId, time);
              let previous = computePose(fighter, pose).bladeAngle;
              attackAt(fighter, toId, 0);
              for (let frame = 0; frame <= 4; frame += 1) {
                fighter.stateTime = frame * STEP;
                fighter.animation.time = time + frame * STEP;
                const angle = computePose(fighter, pose).bladeAngle;
                assertTransitionFrame(previous, angle, `${id}/${fromId} → ${toId}, recovery ${time}, frame ${frame}`);
                previous = angle;
              }
            }
          });
        }
      }
    }
  }
});

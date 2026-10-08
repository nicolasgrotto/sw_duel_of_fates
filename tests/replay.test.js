import { characters } from '../src/characters/characterData.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Fighter } from '../src/entities/Fighter.js';
import { ReplayBuffer, restoreFighter, captureFighter, REPLAY_STATIC_FIELDS } from '../src/simulation/ReplayBuffer.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';

function scriptedIntent(step, fighter, index) {
  fighter.intent.moveX = index === 0 ? (step % 90 < 40 ? 1 : 0) : (step % 70 < 20 ? -1 : 0);
  fighter.intent.lightAttack = index === 0 ? step % 45 === 10 : false;
  fighter.intent.heavyAttack = index === 1 ? step % 80 === 30 : false;
  fighter.intent.block = index === 1 && step % 120 > 90;
  fighter.intent.blockPressed = index === 1 && step % 120 === 91;
}

function clone(original, snapshot) {
  const fighter = new Fighter({
    id: original.id, name: original.name, stats: original.stats, appearance: original.appearance,
    sound: original.sound, x: snapshot.x, y: original.floorY, facing: snapshot.facing,
  });
  restoreFighter(fighter, snapshot);
  return fighter;
}

describe('ReplayBuffer', () => {
  it('re-simulates the recorded window to the exact same fighter state', () => {
    const fighters = [spawnFighter(420, 1), spawnFighter(640, -1, 'shadow')];
    const simulation = createSimulation(fighters);
    const buffer = new ReplayBuffer({ frames: 120, snapshotInterval: 30 });

    for (let step = 0; step < 400; step += 1) {
      fighters.forEach((fighter, index) => scriptedIntent(step, fighter, index));
      buffer.record(fighters, STEP);
      simulation.step(STEP);
      fighters.forEach((fighter) => fighter.clearIntent());
    }

    const playback = buffer.createPlayback();
    assert.ok(playback.firstStep >= 400 - 120);
    const replayed = fighters.map((fighter, index) => clone(fighter, playback.snapshot.fighters[index]));
    const replay = createSimulation(replayed);
    for (let step = playback.firstStep; step < playback.lastStep; step += 1) {
      replay.step(buffer.readStep(step, replayed));
    }

    for (let index = 0; index < fighters.length; index += 1) {
      assert.equal(replayed[index].x, fighters[index].x);
      assert.equal(replayed[index].health, fighters[index].health);
      assert.equal(replayed[index].state, fighters[index].state);
      assert.equal(replayed[index].stamina, fighters[index].stamina);
    }
  });

  it('has nothing to replay after being cleared', () => {
    const fighters = [spawnFighter(420, 1), spawnFighter(640, -1)];
    const buffer = new ReplayBuffer({ frames: 60, snapshotInterval: 30 });
    buffer.record(fighters, STEP);
    assert.equal(buffer.hasReplay(), true);

    buffer.clear();
    assert.equal(buffer.hasReplay(), false);
  });
});

it('covers every own fighter field before and after simulation', () => {
  for (const id of Object.keys(characters)) {
    const fighters = [spawnFighter(420, 1, id), spawnFighter(640, -1)];
    const simulation = createSimulation(fighters);
    const initial = Object.fromEntries(REPLAY_STATIC_FIELDS.filter((key) => key !== 'intent').map((key) => [key, fighters[0][key]]));
    for (let step = 0; step < 180; step += 1) {
      const snapshot = captureFighter(fighters[0]);
      for (const key of Object.keys(fighters[0])) {
        assert.ok(Object.hasOwn(snapshot, key) || REPLAY_STATIC_FIELDS.includes(key), `${id}: missing replay field ${key}`);
      }
      scriptedIntent(step, fighters[0], 0);
      fighters[0].intent.jump = step === 1;
      fighters[0].intent.dodge = step === 70;
      simulation.step(STEP);
      for (const [key, value] of Object.entries(initial)) assert.equal(fighters[0][key], value, key);
      fighters.forEach((fighter) => fighter.clearIntent());
    }
    assert.deepEqual(captureFighter(clone(fighters[0], captureFighter(fighters[0]))), captureFighter(fighters[0]));
  }
});

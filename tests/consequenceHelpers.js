import assert from 'node:assert/strict';
import { Fighter } from '../src/entities/Fighter.js';
import { captureFighter, restoreFighter } from '../src/simulation/ReplayBuffer.js';
import { STEP, createSimulation } from './helpers.js';

export function assertSnapshotContinuation(simulation, steps, intents = () => {}) {
  const clones = simulation.fighters.map((fighter) => {
    const clone = new Fighter({
      id: fighter.id, name: fighter.name, stats: fighter.stats, appearance: fighter.appearance,
      sound: fighter.sound, x: fighter.x, y: fighter.floorY, facing: fighter.facing,
    });
    restoreFighter(clone, captureFighter(fighter));
    return clone;
  });
  const replay = createSimulation(clones, simulation.rules);
  for (let step = 0; step < steps; step += 1) {
    for (const current of [simulation, replay]) {
      current.fighters.forEach((fighter) => fighter.clearIntent());
      intents(current.fighters, step);
      current.step(STEP);
    }
  }
  assert.deepEqual(clones.map(captureFighter), simulation.fighters.map(captureFighter));
}

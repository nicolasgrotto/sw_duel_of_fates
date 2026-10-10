import assert from 'node:assert/strict';
import { combatRulesConfig } from '../src/config/combatRulesConfig.js';
import { Fighter } from '../src/entities/Fighter.js';
import { captureFighter, restoreFighter } from '../src/simulation/ReplayBuffer.js';
import { STEP, createSimulation } from './helpers.js';

export const ruleTestNumbers = Object.freeze({
  exhaustion: { enterRatio: 0.1, exitRatio: 0.4, minDuration: 1, guardBreakMinDuration: 1.6, damageScale: 1.2 },
  wounds: { arm: { blockCostScale: 1.35 }, leg: { dashCostScale: 1.35, maxJumps: 1 } },
  focus: { autoEvadeCost: 12 },
});

Object.assign(combatRulesConfig.exhaustion, ruleTestNumbers.exhaustion);
Object.assign(combatRulesConfig.wounds.arm, ruleTestNumbers.wounds.arm);
Object.assign(combatRulesConfig.wounds.leg, ruleTestNumbers.wounds.leg);
Object.assign(combatRulesConfig.focus, ruleTestNumbers.focus);

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

import { it } from 'node:test';
import assert from 'node:assert/strict';
import { EnemyAI, AiDecision } from '../src/ai/EnemyAI.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { combatRulesConfig } from '../src/config/combatRulesConfig.js';
import { Fighter } from '../src/entities/Fighter.js';
import { ReplayBuffer, captureFighter, restoreFighter } from '../src/simulation/ReplayBuffer.js';
import { createRandom } from '../src/utils/random.js';
import { STEP, createSimulation } from './helpers.js';
import { createBladeLockFixture, bladeLockTestNumbers } from './bladeLockHelpers.js';

const proofRates = { easy: 5, normal: 7, hard: 9, boss: 9 };

function fixture(name = 'hard', { random = () => 0, jitter = 0, mistake = 0, rate = proofRates[name] } = {}) {
  Object.assign(combatRulesConfig.bladeLock, bladeLockTestNumbers);
  const result = createBladeLockFixture();
  const [self, opponent] = result.fighters;
  result.ai = new EnemyAI({ self, opponent, rules: result.simulation.rules,
    profile: { ...aiConfig.profiles.balanced, priorities: [] },
    difficulty: { ...aiConfig.difficulties[name], bladeLockRate: rate, mistakeChance: mistake },
    perception: { ...aiConfig.perception, reactionJitter: jitter }, random });
  return result;
}

function requestAndStep(current) {
  const before = current.fighters.map(captureFighter);
  current.ai.updateIntent(current.fighters[0].intent, STEP);
  assert.deepEqual(current.fighters.map(captureFighter), before);
  current.fighters[1].clearIntent();
  current.simulation.step(STEP);
}

it('requests only light edges at the proof rate for each difficulty', () => {
  for (const [name, rate] of Object.entries(proofRates)) {
    const current = fixture(name);
    combatRulesConfig.bladeLock.winMargin = 100;
    for (let step = 0; step < 60; step += 1) {
      requestAndStep(current);
      assert.equal(current.ai.decision, AiDecision.BLADE_LOCK);
      for (const [key, value] of Object.entries(current.fighters[0].intent)) {
        if (key !== 'lightAttack') assert.equal(Boolean(value), false, key);
      }
    }
    assert.equal(current.fighters[0].combat.lockPresses, rate, name);
  }
});

it('keeps an overconfigured AI at the same twelve-press ceiling', () => {
  const current = fixture('hard', { rate: 1000 });
  combatRulesConfig.bladeLock.winMargin = 100;
  const times = [];
  let presses = 0;
  for (let step = 0; step < 60; step += 1) {
    requestAndStep(current);
    const { combat } = current.fighters[0];
    if (combat.lockPresses > presses) times.push(combat.lockLastPress);
    presses = combat.lockPresses;
  }
  assert.equal(presses, 12);
  for (let index = 1; index < times.length; index += 1) {
    assert.ok(times[index] - times[index - 1] + Number.EPSILON >= bladeLockTestNumbers.minPressInterval);
  }
});

it('uses seeded variation and missed attempts while keeping combat read-only', () => {
  const counts = [];
  for (let run = 0; run < 2; run += 1) {
    const current = fixture('hard', { random: createRandom(77), jitter: 0.4, mistake: 0.3 });
    combatRulesConfig.bladeLock.winMargin = 100;
    for (let step = 0; step < 60; step += 1) requestAndStep(current);
    counts.push(current.fighters[0].combat.lockPresses);
  }
  assert.equal(counts[0], counts[1]);
  assert.ok(counts[0] > 0 && counts[0] < proofRates.hard);
  const misses = fixture('easy', { mistake: 1 });
  for (let step = 0; step < 60; step += 1) requestAndStep(misses);
  assert.equal(misses.fighters[0].combat.lockPresses, 0);
});

it('clears queued attacks and held powers when a lock replaces a normal plan', () => {
  const current = fixture();
  Object.assign(current.ai.plan, { pendingAction: 'heavyAttack', delayedAction: 'heavyAttack', actionDelay: 0.3,
    blockTime: 1, powerHoldTime: 1, chargeHoldTime: 1, moveX: 1 });
  requestAndStep(current);
  assert.equal(current.ai.plan.delayedAction, null);
  assert.equal(current.ai.plan.powerHoldTime, 0);
  assert.equal(current.ai.plan.chargeHoldTime, 0);
  current.simulation.bladeLocks.finish(...current.fighters, current.fighters[0]);
  for (let step = 0; step < 60; step += 1) requestAndStep(current);
  assert.equal(current.fighters[0].combat.attack, null);
});

it('replays actual AI pressure intents from a middle snapshot through the result', () => {
  const current = fixture('hard', { random: createRandom(42), jitter: 0.4 });
  const { fighters, simulation, ai } = current;
  const buffer = new ReplayBuffer({ frames: 60, snapshotInterval: 15 });
  for (let step = 0; step < 70; step += 1) {
    ai.updateIntent(fighters[0].intent, STEP);
    fighters[1].clearIntent();
    buffer.record(fighters, STEP);
    simulation.step(STEP);
  }
  const playback = buffer.createPlayback();
  assert.ok(playback.snapshot.fighters[0].combat.lockOpponent >= 0);
  const clones = fighters.map((fighter, index) => {
    const clone = new Fighter({ id: fighter.id, name: fighter.name, stats: fighter.stats,
      appearance: fighter.appearance, x: fighter.x, y: fighter.floorY, facing: fighter.facing });
    restoreFighter(clone, playback.snapshot.fighters[index]);
    return clone;
  });
  const replay = createSimulation(clones, simulation.rules);
  for (let step = playback.firstStep; step < playback.lastStep; step += 1) replay.step(buffer.readStep(step, clones));
  assert.deepEqual(clones.map(captureFighter), fighters.map(captureFighter));
});

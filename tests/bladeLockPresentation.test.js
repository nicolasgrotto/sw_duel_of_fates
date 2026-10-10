import { it } from 'node:test';
import assert from 'node:assert/strict';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { combatRulesConfig } from '../src/config/combatRulesConfig.js';
import { effectsConfig } from '../src/config/effectsConfig.js';
import { Camera } from '../src/core/Camera.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { computePose, createPose, getBladeLockAdvantage } from '../src/rendering/fighterPose.js';
import { getBladeWorldPoints } from '../src/rendering/saberRenderer.js';
import { EffectsSystem } from '../src/systems/EffectsSystem.js';
import { TimeControl } from '../src/systems/TimeControl.js';
import { createRandom } from '../src/utils/random.js';
import { createSimulation, repeat, spawnFighter } from './helpers.js';

const STEP = 1 / 60;

function createLock(leftId = 'guardian', rightId = 'wasp') {
  const fighters = [spawnFighter(500, 1, leftId), spawnFighter(580, -1, rightId)];
  const simulation = createSimulation(fighters, { bladeLock: true });
  fighters.forEach((fighter) => { fighter.combat.attack = fighter.moves.heavy; });
  simulation.bladeLocks.tryStart(...fighters);
  return { fighters, simulation };
}

function step(simulation, fighters, times, pressing = null) {
  repeat(times, (index) => {
    for (const fighter of fighters) fighter.intent.lightAttack = fighter === pressing && index % 2 === 0;
    simulation.step(STEP);
  });
}

function createEffects() {
  const random = createRandom(7);
  return new EffectsSystem(effectsConfig, new Camera(effectsConfig, random), random, new TimeControl());
}

function bladeLine(fighter, fighters, victory = false) {
  const context = { advantage: getBladeLockAdvantage(fighter, fighters), victory };
  const pose = computePose(fighter, createPose(), false, context);
  return { pose, blade: getBladeWorldPoints(fighter, pose, { baseX: 0, baseY: 0, tipX: 0, tipY: 0 }) };
}

function distanceToBlade({ baseX, baseY, tipX, tipY }, x, y) {
  const dx = tipX - baseX;
  const dy = tipY - baseY;
  const along = ((x - baseX) * dx + (y - baseY) * dy) / (dx * dx + dy * dy);
  return { along, distance: Math.abs((x - baseX) * dy - (y - baseY) * dx) / Math.hypot(dx, dy) };
}

function expectedContact(fighters, advantage) {
  const [left, right] = fighters;
  return {
    x: (left.x + right.x) / 2 + advantage * effectsConfig.bladeLock.contactShift,
    y: left.y - effectsConfig.bladeLock.contactHeight,
  };
}

it('crosses both blades at the shared contact point for the guardian and the wasp', () => {
  const { fighters, simulation } = createLock();
  step(simulation, fighters, 10);
  const contact = expectedContact(fighters, 0);
  for (const fighter of fighters) {
    assert.equal(fighter.state, FighterState.BLADE_LOCK);
    const { distance, along } = distanceToBlade(bladeLine(fighter, fighters).blade, contact.x, contact.y);
    assert.ok(distance < 1.5, `${fighter.characterId} misses the contact by ${distance}`);
    assert.ok(along > 0.1 && along < 0.6, `${fighter.characterId} crosses at ${along} of the blade`);
  }
});

it('moves the contact toward the losing side and leans the leader forward', () => {
  const { fighters, simulation } = createLock('guardian', 'guardian');
  step(simulation, fighters, 10);
  fighters[0].combat.lockPresses = 2;
  const advantage = getBladeLockAdvantage(fighters[0], fighters);
  assert.equal(advantage, 2 / combatRulesConfig.bladeLock.winMargin);
  assert.equal(getBladeLockAdvantage(fighters[1], fighters), -advantage);
  const contact = expectedContact(fighters, advantage);
  const leader = bladeLine(fighters[0], fighters);
  const trailer = bladeLine(fighters[1], fighters);
  assert.ok(distanceToBlade(leader.blade, contact.x, contact.y).distance < 1.5);
  assert.ok(distanceToBlade(trailer.blade, contact.x, contact.y).distance < 1.5);
  assert.ok(leader.pose.shoulderX > trailer.pose.shoulderX);
  assert.ok(trailer.pose.hipY > leader.pose.hipY);
});

it('eases into the lock from the guard and shakes harder as the lock goes on', () => {
  const { fighters, simulation } = createLock('guardian', 'guardian');
  const [fighter] = fighters;
  const entering = bladeLine(fighter, fighters).pose.bladeAngle;
  step(simulation, fighters, 10);
  const locked = bladeLine(fighter, fighters).pose.bladeAngle;
  assert.notEqual(entering, locked);
  const spread = (from, to) => {
    const values = [];
    repeat(12, (index) => {
      fighter.combat.lockTime = from + (to - from) * index / 12;
      fighter.animation.time = index * 0.013;
      values.push(bladeLine(fighter, fighters).pose.handX);
    });
    return Math.max(...values) - Math.min(...values);
  };
  assert.ok(spread(1.9, 1.9) > spread(0.1, 0.1));
});

it('plays a short style victory only for the winner and clears it on recovery', () => {
  const { fighters, simulation } = createLock();
  const effects = createEffects();
  effects.handleEvents(simulation.events);
  for (let index = 0; index < 200 && fighters[0].state === FighterState.BLADE_LOCK; index += 1) {
    step(simulation, fighters, 1, index % 2 === 0 ? fighters[0] : null);
    effects.handleEvents(simulation.events);
  }
  const [winner, loser] = fighters;
  assert.equal(winner.state, FighterState.HIT);
  assert.equal(loser.state, FighterState.STAGGERED);
  assert.equal(effects.isLockWinner(winner), true);
  assert.equal(effects.isLockWinner(loser), false);
  assert.equal(effects.hasHitFlash(loser), true);
  step(simulation, fighters, 2);
  const victory = bladeLine(winner, fighters, true).pose.bladeAngle;
  const recoil = bladeLine(winner, fighters, false).pose.bladeAngle;
  assert.notEqual(victory, recoil);
  step(simulation, fighters, Math.ceil(combatRulesConfig.bladeLock.winnerRecovery / STEP) + 2);
  effects.update(STEP);
  assert.notEqual(winner.state, FighterState.HIT);
  assert.equal(effects.isLockWinner(winner), false);
});

it('sparks at the contact, lights the presser color and separates the draw from the cancel', () => {
  const { fighters, simulation } = createLock();
  const effects = createEffects();
  effects.handleEvents(simulation.events);
  const lit = () => effects.lights.filter((light) => light.active).map((light) => light.color);
  assert.ok(effects.particles.activeCount > 0);
  assert.deepEqual(new Set(lit()), new Set(fighters.map((fighter) => fighter.appearance.saberColor)));

  effects.update(1);
  const before = effects.particles.activeCount;
  effects.update(effectsConfig.bladeLock.sparkInterval);
  assert.ok(effects.particles.activeCount >= before);

  effects.update(1);
  effects.handleEvent({ type: CombatEvent.BLADE_LOCK_PRESS, attacker: fighters[1], defender: fighters[0], advantage: 1, x: 0, y: 0 });
  assert.deepEqual(lit(), [fighters[1].appearance.saberColor]);
  assert.ok(effects.particles.activeCount > 0);

  effects.update(1);
  effects.handleEvent({ type: CombatEvent.BLADE_LOCK_END, attacker: fighters[0], defender: fighters[1], winner: null, loser: null, draw: true, x: 0, y: 0 });
  assert.equal(lit().length, 2);
  assert.equal(effects.bladeLock.active, false);

  effects.update(1);
  effects.handleEvent({ type: CombatEvent.BLADE_LOCK_START, attacker: fighters[0], defender: fighters[1], x: 0, y: 0 });
  effects.update(1);
  const sparks = effects.particles.activeCount;
  effects.handleEvent({ type: CombatEvent.BLADE_LOCK_END, attacker: fighters[0], defender: fighters[1], winner: null, loser: null, draw: false, reason: 'reset', x: 0, y: 0 });
  assert.equal(lit().length, 0);
  assert.equal(effects.particles.activeCount, sparks);
});

it('stops the contact sparks when a reset leaves the lock without an end event', () => {
  const { fighters, simulation } = createLock();
  const effects = createEffects();
  effects.handleEvents(simulation.events);
  fighters.forEach((fighter) => fighter.restartState(FighterState.IDLE));
  effects.update(1);
  assert.equal(effects.bladeLock.active, false);
  effects.update(1);
  effects.update(effectsConfig.bladeLock.sparkInterval * 3);
  assert.equal(effects.particles.activeCount, 0);
});

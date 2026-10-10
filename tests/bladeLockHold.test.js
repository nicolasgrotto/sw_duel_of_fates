import { it } from 'node:test';
import assert from 'node:assert/strict';
import { Action } from '../src/config/controlsConfig.js';
import { combatRulesConfig } from '../src/config/combatRulesConfig.js';
import { PlayerController } from '../src/controllers/PlayerController.js';
import { ReplayBuffer, captureFighter, restoreFighter } from '../src/simulation/ReplayBuffer.js';
import { Fighter } from '../src/entities/Fighter.js';
import { STEP, createSimulation } from './helpers.js';
import { createBladeLockFixture, bladeLockTestNumbers } from './bladeLockHelpers.js';

it('uses independent human preferences at six presses per second below the simulation ceiling', () => {
  for (const enabled of [[false, false], [true, false], [false, true], [true, true]]) {
    const { fighters, simulation } = createBladeLockFixture();
    const settings = { bladeLockHold: enabled };
    const controllers = fighters.map((fighter, playerIndex) => new PlayerController({
      isDown: (action) => action === Action.LIGHT_ATTACK, wasPressed: () => false,
    }, { fighter, settings, playerIndex }));
    combatRulesConfig.bladeLock.winMargin = 100;
    for (let step = 0; step < 60; step += 1) {
      controllers.forEach((controller, index) => controller.updateIntent(fighters[index].intent, STEP));
      simulation.step(STEP);
    }
    assert.deepEqual(fighters.map((fighter) => fighter.combat.lockPresses), enabled.map((value) => value ? 6 : 0));
    Object.assign(combatRulesConfig.bladeLock, bladeLockTestNumbers);
  }
  assert.ok(bladeLockTestNumbers.holdRate < 1 / bladeLockTestNumbers.minPressInterval);
});

it('stops generating presses on release, outside a lock and after a round reset', () => {
  const { fighters: [a, b], simulation } = createBladeLockFixture();
  let held = true;
  const controller = new PlayerController({ isDown: (action) => held && action === Action.LIGHT_ATTACK,
    wasPressed: () => false }, { fighter: a, settings: { bladeLockHold: [true, false] } });
  for (let step = 0; step < 20; step += 1) {
    controller.updateIntent(a.intent, STEP);
    simulation.step(STEP);
  }
  const presses = a.combat.lockPresses;
  held = false;
  for (let step = 0; step < 20; step += 1) {
    controller.updateIntent(a.intent, STEP);
    simulation.step(STEP);
  }
  assert.equal(a.combat.lockPresses, presses);
  simulation.bladeLocks.finish(a, b, a);
  held = true;
  for (let step = 0; step < 60; step += 1) {
    controller.updateIntent(a.intent, STEP);
    simulation.step(STEP);
  }
  assert.equal(a.combat.attack, null);
  a.resetForRound(500, 1);
  controller.updateIntent(a.intent, STEP);
  assert.equal(a.intent.lightAttack, false);
});

it('preserves a quick press already released before the simulation step with hold enabled', () => {
  const { fighters: [a], simulation } = createBladeLockFixture();
  let pressed = true;
  const controller = new PlayerController({ isDown: () => false,
    wasPressed: (action) => pressed && action === Action.LIGHT_ATTACK },
  { fighter: a, settings: { bladeLockHold: [true, false] } });
  controller.updateIntent(a.intent, STEP);
  simulation.step(STEP);
  assert.equal(a.combat.lockPresses, 1);
  pressed = false;
  for (let step = 0; step < 20; step += 1) {
    controller.updateIntent(a.intent, STEP);
    simulation.step(STEP);
  }
  assert.equal(a.combat.lockPresses, 1);
});

it('replays held-option intents from a middle snapshot without reading settings', () => {
  const { fighters, simulation } = createBladeLockFixture();
  const settings = { bladeLockHold: [true, false] };
  const controller = new PlayerController({ isDown: (action) => action === Action.LIGHT_ATTACK,
    wasPressed: () => false }, { fighter: fighters[0], settings });
  const buffer = new ReplayBuffer({ frames: 60, snapshotInterval: 15 });
  for (let step = 0; step < 70; step += 1) {
    controller.updateIntent(fighters[0].intent, STEP);
    fighters[1].clearIntent();
    buffer.record(fighters, STEP);
    simulation.step(STEP);
  }
  const playback = buffer.createPlayback();
  assert.ok(playback.snapshot.fighters[0].combat.lockOpponent >= 0);
  settings.bladeLockHold = [false, false];
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

it('discards captured presses while input has lost focus', () => {
  const { fighters: [a], simulation } = createBladeLockFixture();
  const input = { focused: true, isDown: () => false,
    wasPressed: (action) => action === Action.LIGHT_ATTACK };
  const controller = new PlayerController(input, { fighter: a });
  controller.captureInput();
  input.focused = false;
  controller.updateIntent(a.intent, STEP);
  simulation.step(STEP);
  assert.equal(a.combat.lockPresses, 0);
});

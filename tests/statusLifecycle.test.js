import { it } from 'node:test';
import assert from 'node:assert/strict';
import { powersConfig } from '../src/config/powersConfig.js';
import { createSimulation, spawnFighter } from './helpers.js';
import { assertSnapshotContinuation } from './consequenceHelpers.js';

for (const effect of ['heal', 'focus', 'wrath']) {
  it(`${effect} records completion, replacement, reset and death`, () => {
    const fighter = spawnFighter(400);
    const opponent = spawnFighter(1000, -1);
    const { combat } = createSimulation([fighter, opponent]);
    combat.statuses.start(fighter, effect, 1);
    assert.equal(fighter.combat[`${effect}End`], null);
    combat.statuses.start(fighter, effect, 2);
    assert.equal(fighter.combat[`${effect}End`], 'replaced');
    assert.equal(fighter.combat[`${effect}Time`], 2);
    combat.statuses.advance(fighter, effect, 2);
    assert.equal(fighter.combat[`${effect}End`], 'completed');
    combat.statuses.start(fighter, effect, 1);
    combat.statuses.onDeath(fighter);
    assert.equal(fighter.combat[`${effect}End`], 'death');
    fighter.resetForRound(400, 1);
    assert.equal(fighter.combat[`${effect}Time`], 0);
    assert.equal(fighter.combat[`${effect}End`], 'reset');
  });
}

it('distinguishes interrupted healing from lethal damage and preserves combat buffs on nonlethal damage', () => {
  const fighter = spawnFighter(400);
  const opponent = spawnFighter(1000, -1);
  const { combat } = createSimulation([fighter, opponent]);
  for (const effect of ['heal', 'focus', 'wrath']) combat.statuses.start(fighter, effect, 2);
  combat.applyStatusDamage(fighter, opponent, 1);
  assert.equal(fighter.combat.healEnd, 'interrupted');
  assert.equal(fighter.combat.focusTime, 2);
  assert.equal(fighter.combat.wrathTime, 2);
  combat.statuses.start(fighter, 'heal', 2);
  combat.applyStatusDamage(fighter, opponent, fighter.health);
  for (const effect of ['heal', 'focus', 'wrath']) assert.equal(fighter.combat[`${effect}End`], 'death');
});

it('clears cost reduction on depletion and on normal completion', () => {
  const fighter = spawnFighter(400);
  const { combat } = createSimulation([fighter]);
  combat.powers.applySelf(fighter, powersConfig.powers.focus);
  combat.statuses.end(fighter, 'focus', 'depleted');
  assert.equal(fighter.combat.focusEnd, 'depleted');
  assert.equal(fighter.combat.focusScale, 1);
});

for (const effect of ['heal', 'focus']) {
  it(`replays snapshots before, during and after ${effect}`, () => {
    const fighters = [spawnFighter(400), spawnFighter(1000, -1)];
    const simulation = createSimulation(fighters, { powers: true });
    fighters[0].health *= 0.5;
    assertSnapshotContinuation(simulation, 1);
    simulation.combat.powers.applySelf(fighters[0], powersConfig.powers[effect]);
    assertSnapshotContinuation(simulation, 30);
    assert.ok(fighters[0].combat[`${effect}Time`] > 0);
    assertSnapshotContinuation(simulation, 300);
    assert.equal(fighters[0].combat[`${effect}End`], 'completed');
    assertSnapshotContinuation(simulation, 10);
  });
}

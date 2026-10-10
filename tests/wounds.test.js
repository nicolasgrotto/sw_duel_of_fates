import { it } from 'node:test';
import assert from 'node:assert/strict';
import { powersConfig } from '../src/config/powersConfig.js';
import { CombatAction } from '../src/combat/actionBuffer.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { getStaminaCost } from '../src/systems/StaminaSystem.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';
import { assertSnapshotContinuation } from './consequenceHelpers.js';

function setup() {
  const attacker = spawnFighter(400);
  const defender = spawnFighter(1000, -1, 'wasp');
  defender.combat.exhausted = true;
  const simulation = createSimulation([attacker, defender], { powers: true, exhaustion: true, wounds: true });
  return { attacker, defender, simulation, combat: simulation.combat };
}

function hit(setup, id, overrides = {}) {
  const { attacker, defender, combat } = setup;
  combat.applyHit({ attacker, defender, attack: { ...attacker.moves[id], ...overrides }, attackType: id });
}

it('gives light attacks the bonus without a wound and heavy attacks one wound per round', () => {
  const duel = setup();
  hit(duel, 'light');
  assert.equal(duel.defender.combat.wound, null);
  hit(duel, 'heavy');
  assert.equal(duel.defender.combat.wound, 'arm');
  assert.equal(duel.defender.combat.woundUsed, true);
  duel.defender.health = duel.defender.stats.maxHealth;
  hit(duel, 'forwardHeavy');
  assert.equal(duel.defender.combat.wound, 'arm');
  duel.defender.resetForRound(1000, -1);
  assert.equal(duel.defender.combat.wound, null);
  assert.equal(duel.defender.combat.woundUsed, false);
  duel.defender.combat.exhausted = true;
  hit(duel, 'forwardHeavy');
  assert.equal(duel.defender.combat.wound, 'leg');
});

it('requires exhaustion, positive nonlethal damage and a declared region', () => {
  for (const condition of ['fresh', 'zero', 'lethal', 'undeclared', 'disabled']) {
    const duel = setup();
    if (condition === 'fresh') duel.defender.combat.exhausted = false;
    if (condition === 'lethal') duel.defender.health = 1;
    if (condition === 'disabled') duel.combat.rules.wounds = false;
    hit(duel, 'heavy', condition === 'zero' ? { damage: 0 } : condition === 'undeclared' ? { wound: null } : {});
    assert.equal(duel.defender.combat.wound, null, condition);
    assert.equal(duel.defender.combat.woundUsed, false, condition);
  }
  const declared = setup();
  hit(declared, 'light', { wound: 'leg' });
  assert.equal(declared.defender.combat.wound, 'leg');
});

it('effective guard, parry and barrier prevent wounds', () => {
  for (const defense of ['block', 'parry', 'barrier']) {
    const { attacker, defender, combat } = setup();
    defender.setState(FighterState.BLOCKING);
    if (defense === 'parry') defender.combat.parryArmed = true;
    if (defense === 'barrier') {
      defender.combat.power = powersConfig.powers.barrier;
      defender.stateTime = powersConfig.powers.barrier.startup;
      defender.setState(FighterState.CHANNELING);
      defender.stateTime = powersConfig.powers.barrier.startup;
    }
    combat.resolveContact({ attacker, defender, attack: attacker.moves.heavy, attackType: 'heavy' });
    assert.equal(defender.combat.wound, null, defense);
    assert.equal(defender.health, defender.stats.maxHealth, defense);
  }
});

it('invulnerability and resisted powers never consume the wound quota', () => {
  const { attacker, defender, combat } = setup();
  defender.x = attacker.x + 65;
  combat.tryAttack(attacker, 'heavy');
  attacker.stateTime = attacker.moves.heavy.startup;
  combat.tryDodge(defender);
  combat.resolveHits([attacker, defender]);
  assert.equal(defender.health, defender.stats.maxHealth);
  assert.equal(defender.combat.woundUsed, false);
  defender.restartState(FighterState.IDLE);
  defender.stats = { ...defender.stats, flowLevel: 10 };
  attacker.stats = { ...attacker.stats, flowLevel: 1 };
  combat.powers.strike(attacker, defender, powersConfig.powers.push, 'active', null);
  assert.equal(defender.health, defender.stats.maxHealth);
  assert.equal(defender.combat.woundUsed, false);
});

it('arm and leg change only their derived costs and combine with focus', () => {
  const { defender } = setup();
  const stats = structuredClone(defender.stats);
  defender.combat.wound = 'arm';
  assert.equal(getStaminaCost(defender, 20, 'block'), 27);
  assert.equal(getStaminaCost(defender, 20, 'dash'), 20);
  defender.combat.wound = 'leg';
  assert.equal(getStaminaCost(defender, 20, 'block'), 20);
  assert.equal(getStaminaCost(defender, 20, 'dash'), 27);
  defender.combat.focusTime = 1;
  defender.combat.focusScale = 0.5;
  assert.equal(getStaminaCost(defender, 20, 'dash'), 13.5);
  assert.equal(getStaminaCost(defender, 20), 10);
  assert.deepEqual(defender.stats, stats);
});

it('leg wound charges ground and air dashes correctly while manual evasion stays free', () => {
  const { defender, combat } = setup();
  defender.combat.wound = 'leg';
  const before = defender.stamina;
  assert.equal(combat.tryDodge(defender), true);
  assert.ok(Math.abs(before - defender.stamina - defender.stats.dodge.staminaCost * 1.35) < 1e-9);
  defender.restartState(FighterState.JUMPING);
  defender.grounded = false;
  defender.combat.bufferedAction = CombatAction.DODGE;
  const airBefore = defender.stamina;
  combat.tryAirDash(defender);
  assert.ok(Math.abs(airBefore - defender.stamina - defender.stats.airDash.staminaCost * 1.35) < 1e-9);
  const evadeBefore = defender.stamina;
  combat.tryEvade(defender);
  assert.equal(defender.stamina, evadeBefore);
});

it('preserves the first jump and wall jump but rejects the second without canceling an airborne wound', () => {
  const duel = setup();
  const { defender, simulation } = duel;
  defender.combat.wound = 'leg';
  defender.intent.jump = true;
  simulation.movement.applyJump(defender);
  assert.equal(defender.combat.jumpsUsed, 1);
  assert.equal(defender.vy, -defender.stats.movement.jumpVelocity);
  defender.vy = 100;
  simulation.movement.applyJump(defender);
  assert.equal(defender.vy, 100);
  assert.equal(defender.combat.jumpsUsed, 1);
  defender.combat.wound = null;
  defender.combat.woundUsed = false;
  defender.combat.jumpsUsed = 2;
  hit(duel, 'forwardHeavy');
  assert.equal(defender.vy, 100);
  assert.equal(defender.combat.jumpsUsed, 1);
  defender.stats = { ...defender.stats, wallJump: { wallMargin: 5, speed: 200, heightScale: 1 } };
  defender.x = simulation.arena.left + defender.width / 2;
  assert.equal(simulation.movement.tryWallJump(defender), true);
});

it('full-health healing clears only on completion and keeps the round quota used', () => {
  const { defender, combat } = setup();
  defender.combat.wound = 'arm';
  defender.combat.woundUsed = true;
  combat.powers.applySelf(defender, powersConfig.powers.heal);
  combat.statuses.update([defender], 1);
  assert.equal(defender.combat.wound, 'arm');
  assert.equal(defender.health, defender.stats.maxHealth);
  combat.statuses.update([defender], 1);
  assert.equal(defender.combat.healEnd, 'completed');
  assert.equal(defender.combat.wound, null);
  assert.equal(defender.combat.woundUsed, true);
});

for (const source of ['blade', 'periodic']) {
  it(`${source} damage on the last healing tick prevents wound removal`, () => {
    const { attacker, defender, combat, simulation } = setup();
    defender.combat.wound = 'leg';
    defender.combat.woundUsed = true;
    combat.powers.applySelf(defender, powersConfig.powers.heal);
    defender.combat.healTime = STEP;
    if (source === 'blade') {
      defender.x = attacker.x + 65;
      combat.tryAttack(attacker, 'light');
      attacker.stateTime = attacker.moves.light.startup;
    } else {
      defender.combat.chokeTime = STEP;
      defender.combat.chokeDamageRate = 4;
    }
    simulation.step(STEP);
    assert.equal(defender.combat.healEnd, 'interrupted');
    assert.equal(defender.combat.wound, 'leg');
  });
}

it('replays wounded fighters during healing and after its completion', () => {
  const { defender, combat, simulation } = setup();
  defender.combat.wound = 'leg';
  defender.combat.woundUsed = true;
  assertSnapshotContinuation(simulation, 30);
  combat.powers.applySelf(defender, powersConfig.powers.heal);
  assertSnapshotContinuation(simulation, 30);
  assert.equal(defender.combat.wound, 'leg');
  assertSnapshotContinuation(simulation, 150);
  assert.equal(defender.combat.wound, null);
  assertSnapshotContinuation(simulation, 10);
});

import { it } from 'node:test';
import assert from 'node:assert/strict';
import { combatRulesConfig } from '../src/config/combatRulesConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { spendStamina } from '../src/systems/StaminaSystem.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';
import { assertSnapshotContinuation } from './consequenceHelpers.js';

function setup(rules = { exhaustion: true }) {
  const attacker = spawnFighter(400);
  const defender = spawnFighter(1000, -1);
  const simulation = createSimulation([attacker, defender], rules);
  const contact = { attacker, defender, attack: attacker.moves.light, attackType: 'light' };
  return { attacker, defender, simulation, contact, combat: simulation.combat };
}

it('enters only on spending at or below the configured threshold', () => {
  const { attacker, simulation, combat } = setup();
  attacker.stamina = 1;
  simulation.stamina.update([attacker], STEP);
  combat.spendStamina(attacker, 0);
  assert.equal(attacker.combat.exhausted, false);
  const cost = attacker.moves.light.staminaCost;
  attacker.stamina = cost + attacker.stats.maxStamina * combatRulesConfig.exhaustion.enterRatio;
  assert.equal(combat.tryAttack(attacker, 'light'), true);
  assert.equal(attacker.combat.exhausted, true);
  assert.equal(attacker.combat.exhaustionCause, 'spend');
  attacker.resetForRound(400, 1);
  attacker.stamina = cost + attacker.stats.maxStamina * combatRulesConfig.exhaustion.enterRatio + 0.01;
  combat.tryAttack(attacker, 'light');
  assert.equal(attacker.combat.exhausted, false);
});

it('records block, guardBreak and drain at their actual spend sites', () => {
  const { attacker, defender, combat, contact } = setup({ powers: true, exhaustion: true });
  defender.stamina = contact.attack.blockStaminaCost * defender.stats.blockStaminaScale + defender.stats.maxStamina * 0.1;
  combat.resolveBlock(contact);
  assert.equal(defender.combat.exhaustionCause, 'block');
  defender.resetForRound(1000, -1);
  defender.stamina = 0;
  combat.breakGuard(defender, contact);
  assert.equal(defender.combat.exhaustionCause, 'guardBreak');
  defender.resetForRound(1000, -1);
  defender.stamina = attacker.moves.shove.staminaDamage;
  combat.applyShove({ ...contact, attack: attacker.moves.shove, attackType: 'shove' });
  assert.equal(defender.combat.exhaustionCause, 'drain');
  attacker.stamina = 1;
  combat.resolveParry(contact);
  assert.equal(attacker.combat.exhaustionCause, 'drain');
  defender.resetForRound(1000, -1);
  defender.stamina = 1;
  defender.setState(FighterState.BLOCKING);
  defender.x = attacker.x + 80;
  combat.powers.strike(attacker, defender, powersConfig.powers.lightning, 'tick', null);
  assert.equal(defender.combat.exhaustionCause, 'drain');
});

it('requires both exit thresholds without reducing regeneration', () => {
  const { attacker, simulation, combat } = setup();
  combat.spendStamina(attacker, attacker.stamina);
  attacker.combat.staminaRegenDelay = 0;
  simulation.stamina.update([attacker], STEP);
  assert.equal(attacker.stamina, attacker.stats.stamina.regenPerSecond * STEP);
  attacker.stamina = attacker.stats.maxStamina;
  simulation.stamina.update([attacker], 0.5);
  assert.equal(attacker.combat.exhausted, true);
  attacker.stamina = attacker.stats.maxStamina * 0.2;
  attacker.combat.staminaRegenDelay = 10;
  simulation.stamina.update([attacker], 1);
  assert.equal(attacker.combat.exhausted, true);
  attacker.stamina = attacker.stats.maxStamina * 0.4;
  simulation.stamina.update([attacker], STEP);
  assert.equal(attacker.combat.exhausted, false);
});

it('extends exhaustion on guard break without extra stun', () => {
  const { defender, simulation, combat, contact } = setup();
  combat.spendStamina(defender, defender.stamina);
  defender.combat.exhaustionTime = 0.8;
  combat.breakGuard(defender, contact);
  assert.equal(defender.combat.stunDuration, defender.stats.guardBreakStun);
  assert.equal(defender.combat.exhaustionTime, 0);
  defender.stamina = defender.stats.maxStamina;
  simulation.stamina.update([defender], 1.59);
  assert.equal(defender.combat.exhausted, true);
  simulation.stamina.update([defender], 0.02);
  assert.equal(defender.combat.exhausted, false);
});

it('uses move data for bonus damage and excludes other sources', () => {
  const { attacker, defender, combat } = setup();
  defender.combat.exhausted = true;
  for (const id of ['light', 'light2', 'heavy', 'forwardHeavy', 'riposte', 'air']) {
    assert.equal(attacker.moves[id].exhaustionBonus, true, id);
    assert.equal(combat.getDamageAmount({ attacker, defender, attack: attacker.moves[id] }, 10, 'blade'), 12);
  }
  for (const id of ['special', 'dashSlash', 'saberThrow']) {
    assert.notEqual(attacker.moves[id].exhaustionBonus, true, id);
    assert.equal(combat.getDamageAmount({ attacker, defender, attack: attacker.moves[id] }, 10, 'blade'), 10);
  }
  for (const source of ['power', 'periodic']) assert.equal(combat.getDamageAmount({ attacker, defender }, 10, source), 10);
});

it('preserves legacy spending and damage with the capability disabled', () => {
  const { attacker, defender, combat, contact } = setup({});
  spendStamina(attacker, attacker.stamina);
  assert.equal(attacker.combat.exhausted, false);
  defender.combat.exhausted = true;
  assert.equal(combat.getDamageAmount(contact, 10, 'blade'), 10);
});

it('replays snapshots before, during and after exhaustion', () => {
  const { attacker, simulation, combat } = setup();
  assertSnapshotContinuation(simulation, 1);
  combat.spendStamina(attacker, attacker.stamina, 'guardBreak');
  assertSnapshotContinuation(simulation, 30);
  assert.equal(attacker.combat.exhausted, true);
  assertSnapshotContinuation(simulation, 600);
  assert.equal(attacker.combat.exhausted, false);
  assertSnapshotContinuation(simulation, 10);
});

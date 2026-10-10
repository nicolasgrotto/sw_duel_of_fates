import { it } from 'node:test';
import assert from 'node:assert/strict';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { isNeutralForFocus } from '../src/combat/StatusSystem.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { getStaminaCost } from '../src/systems/StaminaSystem.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';
import { assertSnapshotContinuation } from './consequenceHelpers.js';

function setup(rules = { powers: true, focusEvade: true }) {
  const attacker = spawnFighter(400, 1, 'shadow');
  const defender = spawnFighter(470, -1, 'bastion');
  const simulation = createSimulation([attacker, defender], rules);
  const combat = simulation.combat;
  defender.flowMeter = 100;
  combat.powers.applySelf(defender, powersConfig.powers.focus);
  const contact = { attacker, defender, attack: attacker.moves.light, attackType: 'light' };
  return { attacker, defender, simulation, combat, contact };
}

it('pays for multiple defenses exactly once and ends when the next defense is unaffordable', () => {
  const { defender, combat, contact } = setup();
  defender.flowMeter = 36;
  defender.combat.evadeStreak = 3;
  const duration = defender.combat.focusTime;
  for (const remaining of [24, 12, 0]) {
    combat.resolveContact({ ...contact });
    assert.equal(defender.flowMeter, remaining);
    assert.equal(defender.combat.evadeStreak, 3);
    assert.equal(defender.health, defender.stats.maxHealth);
    if (remaining > 0) assert.equal(defender.combat.focusTime, duration);
  }
  assert.equal(combat.events.filter((event) => event.type === CombatEvent.EVADE_SUCCESS && event.auto === true).length, 3);
  assert.equal(defender.combat.focusTime, 0);
  assert.equal(defender.combat.focusEnd, 'depleted');
  assert.equal(getStaminaCost(defender, 20), 20);
  combat.powers.gain(defender, 100);
  combat.resolveContact({ ...contact });
  assert.ok(defender.health < defender.stats.maxHealth);
  assert.equal(defender.combat.focusTime, 0);
});

it('allows an exact cost and rejects a balance just below it without any debit', () => {
  for (const meter of [12, 12 - Number.EPSILON * 12]) {
    const { defender, combat, contact } = setup();
    defender.flowMeter = meter;
    combat.resolveContact(contact);
    const evaded = combat.events.some((event) => event.auto === true);
    assert.equal(evaded, meter === 12);
    assert.equal(defender.flowMeter, meter === 12 ? 0 : meter + combat.powers.config.meter.gain.hitTaken * defender.stats.power.gainScale);
    assert.equal(defender.combat.focusEnd, 'depleted');
  }
});

it('gives a valid manual evade priority without spending flow', () => {
  const { defender, combat, contact } = setup();
  defender.flowMeter = 12;
  defender.combat.evadeStreak = 2;
  combat.tryEvade(defender);
  combat.resolveContact({ ...contact, evaded: true });
  assert.equal(defender.flowMeter, 12);
  assert.equal(defender.combat.evadeStreak, 3);
  assert.ok(defender.combat.focusTime > 0);
  assert.notEqual(combat.events.at(-1).auto, true);
});

it('requires real neutral posture including every intent action and held action', () => {
  const { defender } = setup();
  assert.equal(isNeutralForFocus(defender), true);
  for (const action of Object.keys(defender.intent)) {
    defender.intent[action] = action === 'moveX' ? 1 : true;
    assert.equal(isNeutralForFocus(defender), false, action);
    defender.clearIntent();
  }
  for (const state of Object.values(FighterState).filter((state) => state !== FighterState.IDLE)) {
    defender.state = state;
    assert.equal(isNeutralForFocus(defender), false, state);
  }
  defender.state = FighterState.IDLE;
  defender.grounded = false;
  assert.equal(isNeutralForFocus(defender), false);
});

it('does not defend shoves, powers, periodic damage or saber projectiles', () => {
  for (const source of ['shove', 'power', 'periodic', 'projectile']) {
    const { attacker, defender, combat, contact } = setup();
    const meter = defender.flowMeter;
    if (source === 'shove') combat.resolveContact({ ...contact, attack: attacker.moves.shove, attackType: 'shove' });
    if (source === 'power') combat.dealPowerDamage(attacker, defender, powersConfig.powers.push, 1, CombatEvent.POWER_HIT);
    if (source === 'periodic') combat.applyStatusDamage(defender, attacker, 1);
    if (source === 'projectile') {
      combat.projectiles.strikeWithSaber({ source: 'dashSlash', x: defender.x, y: defender.y - 60, vx: 1, returning: true }, attacker, defender);
    }
    assert.ok(!combat.events.some((event) => event.auto === true), source);
    assert.ok(defender.flowMeter >= meter, source);
  }
});

it('consumes the contact and never renews the duration', () => {
  const { attacker, defender, combat, simulation } = setup();
  combat.tryAttack(attacker, 'light');
  attacker.stateTime = attacker.moves.light.startup;
  defender.combat.focusTime = STEP;
  combat.resolveHits([attacker, defender]);
  combat.resolveHits([attacker, defender]);
  assert.equal(combat.events.filter((event) => event.auto === true).length, 1);
  assert.equal(attacker.combat.hasHit, true);
  simulation.combat.statuses.update([attacker, defender], STEP);
  assert.equal(defender.combat.focusEnd, 'completed');
});

it('preserves the v2 focus behavior without its new capability or without powers', () => {
  for (const rules of [{ powers: true }, { focusEvade: true }]) {
    const { defender, combat, contact } = setup(rules);
    combat.resolveContact(contact);
    assert.ok(defender.health < defender.stats.maxHealth);
    assert.ok(defender.combat.focusTime > 0);
    assert.equal(getStaminaCost(defender, 20), 10);
  }
});

it('replays neutral automatic defense from intermediate focus snapshots', () => {
  const { attacker, defender, simulation } = setup();
  const attack = (fighters, step) => { fighters[0].intent.lightAttack = step % 45 === 0; };
  assertSnapshotContinuation(simulation, 50, attack);
  assert.ok(defender.combat.focusTime > 0);
  assert.equal(defender.health, defender.stats.maxHealth);
  assertSnapshotContinuation(simulation, 300, attack);
  assert.equal(defender.combat.focusTime, 0);
  assertSnapshotContinuation(simulation, 10);
});

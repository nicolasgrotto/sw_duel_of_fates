import { it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { characters } from '../src/characters/characterData.js';
import { getAbilityCategory, findLoadoutProblems } from '../src/characters/powers.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { bladeTechniques } from '../src/config/movesConfig.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';
import { assertSnapshotContinuation } from './consequenceHelpers.js';

const { wrath } = powersConfig.powers;

function setup() {
  const attacker = spawnFighter(400, 1, 'shadow');
  const defender = spawnFighter(1000, -1);
  const simulation = createSimulation([attacker, defender], { powers: true, exhaustion: true });
  return { attacker, defender, simulation, combat: simulation.combat };
}

it('catalogs wrath in Eclipse and equips it only on the reaper', () => {
  assert.equal(getAbilityCategory('wrath', powersConfig), 'eclipse');
  assert.deepEqual(findLoadoutProblems({ powers: { neutral: 'wrath' } }, 'dark', powersConfig, bladeTechniques), []);
  assert.ok(findLoadoutProblems({ powers: { neutral: 'wrath' } }, 'light', powersConfig, bladeTechniques).length > 0);
  assert.deepEqual(Object.values(characters).filter(character => Object.values(character.loadout.powers).includes('wrath')).map(character => character.id), ['reaper']);
  const output = execFileSync(process.execPath, ['tools/simulate.js', '--duels', '1', '--maxSeconds', '0.1', '--rules', 'powers', '--set', 'loadouts.shadow.powers.forward=wrath'], { encoding: 'utf8' });
  assert.match(output, /loadouts.shadow.powers.forward=wrath/);
});

it('pays the cast cost once and applies wrath only after its startup', () => {
  const { attacker, combat, simulation } = setup();
  attacker.stats.power.loadout = { neutral: wrath };
  attacker.flowMeter = wrath.cost - 1;
  assert.equal(combat.powers.tryCast(attacker), false);
  attacker.flowMeter = wrath.cost;
  assert.equal(combat.powers.tryCast(attacker), true);
  assert.equal(attacker.flowMeter, 0);
  assert.equal(attacker.state, FighterState.CASTING);
  attacker.stateTime = wrath.startup - STEP * 2;
  simulation.step(STEP);
  assert.equal(attacker.combat.wrathTime, 0);
  simulation.step(STEP * 2);
  assert.ok(attacker.combat.wrathTime > 0);
  assert.equal(attacker.combat.wrathDamageDealtScale, 1.2);
  assert.equal(attacker.combat.wrathDamageTakenScale, 0.85);
});

it('applies the ordered blade and power multipliers but leaves periodic damage alone', () => {
  const { attacker, defender, combat } = setup();
  combat.powers.applySelf(attacker, wrath);
  combat.powers.applySelf(defender, wrath);
  defender.combat.exhausted = true;
  defender.combat.attack = { armor: { damageScale: 0.6 } };
  const contact = { attacker, defender, attack: attacker.moves.heavy, armored: true };
  const expected = 10 * 1.2 * 1.2 * 0.85 * 0.6;
  assert.equal(combat.getDamageAmount(contact, 10, 'blade'), expected);
  assert.equal(combat.getDamageAmount(contact, 10, 'power'), 10 * 1.2 * 0.85);
  assert.equal(combat.getDamageAmount(contact, 10, 'periodic'), 10);
  defender.combat.attack = null;
  const health = defender.health;
  combat.dealPowerDamage(attacker, defender, powersConfig.powers.push, 10 * attacker.stats.power.potency, CombatEvent.POWER_HIT);
  assert.ok(Math.abs(health - defender.health - 10 * attacker.stats.power.potency * 1.2 * 0.85) < 1e-9);
});

it('replaces rather than stacks and clears scales on completion', () => {
  const { attacker, combat } = setup();
  combat.powers.applySelf(attacker, wrath);
  const duration = wrath.duration * attacker.stats.power.potency;
  combat.statuses.advance(attacker, 'wrath', 1);
  combat.powers.applySelf(attacker, wrath);
  assert.equal(attacker.combat.wrathTime, duration);
  assert.equal(attacker.combat.wrathEnd, 'replaced');
  assert.equal(attacker.combat.wrathDamageDealtScale, 1.2);
  combat.statuses.advance(attacker, 'wrath', duration);
  assert.equal(attacker.combat.wrathEnd, 'completed');
  assert.equal(attacker.combat.wrathDamageDealtScale, 1);
  assert.equal(attacker.combat.wrathDamageTakenScale, 1);
});

it('uses armor against blade interruption but not shove, parry or guard break', () => {
  const { attacker, defender, combat } = setup();
  combat.powers.applySelf(defender, wrath);
  const contact = { attacker, defender, attack: attacker.moves.light, attackType: 'light' };
  combat.applyHit(contact);
  assert.equal(defender.state, FighterState.IDLE);
  assert.equal(contact.armored, false);
  assert.equal(defender.combat.wrathArmorHits, wrath.armorHits - 1);
  assert.ok(combat.events.some(event => event.type === CombatEvent.WRATH_ARMOR));
  assert.ok(defender.combat.wrathTime > 0);
  combat.applyShove({ ...contact, attack: attacker.moves.shove, attackType: 'shove' });
  assert.equal(defender.state, FighterState.STAGGERED);
  combat.breakGuard(defender, contact);
  assert.equal(defender.state, FighterState.STUNNED);
  combat.powers.applySelf(attacker, wrath);
  combat.resolveParry(contact);
  assert.equal(attacker.state, FighterState.STAGGERED);
  assert.ok(attacker.combat.wrathTime > 0);
});

for (const state of [FighterState.IDLE, FighterState.WALKING, FighterState.ATTACKING, FighterState.CASTING, FighterState.CHANNELING]) {
  it('keeps the current state and action through two wrath blade armor hits in ' + state, () => {
    const { attacker, defender, combat } = setup();
    combat.powers.applySelf(defender, wrath);
    defender.restartState(state);
    defender.stateTime = 0.2;
    const action = state === FighterState.ATTACKING ? defender.moves.light : null;
    defender.combat.attack = action;
    const power = state === FighterState.CASTING || state === FighterState.CHANNELING ? powersConfig.powers.choke : null;
    defender.combat.power = power;
    for (let hit = 0; hit < wrath.armorHits; hit++) {
      const before = defender.health;
      const contact = { attacker, defender, attack: attacker.moves.light, attackType: 'light' };
      combat.applyHit(contact);
      assert.ok(defender.health < before);
      assert.equal(defender.state, state);
      assert.equal(defender.stateTime, 0.2);
      assert.equal(defender.combat.attack, action);
      assert.equal(defender.combat.power, power);
      assert.equal(defender.combat.wrathArmorHits, wrath.armorHits - hit - 1);
      assert.equal(contact.armored, false);
    }
    assert.equal(combat.events.filter(event => event.type === CombatEvent.WRATH_ARMOR).length, wrath.armorHits);
    combat.applyHit({ attacker, defender, attack: attacker.moves.light, attackType: 'light' });
    assert.equal(defender.state, FighterState.HIT);
    assert.equal(defender.combat.attack, null);
    assert.equal(defender.combat.power, null);
  });
}

it('does not consume wrath armor on guard, parry or an existing action armor hit', () => {
  const { attacker, defender, combat } = setup();
  combat.powers.applySelf(defender, wrath);
  const contact = { attacker, defender, attack: attacker.moves.light, attackType: 'light' };
  defender.restartState(FighterState.BLOCKING);
  combat.resolveContact(contact);
  assert.equal(defender.combat.wrathArmorHits, wrath.armorHits);
  defender.combat.parryArmed = true;
  combat.resolveContact(contact);
  assert.equal(defender.combat.wrathArmorHits, wrath.armorHits);
  defender.combat.attack = { ...defender.moves.light, armor: { damageScale: 0.6 } };
  defender.combat.armorHits = 1;
  defender.restartState(FighterState.ATTACKING);
  combat.applyHit({ ...contact });
  assert.equal(defender.combat.armorHits, 0);
  assert.equal(defender.combat.wrathArmorHits, wrath.armorHits);
  assert.equal(defender.state, FighterState.ATTACKING);
});

it('leaves projectile hits and power control free to interrupt without armor consumption', () => {
  const { attacker, defender, combat } = setup();
  combat.powers.applySelf(defender, wrath);
  combat.applyHit({ attacker, defender, attack: { ...attacker.moves.light, projectile: true }, attackType: 'saberThrow' });
  assert.equal(defender.state, FighterState.HIT);
  assert.equal(defender.combat.wrathArmorHits, wrath.armorHits);
  combat.powers.strike(attacker, defender, powersConfig.powers.freeze, 'active', null);
  assert.equal(defender.state, FighterState.STUNNED);
  assert.equal(defender.combat.wrathArmorHits, wrath.armorHits);
});

it('refills wrath charges on reapplication and clears them on expiry, death and reset', () => {
  const { attacker, defender, combat } = setup();
  combat.powers.applySelf(defender, wrath);
  combat.applyHit({ attacker, defender, attack: attacker.moves.light, attackType: 'light' });
  combat.powers.applySelf(defender, wrath);
  assert.equal(defender.combat.wrathArmorHits, wrath.armorHits);
  combat.statuses.advance(defender, 'wrath', defender.combat.wrathTime);
  assert.equal(defender.combat.wrathArmorHits, 0);
  combat.powers.applySelf(defender, wrath);
  defender.health = 1;
  combat.applyHit({ attacker, defender, attack: attacker.moves.light, attackType: 'light' });
  assert.equal(defender.state, FighterState.DEAD);
  assert.equal(defender.combat.wrathArmorHits, 0);
  defender.resetForRound(defender.x, defender.facing);
  assert.equal(defender.combat.wrathArmorHits, 0);
});

it('replays snapshots before, during and after wrath', () => {
  const { attacker, simulation, combat } = setup();
  assertSnapshotContinuation(simulation, 1);
  attacker.stats.power.loadout = { neutral: wrath };
  attacker.flowMeter = 100;
  combat.powers.tryCast(attacker);
  assertSnapshotContinuation(simulation, 10);
  assert.equal(attacker.combat.wrathTime, 0);
  assertSnapshotContinuation(simulation, 30);
  assert.ok(attacker.combat.wrathTime > 0);
  assertSnapshotContinuation(simulation, 400);
  assert.equal(attacker.combat.wrathEnd, 'completed');
  assertSnapshotContinuation(simulation, 10);
});

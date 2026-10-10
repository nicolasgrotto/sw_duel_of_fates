import { it } from 'node:test';
import assert from 'node:assert/strict';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { createSimulation, spawnFighter } from './helpers.js';

for (const source of ['blade', 'power', 'periodic']) {
  it(`${source} damage interrupts healing and resets the manual evade streak`, () => {
    const attacker = spawnFighter(400);
    const defender = spawnFighter(460, -1);
    const { combat } = createSimulation([attacker, defender], { powers: true });
    defender.combat.healTime = 2;
    defender.combat.freezeTime = 1;
    defender.combat.evadeStreak = 3;
    const before = defender.health;
    if (source === 'blade') {
      combat.applyHit({ attacker, defender, attack: attacker.moves.light, attackType: 'light' });
    } else if (source === 'power') {
      combat.dealPowerDamage(attacker, defender, powersConfig.powers.push, 2, CombatEvent.POWER_HIT);
    } else {
      combat.applyStatusDamage(defender, attacker, 2);
    }
    assert.ok(defender.health < before);
    assert.equal(defender.combat.healTime, 0);
    assert.equal(defender.combat.freezeTime, 0);
    assert.equal(defender.combat.evadeStreak, 0);
  });

  it(`${source} damage produces one knockout with damage capped at remaining health`, () => {
    const attacker = spawnFighter(400);
    const defender = spawnFighter(460, -1);
    const { combat } = createSimulation([attacker, defender]);
    defender.health = 1;
    combat.applyDamage({ attacker, defender, attack: attacker.moves.light, attackType: 'light' }, 100, source);
    assert.equal(defender.state, FighterState.DEAD);
    assert.equal(combat.events.filter((event) => event.type === CombatEvent.DEATH).length, 1);
    assert.equal(combat.events.at(-1).damage, 1);
  });
}

it('fully absorbed damage preserves healing and the manual streak', () => {
  const attacker = spawnFighter(400);
  const defender = spawnFighter(460, -1);
  const { combat } = createSimulation([attacker, defender]);
  defender.combat.healTime = 2;
  defender.combat.evadeStreak = 3;
  combat.dealPowerDamage(attacker, defender, powersConfig.powers.push, 0, CombatEvent.POWER_BLOCKED);
  combat.applyStatusDamage(defender, attacker, 0);
  assert.equal(defender.combat.healTime, 2);
  assert.equal(defender.combat.evadeStreak, 3);
});

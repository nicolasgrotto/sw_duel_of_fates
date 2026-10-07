import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { STEP, createSimulation, spawnFighter } from './helpers.js';

function setup(distance = 90, characterId = 'guardian') {
  const attacker = spawnFighter(500, 1, characterId);
  const defender = spawnFighter(500 + distance, -1);
  const simulation = createSimulation([attacker, defender]);
  function step(intent = {}) {
    Object.assign(attacker.intent, intent);
    simulation.step(STEP);
    attacker.clearIntent();
  }
  return { attacker, defender, simulation, step };
}

function enterRecovery(duel) {
  const end = duel.attacker.combat.attack.startup + duel.attacker.combat.attack.active;
  while (duel.attacker.stateTime + STEP < end) {
    duel.step();
  }
  duel.step();
}

describe('attack chains', () => {
  it('chains the confirmed first light into the second and spends stamina again', () => {
    const duel = setup();
    duel.step({ lightAttack: true });
    enterRecovery(duel);
    assert.equal(duel.attacker.combat.attackConnected, true);
    const stamina = duel.attacker.stamina;
    duel.step({ lightAttack: true });
    assert.equal(duel.attacker.combat.attackType, 'light2');
    assert.equal(duel.attacker.stateTime, 0);
    assert.equal(duel.attacker.combat.hasHit, false);
    assert.ok(duel.attacker.stamina < stamina);
    assert.equal(duel.simulation.events[0].type, 'attackStart');
  });

  it('allows a blocked light to chain but does not open the route on a whiff', () => {
    const blocked = setup();
    blocked.defender.intent.block = true;
    blocked.step({ lightAttack: true });
    enterRecovery(blocked);
    blocked.step({ lightAttack: true });
    assert.equal(blocked.attacker.combat.attackType, 'light2');
    const whiff = setup(400);
    whiff.step({ lightAttack: true });
    enterRecovery(whiff);
    whiff.step({ lightAttack: true });
    assert.equal(whiff.attacker.combat.attackType, 'light');
  });

  it('refuses a chain without stamina while keeping the current recovery', () => {
    const duel = setup();
    duel.step({ lightAttack: true });
    enterRecovery(duel);
    duel.attacker.stamina = 0;
    duel.step({ lightAttack: true });
    assert.equal(duel.attacker.combat.attackType, 'light');
    assert.equal(duel.simulation.events[0].type, 'actionRejected');
  });

  it('does not allow a parried attack to use its cancel routes', () => {
    const duel = setup();
    duel.defender.intent.block = true;
    duel.defender.intent.blockPressed = true;
    duel.step({ lightAttack: true });
    duel.defender.intent.blockPressed = false;
    for (let index = 0; index < 10; index += 1) duel.step();
    assert.equal(duel.attacker.state, 'STAGGERED');
    duel.step({ lightAttack: true });
    assert.equal(duel.attacker.combat.attack, null);
  });
});

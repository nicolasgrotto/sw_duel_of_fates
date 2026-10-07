import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getFrameAdvantage } from '../src/combat/frameData.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';

function resolveContact(defense, lead = 0) {
  const attacker = spawnFighter(500);
  const defender = spawnFighter(610, -1, 'shadow');
  const simulation = createSimulation([attacker, defender]);
  const attack = attacker.stats.attacks.heavy;
  attacker.intent.heavyAttack = true;
  simulation.step(STEP);
  attacker.clearIntent();
  const pressStep = Math.ceil((attack.startup - lead) / STEP);
  for (let step = 1; step < 60; step += 1) {
    defender.intent.block = defense === 'block' || (defense === 'parry' && step >= pressStep);
    defender.intent.blockPressed = defense === 'parry' && step === pressStep;
    simulation.step(STEP);
    const contact = simulation.events.find(event => event.defender === defender);
    if (contact) {
      return { attacker, defender, contact };
    }
  }
  throw new Error('Contact was not reached');
}

describe('frame advantage', () => {
  it('uses hitstun minus the actual remaining attack duration', () => {
    const { attacker, defender, contact } = resolveContact('none');
    assert.equal(contact.type, 'hit');
    assert.ok(Math.abs(getFrameAdvantage(attacker, defender) - (-0.04)) < STEP);
  });

  it('shows that the attacker recovers later when blocked', () => {
    const { attacker, defender, contact } = resolveContact('block');
    assert.equal(contact.type, 'block');
    assert.ok(Math.abs(getFrameAdvantage(attacker, defender) - (-0.30)) < STEP);
  });

  it('uses stagger instead of the cancelled attack on a parry', () => {
    const { attacker, defender, contact } = resolveContact('parry', 0.14);
    assert.equal(contact.type, 'parry');
    assert.equal(attacker.combat.attack, null);
    assert.equal(getFrameAdvantage(attacker, defender), -defender.stats.parry.stagger);
  });

  it('shows the larger disadvantage of a perfect parry', () => {
    const { attacker, defender, contact } = resolveContact('parry', 0.03);
    assert.equal(contact.type, 'perfectParry');
    assert.equal(getFrameAdvantage(attacker, defender), -defender.stats.parry.perfectStagger);
  });

  it('does not report an advantage when a fighter can no longer act', () => {
    const { attacker, defender } = resolveContact('none');
    defender.restartState('DEAD');
    assert.equal(getFrameAdvantage(attacker, defender), null);
  });
});

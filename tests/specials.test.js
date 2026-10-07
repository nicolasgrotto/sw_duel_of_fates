import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getAttackDuration } from '../src/combat/attackPhases.js';
import { CombatEvent, isContactEvent } from '../src/combat/combatEvents.js';
import { isPunishable } from '../src/ai/perception.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { STEP, createSimulation, repeat, spawnFighter } from './helpers.js';

function createDuel(leftId, rightId, distance = 110) {
  const left = spawnFighter(500, 1, leftId);
  const right = spawnFighter(500 + distance, -1, rightId);
  const simulation = createSimulation([left, right]);
  const events = [];
  const step = (leftIntent = {}, rightIntent = {}) => {
    Object.assign(left.intent, leftIntent);
    Object.assign(right.intent, rightIntent);
    simulation.step(STEP);
    events.push(...simulation.events.filter(isContactEvent));
    left.clearIntent();
    right.clearIntent();
  };
  return { left, right, events, step };
}

const types = (events) => events.map((event) => event.type);

describe('special: counter stance', () => {
  it('turns an attack that lands in the stance into a counter and a riposte', () => {
    const duel = createDuel('guardian', 'shadow');
    const riposte = duel.left.moves.riposte;

    duel.step({ special: true });
    assert.equal(duel.left.combat.attackType, 'special');
    duel.step({}, { lightAttack: true });
    repeat(Math.ceil(duel.right.moves.light.startup / STEP) + 1, () => duel.step());

    assert.deepEqual(types(duel.events), [CombatEvent.COUNTER]);
    assert.equal(duel.right.state, FighterState.STAGGERED);
    assert.equal(duel.left.combat.attackType, 'riposte');
    assert.equal(duel.left.health, duel.left.stats.maxHealth);

    repeat(Math.ceil((riposte.startup + riposte.active) / STEP), () => duel.step());
    assert.deepEqual(types(duel.events), [CombatEvent.COUNTER, CombatEvent.HIT]);
  });

  it('leaves the fighter open in recovery when nothing comes', () => {
    const duel = createDuel('guardian', 'shadow', 400);
    const stance = duel.left.moves.special;

    duel.step({ special: true });
    repeat(Math.ceil(stance.startup / STEP) + 1, () => duel.step());

    assert.equal(isPunishable(duel.left), true);
    repeat(Math.ceil(getAttackDuration(stance) / STEP), () => duel.step());
    assert.equal(duel.left.state, FighterState.IDLE);
  });
});

describe('special: armored strike', () => {
  it('takes the hit without being interrupted and still lands the strike', () => {
    const duel = createDuel('guardian', 'shadow', 130);
    const { left, right } = duel;
    const light = left.moves.light;

    duel.step({}, { special: true });
    duel.step({ lightAttack: true });
    repeat(Math.ceil(light.startup / STEP) + 1, () => duel.step());

    assert.equal(right.health, right.stats.maxHealth - light.damage);
    assert.equal(right.combat.attackType, 'special');
    assert.ok(duel.events[0].armored);

    repeat(Math.ceil(getAttackDuration(right.moves.special) / STEP), () => duel.step());
    assert.ok(left.health < left.stats.maxHealth);
  });
});

describe('character traits', () => {
  it('makes the guardian pay less stamina to block', () => {
    const duel = createDuel('guardian', 'shadow');
    const heavy = duel.right.moves.heavy;

    duel.step({ block: true }, { heavyAttack: true });
    repeat(Math.ceil(heavy.startup / STEP) + 1, () => duel.step({ block: true }));

    assert.deepEqual(types(duel.events), [CombatEvent.BLOCK]);
    const spent = duel.left.stats.maxStamina - duel.left.stamina;
    assert.ok(Math.abs(spent - heavy.blockStaminaCost * duel.left.stats.blockStaminaScale) < 1e-9);
  });

  it('gives stamina back to the shadow when a strike connects', () => {
    const duel = createDuel('shadow', 'guardian');
    const light = duel.left.moves.light;

    duel.step({ lightAttack: true });
    repeat(Math.ceil(light.startup / STEP) + 1, () => duel.step());

    assert.deepEqual(types(duel.events), [CombatEvent.HIT]);
    assert.ok(Math.abs(duel.left.stamina - (duel.left.stats.maxStamina - light.staminaCost + duel.left.stats.staminaOnHit)) < 1e-9);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getAttackDuration } from '../src/combat/attackPhases.js';
import { CombatEvent, isContactEvent } from '../src/combat/combatEvents.js';
import { isPunishable } from '../src/ai/perception.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { STEP, arena, createSimulation, repeat, spawnFighter } from './helpers.js';

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

describe('new characters', () => {
  it('lets the bastion walk while blocking and keeps him in place on a block', () => {
    const duel = createDuel('bastion', 'shadow', 300);
    const { left } = duel;

    duel.step({ block: true });
    repeat(20, () => duel.step({ block: true, moveX: 1 }));
    assert.equal(left.state, FighterState.BLOCKING);
    assert.ok(left.x > 500);

    const blocking = createDuel('bastion', 'shadow');
    const heavy = blocking.right.moves.heavy;
    blocking.step({ block: true }, { heavyAttack: true });
    repeat(Math.ceil(heavy.startup / STEP) + 1, () => blocking.step({ block: true }));
    assert.deepEqual(types(blocking.events), [CombatEvent.BLOCK]);
    assert.equal(blocking.left.vx, 0);
  });

  it('dashes the wasp through the opponent to the other side', () => {
    const duel = createDuel('wasp', 'guardian', 120);
    const { left, right } = duel;
    const dash = left.moves.special.dash;

    duel.step({ special: true });
    assert.equal(left.state, FighterState.DODGING);
    repeat(Math.ceil(dash.duration / STEP) + 2, () => duel.step());

    assert.ok(left.x > right.x);
    assert.deepEqual(types(duel.events), []);
  });

  it('chains five light strikes for the wasp', () => {
    const duel = createDuel('wasp', 'guardian', 80);
    const { left, right } = duel;

    duel.step({ lightAttack: true });
    for (let step = 0; step < 200 && left.combat.attackType !== 'light5'; step += 1) {
      duel.step({ lightAttack: left.combat.attackConnected });
    }

    assert.equal(left.combat.attackType, 'light5');
    assert.ok(right.health < right.stats.maxHealth);
  });

  it('turns a strike into a perfect parry for the mirror waiting stance', () => {
    const duel = createDuel('mirror', 'shadow');
    const { left, right } = duel;

    duel.step({ special: true });
    duel.step({}, { heavyAttack: true });
    repeat(Math.ceil(right.moves.heavy.startup / STEP) + 1, () => duel.step());

    assert.deepEqual(types(duel.events), [CombatEvent.PERFECT_PARRY]);
    assert.equal(right.state, FighterState.STAGGERED);
    assert.equal(left.combat.attackType, 'riposte');
  });
});

describe('second roster', () => {
  it('holds the forge strike while the button is held and releases a charged level 3 that breaks the guard', () => {
    const duel = createDuel('forge', 'guardian');
    const { left, right } = duel;
    const special = left.moves.special;
    const holdTime = special.charge.levelTime * (special.charge.levels - 1);

    duel.step({ special: true, specialHeld: true }, { block: true });
    repeat(Math.ceil((special.startup * special.charge.holdAt + holdTime) / STEP) + 2, () => duel.step({ specialHeld: true }, { block: true }));
    assert.ok(left.combat.chargeTime >= holdTime - 1e-9);
    assert.equal(left.state, FighterState.HEAVY_ATTACK);

    repeat(Math.ceil((special.startup + special.active) / STEP), () => duel.step({}, { block: true }));
    assert.deepEqual(types(duel.events), [CombatEvent.GUARD_BREAK]);
    assert.equal(right.state, FighterState.STUNNED);
  });

  it('releases an uncharged forge strike right away when the button is tapped', () => {
    const duel = createDuel('forge', 'guardian');
    const special = duel.left.moves.special;

    duel.step({ special: true });
    repeat(Math.ceil((special.startup + special.active) / STEP), () => duel.step());

    assert.equal(duel.left.combat.chargeTime, 0);
    assert.equal(duel.right.health, duel.right.stats.maxHealth - special.damage);
  });

  it('deals more damage with the tip of the haste blade than up close', () => {
    const far = createDuel('haste', 'guardian', 190);
    const close = createDuel('haste', 'guardian', 60);
    const light = far.left.moves.light;

    for (const duel of [far, close]) {
      duel.step({ lightAttack: true });
      repeat(Math.ceil((light.startup + light.active) / STEP), () => duel.step());
    }

    const farDamage = far.right.stats.maxHealth - far.right.health;
    const closeDamage = close.right.stats.maxHealth - close.right.health;
    assert.ok(Math.abs(farDamage - light.damage * light.sweetSpot.tipScale) < 1e-9);
    assert.ok(Math.abs(closeDamage - light.damage * light.sweetSpot.innerScale) < 1e-9);
  });

  it('answers with the ember counter strike instead of a riposte', () => {
    const duel = createDuel('ember', 'shadow');

    duel.step({ special: true });
    duel.step({}, { lightAttack: true });
    repeat(Math.ceil(duel.right.moves.light.startup / STEP) + 1, () => duel.step());

    assert.deepEqual(types(duel.events), [CombatEvent.COUNTER]);
    assert.equal(duel.left.combat.attackType, 'counterStrike');
  });
});

describe('heron and echo', () => {
  it('lets the heron jump off a wall once until it touches the other wall or the floor', () => {
    const duel = createDuel('heron', 'guardian', 400);
    const { left } = duel;
    left.x = arenaLeftFor(left);

    duel.step({ jump: true });
    repeat(4, () => duel.step());
    left.x = arenaLeftFor(left);
    duel.step({ jump: true });
    assert.ok(left.vx > 0);
    assert.equal(left.combat.wallJumpSide, -1);

    const vy = left.vy;
    left.x = arenaLeftFor(left);
    duel.step({ jump: true });
    assert.ok(left.vy >= vy);
  });

  it('dives down with the heavy air attack', () => {
    const duel = createDuel('heron', 'guardian', 400);
    const { left } = duel;
    const dive = left.moves.airHeavy;

    duel.step({ jump: true });
    repeat(6, () => duel.step());
    duel.step({ heavyAttack: true });
    assert.equal(left.combat.attackType, 'airHeavy');
    repeat(Math.ceil(dive.startup / STEP) + 1, () => duel.step());

    assert.ok(left.vy > 0);
  });

  it('leaps over the opponent with the heron special', () => {
    const duel = createDuel('heron', 'guardian', 90);
    const { left, right } = duel;

    duel.step({ special: true });
    assert.equal(left.state, FighterState.JUMPING);
    repeat(60, () => duel.step());

    assert.ok(left.x > right.x);
  });

  it('cancels the echo heavy startup with a feint that costs stamina', () => {
    const duel = createDuel('echo', 'guardian', 400);
    const { left } = duel;
    const heavy = left.moves.heavy;

    duel.step({ heavyAttack: true });
    repeat(Math.floor(heavy.startup / STEP / 2), () => duel.step());
    const stamina = left.stamina;
    duel.step({ block: true, blockPressed: true });

    assert.equal(left.combat.attack, null);
    assert.notEqual(left.state, FighterState.HEAVY_ATTACK);
    assert.ok(Math.abs(stamina - left.stamina - left.stats.feint.staminaCost) < 1e-9);
  });

  it('does not let other characters feint', () => {
    const duel = createDuel('guardian', 'shadow', 400);
    const heavy = duel.left.moves.heavy;

    duel.step({ heavyAttack: true });
    repeat(Math.floor(heavy.startup / STEP / 2), () => duel.step());
    duel.step({ block: true, blockPressed: true });

    assert.equal(duel.left.state, FighterState.HEAVY_ATTACK);
  });

  it('steps the echo in the held direction', () => {
    const duel = createDuel('echo', 'guardian', 400);

    duel.step({ special: true, moveX: 1 });
    assert.equal(duel.left.combat.dodgeDirection, 1);
  });
});

function arenaLeftFor(fighter) {
  return arena.left + fighter.width / 2;
}

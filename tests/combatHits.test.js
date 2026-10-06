import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getAttackDuration } from '../src/combat/attackPhases.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { boxesOverlap, createBox, getAttackHitbox, getHurtbox } from '../src/combat/hitboxes.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { STEP, arena, createSimulation, repeat, spawnFighter } from './helpers.js';

const CLOSE_DISTANCE = 110;

function createDuel(distance = CLOSE_DISTANCE) {
  const player = spawnFighter(500, 1);
  const opponent = spawnFighter(500 + distance, -1, 'shadow');
  const simulation = createSimulation([player, opponent]);
  const events = [];

  const step = (playerIntent = {}, opponentIntent = {}) => {
    Object.assign(player.intent, playerIntent);
    Object.assign(opponent.intent, opponentIntent);
    simulation.step(STEP);
    events.push(...simulation.events);
    player.clearIntent();
    opponent.clearIntent();
  };

  return { player, opponent, simulation, events, step };
}

function runAttack(duel, attackType, opponentIntent = {}) {
  const attack = duel.player.stats.attacks[attackType];
  duel.step({ [`${attackType}Attack`]: true }, opponentIntent);
  repeat(Math.ceil(getAttackDuration(attack) / STEP), () => duel.step({}, opponentIntent));
}

function eventTypes(events) {
  return events.map((event) => event.type);
}

describe('hitboxes', () => {
  it('places the attack hitbox in front of the attacker', () => {
    const right = spawnFighter(500, 1);
    const left = spawnFighter(500, -1);
    const attack = right.stats.attacks.light;

    const rightBox = getAttackHitbox(right, attack, createBox());
    const leftBox = getAttackHitbox(left, attack, createBox());

    assert.equal(rightBox.left, 500);
    assert.ok(rightBox.right > 500);
    assert.equal(leftBox.right, 500);
    assert.ok(leftBox.left < 500);
  });

  it('detects overlap between boxes', () => {
    const fighter = spawnFighter(500);
    const hurtbox = getHurtbox(fighter, createBox());

    assert.equal(boxesOverlap(hurtbox, { left: 510, right: 600, top: 500, bottom: 550 }), true);
    assert.equal(boxesOverlap(hurtbox, { left: 600, right: 700, top: 500, bottom: 550 }), false);
  });
});

describe('CombatSystem hits', () => {
  it('damages, pushes and stuns the defender when the attack connects', () => {
    const duel = createDuel();
    const { opponent, player } = duel;
    const attack = player.stats.attacks.light;

    duel.step({ lightAttack: true });
    repeat(Math.ceil(attack.startup / STEP) + 1, () => duel.step());

    assert.equal(opponent.health, opponent.stats.maxHealth - attack.damage);
    assert.equal(opponent.state, FighterState.HIT);
    assert.ok(opponent.vx > 0);
    assert.deepEqual(eventTypes(duel.events), [CombatEvent.HIT]);
  });

  it('hits only once per attack', () => {
    const duel = createDuel();

    runAttack(duel, 'light');

    assert.equal(duel.opponent.health, duel.opponent.stats.maxHealth - duel.player.stats.attacks.light.damage);
  });

  it('misses when the defender is out of reach', () => {
    const duel = createDuel(400);

    runAttack(duel, 'heavy');

    assert.equal(duel.opponent.health, duel.opponent.stats.maxHealth);
    assert.deepEqual(duel.events, []);
  });

  it('interrupts the attack of the defender', () => {
    const duel = createDuel();
    duel.step({}, { heavyAttack: true });
    duel.step({ lightAttack: true });

    repeat(Math.ceil(duel.player.stats.attacks.light.startup / STEP) + 1, () => duel.step());

    assert.equal(duel.opponent.state, FighterState.HIT);
    assert.equal(duel.opponent.combat.attack, null);
  });

  it('lets both fighters hit each other on the same frame', () => {
    const duel = createDuel();
    const { player, opponent } = duel;
    player.stats = { ...player.stats, attacks: { ...player.stats.attacks, light: opponent.stats.attacks.light } };

    duel.step({ lightAttack: true }, { lightAttack: true });
    repeat(20, () => duel.step());

    assert.ok(player.health < player.stats.maxHealth);
    assert.ok(opponent.health < opponent.stats.maxHealth);
  });

  it('blocks a frontal attack: no damage, stamina cost and blockstun', () => {
    const duel = createDuel();
    const { opponent, player } = duel;
    const attack = player.stats.attacks.light;

    runAttack(duel, 'light', { block: true });

    assert.equal(opponent.health, opponent.stats.maxHealth);
    assert.ok(opponent.stamina < opponent.stats.maxStamina);
    assert.equal(opponent.state, FighterState.BLOCKING);
    assert.deepEqual(eventTypes(duel.events), [CombatEvent.BLOCK]);
    assert.ok(attack.blockStaminaCost > 0);
  });

  it('cannot block an attack from behind', () => {
    const duel = createDuel();
    duel.step({}, { block: true });
    duel.opponent.facing = 1;

    runAttack(duel, 'light', { block: true });

    assert.ok(duel.opponent.health < duel.opponent.stats.maxHealth);
  });

  it('breaks the guard when the defender has no stamina to block', () => {
    const duel = createDuel();
    duel.step({}, { block: true });
    duel.opponent.stamina = 1;

    runAttack(duel, 'heavy', { block: true });

    assert.equal(duel.opponent.stamina, 0);
    assert.equal(duel.opponent.health, duel.opponent.stats.maxHealth);
    assert.ok(eventTypes(duel.events).includes(CombatEvent.GUARD_BREAK));
  });

  it('keeps the guard broken fighter stunned for the configured time', () => {
    const duel = createDuel();
    duel.step({}, { block: true });
    duel.opponent.stamina = 1;
    duel.step({ heavyAttack: true }, { block: true });

    repeat(Math.ceil(duel.player.stats.attacks.heavy.startup / STEP) + 1, () => duel.step({}, { block: true }));

    assert.equal(duel.opponent.state, FighterState.STUNNED);
  });

  it('avoids the hit while the dodge is invulnerable', () => {
    const duel = createDuel(70);
    const attack = duel.player.stats.attacks.light;
    duel.step({ lightAttack: true });
    repeat(Math.ceil(attack.startup / STEP) - 2, () => duel.step());

    duel.step({}, { dodge: true, moveX: -1 });
    repeat(4, () => duel.step());

    assert.equal(duel.opponent.health, duel.opponent.stats.maxHealth);
  });

  it('kills the defender when the health reaches zero', () => {
    const duel = createDuel();
    duel.opponent.health = 1;

    runAttack(duel, 'light');

    assert.equal(duel.opponent.health, 0);
    assert.equal(duel.opponent.state, FighterState.DEAD);
    assert.deepEqual(eventTypes(duel.events), [CombatEvent.HIT, CombatEvent.DEATH]);
  });

  it('falls backward when there is room and forward when a wall is behind', () => {
    const open = createDuel();
    open.opponent.health = 1;
    runAttack(open, 'light');
    assert.equal(open.opponent.combat.fallDirection, 1);

    const cornered = createDuel();
    cornered.player.x = arena.right - 200;
    cornered.opponent.x = arena.right - 90;
    cornered.opponent.health = 1;
    runAttack(cornered, 'light');
    assert.equal(cornered.opponent.combat.fallDirection, -1);
  });

  it('ignores dead fighters', () => {
    const duel = createDuel();
    duel.opponent.health = 1;
    runAttack(duel, 'light');

    runAttack(duel, 'light');

    assert.equal(duel.events.length, 2);
    assert.equal(duel.opponent.state, FighterState.DEAD);
  });

  it('reports the contact point between the boxes', () => {
    const duel = createDuel();

    runAttack(duel, 'light');
    const [hit] = duel.events;

    assert.ok(hit.x > duel.player.x && hit.x < duel.opponent.x + duel.opponent.width);
    assert.equal(hit.attackType, 'light');
  });
});

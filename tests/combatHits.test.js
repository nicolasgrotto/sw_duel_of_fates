import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getAttackDuration } from '../src/combat/attackPhases.js';
import { CombatEvent, isContactEvent } from '../src/combat/combatEvents.js';
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
    events.push(...simulation.events.filter(isContactEvent));
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

  it('clashes when both attacks are active and the hitboxes touch', () => {
    const duel = createDuel();
    const { player, opponent } = duel;
    player.stats = { ...player.stats, attacks: { ...player.stats.attacks, light: opponent.stats.attacks.light } };

    duel.step({ lightAttack: true }, { lightAttack: true });
    repeat(20, () => duel.step());

    assert.equal(player.health, player.stats.maxHealth);
    assert.equal(opponent.health, opponent.stats.maxHealth);
    assert.deepEqual(eventTypes(duel.events), [CombatEvent.CLASH]);
  });

  it('pushes both fighters apart and cancels both attacks on a clash', () => {
    const duel = createDuel();
    const { player, opponent } = duel;
    player.stats = { ...player.stats, attacks: { ...player.stats.attacks, light: opponent.stats.attacks.light } };
    duel.step({ lightAttack: true }, { lightAttack: true });

    while (duel.events.length === 0) {
      duel.step();
    }

    assert.equal(player.state, FighterState.HIT);
    assert.equal(opponent.state, FighterState.HIT);
    assert.equal(player.combat.attack, null);
    assert.equal(opponent.combat.attack, null);
    assert.ok(player.vx < 0);
    assert.ok(opponent.vx > 0);
  });

  it('lets both fighters hit each other when the hitboxes do not touch', () => {
    const duel = createDuel(140);
    const { player, opponent } = duel;
    const shortReach = { ...opponent.stats.attacks.light, hitbox: { reach: 100, top: 0.5, bottom: 0.3 } };
    const highReach = { ...opponent.stats.attacks.light, hitbox: { reach: 100, top: 0.95, bottom: 0.75 } };
    player.stats = { ...player.stats, attacks: { ...player.stats.attacks, light: shortReach } };
    opponent.stats = { ...opponent.stats, attacks: { ...opponent.stats.attacks, light: highReach } };

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

function stepsUntilActive(attack) {
  return Math.ceil(attack.startup / STEP - 1e-9);
}

function parryHeavy(duel, leadSeconds, { hold = true, extraSteps = 0 } = {}) {
  const attack = duel.opponent.stats.attacks.heavy;
  const contactStep = stepsUntilActive(attack);
  const pressStep = contactStep - Math.round(leadSeconds / STEP);

  duel.step({}, { heavyAttack: true });
  for (let step = 1; step <= contactStep + extraSteps; step += 1) {
    const pressed = step === pressStep;
    duel.step({ block: pressed || (hold && step > pressStep), blockPressed: pressed });
  }
}

describe('parry', () => {
  it('parries an attack that arrives inside the window', () => {
    const duel = createDuel();
    const { player, opponent } = duel;

    parryHeavy(duel, 0.14);

    assert.deepEqual(eventTypes(duel.events), [CombatEvent.PARRY]);
    assert.equal(player.health, player.stats.maxHealth);
    assert.equal(player.stamina, player.stats.maxStamina);
    assert.equal(player.state, FighterState.IDLE);
    assert.equal(opponent.state, FighterState.STAGGERED);
    assert.equal(opponent.combat.stunDuration, player.stats.parry.stagger);
    assert.equal(opponent.combat.attack, null);
  });

  it('gives a perfect parry at the start of the window', () => {
    const duel = createDuel();
    const { player, opponent } = duel;
    const heavy = opponent.stats.attacks.heavy;
    const { parry } = player.stats;
    player.stamina = 50;

    parryHeavy(duel, 0.03);

    assert.deepEqual(eventTypes(duel.events), [CombatEvent.PERFECT_PARRY]);
    assert.equal(opponent.combat.stunDuration, parry.perfectStagger);
    assert.ok(player.stamina >= 50 + parry.perfectStaminaGain);
    const expectedStamina = opponent.stats.maxStamina - heavy.staminaCost - heavy.blockStaminaCost * parry.perfectStaminaDamageMultiplier;
    assert.ok(Math.abs(opponent.stamina - expectedStamina) < 1e-9);
  });

  it('falls back to a normal block when the window is over', () => {
    const duel = createDuel();

    parryHeavy(duel, 0.3);

    assert.deepEqual(eventTypes(duel.events), [CombatEvent.BLOCK]);
    assert.ok(duel.player.combat.parryLockout > 0);
  });

  it('does not open a window when the block is only held', () => {
    const duel = createDuel();
    const attack = duel.opponent.stats.attacks.heavy;

    duel.step({ block: true }, { heavyAttack: true });
    repeat(stepsUntilActive(attack), () => duel.step({ block: true }));

    assert.deepEqual(eventTypes(duel.events), [CombatEvent.BLOCK]);
  });

  it('keeps a tapped guard up until the window ends, then lets go', () => {
    const duel = createDuel(400);
    const { player } = duel;

    duel.step({ block: true, blockPressed: true });
    repeat(Math.floor(player.stats.parry.window / STEP) - 2, () => duel.step());
    assert.equal(player.state, FighterState.BLOCKING);

    repeat(3, () => duel.step());
    assert.equal(player.state, FighterState.IDLE);
    assert.equal(player.combat.parryArmed, false);
  });

  it('locks the window out for a moment after a missed parry', () => {
    const duel = createDuel(400);
    const { player } = duel;

    duel.step({ block: true, blockPressed: true });
    repeat(Math.ceil(player.stats.parry.window / STEP) + 2, () => duel.step());
    duel.step({ block: true, blockPressed: true });

    assert.equal(player.state, FighterState.BLOCKING);
    assert.equal(player.combat.parryArmed, false);

    repeat(Math.ceil(player.stats.parry.lockout / STEP), () => duel.step());
    duel.step({ block: true, blockPressed: true });
    assert.equal(player.combat.parryArmed, true);
  });

  it('turns the next light attack into a riposte while the attacker is staggered', () => {
    const duel = createDuel();
    const { player, opponent } = duel;
    const riposte = player.stats.attacks.riposte;

    parryHeavy(duel, 0.14, { hold: false });
    duel.step({ lightAttack: true });

    assert.equal(player.combat.attackType, 'riposte');
    repeat(Math.ceil((riposte.startup + riposte.active) / STEP), () => duel.step());

    assert.equal(opponent.health, opponent.stats.maxHealth - riposte.damage);
    assert.deepEqual(eventTypes(duel.events), [CombatEvent.PARRY, CombatEvent.HIT]);
  });
});

const SHOVE_DISTANCE = 90;

function runShove(duel, opponentIntent = {}) {
  const shove = duel.player.stats.attacks.shove;
  duel.step({ block: true, lightAttack: true }, opponentIntent);
  repeat(Math.ceil((shove.startup + shove.active) / STEP) + 1, () => duel.step({}, opponentIntent));
}

describe('shove', () => {
  it('breaks through a held block and staggers without damage', () => {
    const duel = createDuel(SHOVE_DISTANCE);
    const { opponent, player } = duel;
    const shove = player.stats.attacks.shove;

    runShove(duel, { block: true });

    assert.deepEqual(eventTypes(duel.events), [CombatEvent.SHOVE]);
    assert.equal(opponent.state, FighterState.STAGGERED);
    assert.equal(opponent.health, opponent.stats.maxHealth);
    assert.ok(opponent.stamina <= opponent.stats.maxStamina - shove.staminaDamage + 1);
    assert.ok(opponent.vx > 0);
  });

  it('cannot be parried', () => {
    const duel = createDuel(SHOVE_DISTANCE);
    const shove = duel.player.stats.attacks.shove;
    const pressStep = Math.ceil(shove.startup / STEP) - 3;

    duel.step({ block: true, lightAttack: true });
    for (let step = 1; step <= Math.ceil((shove.startup + shove.active) / STEP); step += 1) {
      duel.step({}, { block: step >= pressStep, blockPressed: step === pressStep });
    }

    assert.deepEqual(eventTypes(duel.events), [CombatEvent.SHOVE]);
    assert.equal(duel.opponent.state, FighterState.STAGGERED);
  });

  it('can come out of a held block', () => {
    const duel = createDuel(400);
    const { player } = duel;

    duel.step({ block: true });
    assert.equal(player.state, FighterState.BLOCKING);

    duel.step({ block: true, lightAttack: true });
    assert.equal(player.state, FighterState.ATTACKING);
    assert.equal(player.combat.attackType, 'shove');
  });

  it('loses to a faster attack', () => {
    const duel = createDuel(SHOVE_DISTANCE);

    runShove(duel, { lightAttack: true });

    assert.equal(duel.events[0].type, CombatEvent.HIT);
    assert.equal(duel.events[0].defender, duel.player);
    assert.equal(duel.opponent.state === FighterState.STAGGERED, false);
  });
});

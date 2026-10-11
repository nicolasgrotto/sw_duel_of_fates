import { it } from 'node:test';
import assert from 'node:assert/strict';
import { characters } from '../src/characters/characterData.js';
import { createFighterFromCharacter } from '../src/characters/characterFactory.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { createSimulation, spawnFighter, arena } from './helpers.js';
import { STEP } from './helpers.js';
import { combatRulesConfig } from '../src/config/combatRulesConfig.js';
import { assertSnapshotContinuation } from './consequenceHelpers.js';
import { PlayerController } from '../src/controllers/PlayerController.js';
import { Action } from '../src/config/controlsConfig.js';

const lockTestNumbers = Object.freeze({ cooldown: 4, distance: 70, minPressInterval: 1 / 12,
  winMargin: 4, maxDuration: 2, timeoutMargin: 2, damage: 8, staminaLoss: 35,
  separation: 420, loserStagger: 0.35, winnerRecovery: 0.25, lockReleaseGuard: 0.15, holdRate: 6 });
Object.assign(combatRulesConfig.bladeLock, lockTestNumbers);

function startLock(rules = { bladeLock: true, exhaustion: true }) {
  const fixture = setup(rules);
  fixture.simulation.combat.tryClash(...fixture.fighters);
  fixture.fighters.forEach((fighter) => fighter.clearIntent());
  return fixture;
}

function pressSteps(simulation, count, sides = [0]) {
  for (let step = 0; step < count; step += 1) {
    simulation.fighters.forEach((fighter, index) => {
      fighter.clearIntent();
      fighter.intent.lightAttack = sides.includes(index) && step % 6 === 0;
    });
    simulation.step(STEP);
  }
}

function setup(rules = { bladeLock: true }) {
  const fighters = [spawnFighter(500, 1), spawnFighter(580, -1)];
  const simulation = createSimulation(fighters, rules);
  fighters.forEach((fighter) => {
    fighter.combat.attack = fighter.moves.heavy;
    fighter.combat.attackType = 'heavy';
    fighter.restartState(FighterState.HEAVY_ATTACK);
    fighter.stateTime = fighter.moves.heavy.startup;
  });
  return { fighters, simulation };
}

it('resolves blade lock eligibility in move data without inheriting it into techniques', () => {
  for (const character of Object.values(characters)) {
    const fighter = createFighterFromCharacter(character, { x: 500, y: arena.floorY, facing: 1 });
    for (const [id, move] of Object.entries(fighter.moves)) {
      assert.equal(move.bladeLock === true, ['heavy', 'forwardHeavy'].includes(id), `${character.id}/${id}`);
    }
  }
  const character = { ...characters.guardian, moves: { ...characters.guardian.moves,
    heavy: { ...characters.guardian.moves.heavy, bladeLock: false },
    special: { ...characters.guardian.moves.special, bladeLock: true } } };
  const fighter = createFighterFromCharacter(character, { x: 500, y: arena.floorY, facing: 1 });
  assert.equal(fighter.moves.heavy.bladeLock, false);
  assert.equal(fighter.moves.special.bladeLock, true);
});

it('enters symmetrically only on overlapping active eligible blades', () => {
  const { fighters: [a, b], simulation } = setup();
  simulation.combat.tryClash(a, b);
  assert.equal(a.state, FighterState.BLADE_LOCK);
  assert.equal(b.state, FighterState.BLADE_LOCK);
  assert.equal(a.combat.lockOpponent, 1);
  assert.equal(b.combat.lockOpponent, 0);
  assert.equal(b.x - a.x, 70);
  assert.equal(a.vx, 0);
  assert.equal(b.vx, 0);
  assert.equal(a.facing, 1);
  assert.equal(b.facing, -1);
  assert.equal(simulation.events.some((event) => event.type === CombatEvent.CLASH), false);
});

it('keeps the short clash for every excluded entry condition', () => {
  const exclusions = [
    ({ simulation }) => { simulation.combat.rules.bladeLock = false; },
    ({ fighters }) => { fighters[0].grounded = false; },
    ({ fighters }) => { fighters[1].combat.attack = { ...fighters[1].moves.heavy, bladeLock: false }; },
    ({ fighters }) => { fighters[0].combat.lockCooldown = 0.01; },
    ({ fighters }) => { fighters[1].combat.chokeTime = 1; },
    ...['choke', 'storm', 'lightning'].map((effect) => ({ fighters }) => { fighters[0].combat.power = { effect }; }),
    ({ simulation }) => { Object.assign(simulation.projectiles.pool[0], { active: true, owner: 0 }); },
    ({ simulation }) => { Object.assign(simulation.projectiles.pool[0], { active: true, owner: 1 }); },
  ];
  for (const exclude of exclusions) {
    const fixture = setup();
    exclude(fixture);
    fixture.simulation.combat.tryClash(...fixture.fighters);
    assert.equal(fixture.fighters[0].state, FighterState.HIT);
    assert.equal(fixture.fighters[1].state, FighterState.HIT);
    assert.equal(fixture.simulation.events[0].type, CombatEvent.CLASH);
  }
});

it('does not start before active contact or with separated hitboxes', () => {
  for (const change of [(a) => { a.stateTime = 0; }, (a) => { a.x = 100; }]) {
    const { fighters: [a, b], simulation } = setup();
    change(a);
    simulation.combat.tryClash(a, b);
    assert.equal(a.combat.lockOpponent, -1);
    assert.equal(simulation.events.length, 0);
  }
});

it('places the pair inside either arena edge and clears round state', () => {
  for (const x of [arena.left + 23, arena.right - 103]) {
    const { fighters: [a, b], simulation } = setup();
    a.x = x;
    b.x = x + 80;
    simulation.combat.tryClash(a, b);
    assert.ok(a.left >= arena.left && b.right <= arena.right);
    for (const fighter of [a, b]) {
      fighter.resetForRound(500, 1);
      assert.equal(fighter.combat.lockOpponent, -1);
      assert.equal(fighter.combat.lockTime, 0);
      assert.equal(fighter.combat.lockPresses, 0);
      assert.equal(fighter.combat.lockCooldown, 0);
    }
  }
});

it('suspends actions, state time, movement, regeneration, status and cooldowns', () => {
  const { fighters, simulation } = startLock({ bladeLock: true, powers: true, exhaustion: true });
  fighters.forEach((fighter) => {
    fighter.health -= 20;
    fighter.stamina = 20;
    fighter.flowMeter = 30;
    Object.assign(fighter.combat, { focusTime: 1, healTime: 1, wrathTime: 1, freezeTime: 1, chokeTime: 1,
      healRate: 20, healCap: fighter.stats.maxHealth, powerCooldown: 1, absorbTime: 1,
      parryLockout: 1, riposteTime: 1, staminaRegenDelay: 1, exhausted: true, exhaustionTime: 0.5 });
  });
  const before = fighters.map((fighter) => ({ x: fighter.x, y: fighter.y, health: fighter.health,
    stamina: fighter.stamina, flow: fighter.flowMeter, combat: { ...fighter.combat } }));
  for (let step = 0; step < 30; step += 1) {
    fighters.forEach((fighter) => Object.assign(fighter.intent, { moveX: 1, jump: true, heavyAttack: true,
      block: true, blockPressed: true, dodge: true, special: true, power: true, powerHeld: true }));
    simulation.step(STEP);
  }
  fighters.forEach((fighter, index) => {
    assert.equal(fighter.x, before[index].x);
    assert.equal(fighter.y, before[index].y);
    assert.equal(fighter.vx, 0);
    assert.equal(fighter.stateTime, 0);
    assert.equal(fighter.health, before[index].health);
    assert.equal(fighter.stamina, before[index].stamina);
    assert.equal(fighter.flowMeter, before[index].flow);
    for (const field of ['focusTime', 'healTime', 'wrathTime', 'freezeTime', 'chokeTime', 'powerCooldown',
      'absorbTime', 'parryLockout', 'riposteTime', 'staminaRegenDelay', 'exhaustionTime']) {
      assert.equal(fighter.combat[field], before[index].combat[field], field);
    }
  });
});

it('counts edges with the frequency ceiling and never repeats a held intent', () => {
  const { fighters: [a, b], simulation } = startLock();
  for (let step = 0; step < 60; step += 1) {
    a.intent.lightAttack = true;
    b.intent.lightAttack = true;
    simulation.step(STEP);
  }
  assert.equal(a.combat.lockPresses, 1);
  assert.equal(b.combat.lockPresses, 1);
  const fast = startLock();
  for (let step = 0; step < 60; step += 1) {
    fast.fighters.forEach((fighter) => { fighter.intent.lightAttack = step % 2 === 0; });
    fast.simulation.step(STEP);
  }
  assert.equal(fast.fighters[0].combat.lockPresses, 10);
  assert.equal(fast.fighters[1].combat.lockPresses, 10);
  const capped = startLock();
  for (let step = 0; step < 60; step += 1) {
    capped.fighters.forEach((fighter) => { fighter.intent.lightAttack = step % 5 === 0; });
    capped.simulation.step(STEP);
  }
  assert.equal(capped.fighters[0].combat.lockPresses, 12);
  assert.equal(capped.fighters[1].combat.lockPresses, 12);
});

it('evaluates simultaneous edges before the margin, independent of fighter order', () => {
  const { fighters: [a, b], simulation } = startLock();
  a.combat.lockPresses = 3;
  a.intent.lightAttack = true;
  b.intent.lightAttack = true;
  simulation.step(STEP);
  assert.equal(a.state, FighterState.BLADE_LOCK);
  assert.equal(a.combat.lockPresses - b.combat.lockPresses, 3);
});

it('keeps elapsed time when the recorded dt changes out of existing slow motion', () => {
  const { fighters: [a], simulation } = startLock();
  for (let step = 0; step < 7; step += 1) simulation.step(STEP * 0.3);
  const elapsed = a.combat.lockTime;
  simulation.step(STEP);
  assert.equal(a.combat.lockTime, elapsed + STEP);
  assertSnapshotContinuation(simulation, 130);
});

it('resolves a victory once, with unscaled damage, stamina loss and exhaustion', () => {
  const { fighters: [a, b], simulation } = startLock();
  b.stamina = 30;
  Object.assign(a.combat, { wrathTime: 2, wrathDamageDealtScale: 2 });
  Object.assign(b.combat, { wrathTime: 2, wrathDamageTakenScale: 0.5 });
  const health = b.health;
  pressSteps(simulation, 19);
  assert.equal(b.health, health - 8);
  assert.equal(b.stamina, 0);
  assert.equal(b.combat.exhausted, true);
  assert.equal(b.combat.exhaustionCause, 'bladeLock');
  assert.equal(b.state, FighterState.STAGGERED);
  assert.equal(a.state, FighterState.HIT);
  assert.equal(a.vx, -420);
  assert.equal(b.vx, 420);
  assert.equal(a.combat.lockCooldown, 4);
  assert.equal(b.combat.lockCooldown, 4);
  pressSteps(simulation, 8, []);
  assert.equal(b.health, health - 8);
  assert.equal(a.combat.lockCooldown, b.combat.lockCooldown);
});

it('does not inherit exhaustion damage, wounds or blade power gains', () => {
  const { fighters: [a, b], simulation } = startLock({ bladeLock: true, exhaustion: true, wounds: true, powers: true });
  b.combat.exhausted = true;
  const health = b.health;
  const flow = [a.flowMeter, b.flowMeter];
  pressSteps(simulation, 19);
  assert.equal(b.health, health - 8);
  assert.equal(b.combat.wound, null);
  assert.deepEqual([a.flowMeter, b.flowMeter], flow);
});

it('uses the timeout margin and otherwise draws without damage or stamina loss', () => {
  for (const margin of [0, 1, 2, -2]) {
    const { fighters: [a, b], simulation } = startLock();
    a.combat.lockPresses = Math.max(0, margin);
    b.combat.lockPresses = Math.max(0, -margin);
    const health = [a.health, b.health];
    const stamina = [a.stamina, b.stamina];
    pressSteps(simulation, 120, []);
    assert.equal(a.combat.lockOpponent, -1);
    assert.equal(b.combat.lockOpponent, -1);
    if (Math.abs(margin) < 2) {
      assert.deepEqual([a.health, b.health], health);
      assert.deepEqual([a.stamina, b.stamina], stamina);
      assert.equal(a.vx, -simulation.combat.clash.pushback);
      assert.equal(b.vx, simulation.combat.clash.pushback);
    } else {
      const loser = margin > 0 ? b : a;
      assert.equal(loser.health, health[margin > 0 ? 1 : 0] - 8);
    }
  }
});

it('uses the normal knockout pipeline and cancels an external death without a result', () => {
  const lethal = startLock();
  lethal.fighters[1].health = 4;
  pressSteps(lethal.simulation, 19);
  assert.equal(lethal.fighters[1].state, FighterState.DEAD);
  assert.equal(lethal.simulation.events.filter((event) => event.type === CombatEvent.DEATH).length, 1);
  const cancelled = startLock();
  const health = cancelled.fighters[0].health;
  cancelled.fighters[1].restartState(FighterState.DEAD);
  cancelled.simulation.step(STEP);
  assert.equal(cancelled.fighters[0].state, FighterState.IDLE);
  assert.equal(cancelled.fighters[0].health, health);
  assert.equal(cancelled.fighters[0].combat.lockOpponent, -1);
  assert.equal(cancelled.fighters[1].combat.lockOpponent, -1);
});

it('enforces the cooldown and resets both sides after round or state changes', () => {
  const { fighters: [a, b], simulation } = startLock();
  pressSteps(simulation, 19);
  assert.equal(simulation.bladeLocks.canStart(a, b), false);
  pressSteps(simulation, 240, []);
  assert.equal(a.combat.lockCooldown, 0);
  assert.equal(b.combat.lockCooldown, 0);
  for (const fighter of [a, b]) fighter.combat.attack = fighter.moves.heavy;
  assert.equal(simulation.bladeLocks.tryStart(a, b), true);
  a.resetForRound(500, 1);
  simulation.step(STEP);
  assert.equal(b.state, FighterState.IDLE);
  simulation.bladeLocks.reset();
  for (const fighter of [a, b]) {
    assert.equal(fighter.combat.lockOpponent, -1);
    assert.equal(fighter.combat.lockCooldown, 0);
  }
});

it('replays snapshots before, during and after the dispute through the same result', () => {
  const before = setup();
  assertSnapshotContinuation(before.simulation, 25, (fighters, step) => {
    fighters[0].intent.lightAttack = step % 6 === 0;
  });
  const middle = startLock();
  pressSteps(middle.simulation, 10);
  assertSnapshotContinuation(middle.simulation, 40, (fighters, step) => {
    fighters[0].intent.lightAttack = step % 6 === 0;
  });
  const after = startLock();
  pressSteps(after.simulation, 19);
  assertSnapshotContinuation(after.simulation, 90);
});

it('prevents a guaranteed heavy follow-up for every archetype, orientation and arena edge', () => {
  for (const id of Object.keys(characters)) {
    for (const direction of [-1, 1]) {
      for (const location of ['center', 'wall']) {
        for (const forward of [false, true]) {
          const x = location === 'center' ? 600 : direction > 0 ? arena.right - 100 : arena.left + 100;
          const winner = spawnFighter(x, direction, id);
          const loser = spawnFighter(x + direction * 70, -direction, 'bastion');
          const simulation = createSimulation([winner, loser], { bladeLock: true });
          winner.combat.attack = winner.moves.heavy;
          loser.combat.attack = loser.moves.heavy;
          assert.equal(simulation.bladeLocks.tryStart(winner, loser), true);
          simulation.bladeLocks.finish(winner, loser, winner);
          const health = loser.health;
          let elapsed = 0;
          while (loser.state === FighterState.STAGGERED) {
            winner.clearIntent();
            winner.intent.heavyAttack = true;
            winner.intent.moveX = forward ? direction : 0;
            loser.clearIntent();
            simulation.step(STEP);
            elapsed += STEP;
            assert.equal(loser.health, health, `${id}/${direction}/${location}/${forward}: guaranteed heavy at ${elapsed}`);
            assert.equal(winner.combat.attack === null || winner.stateTime < winner.combat.attack.startup, true);
          }
          assert.ok(elapsed >= lockTestNumbers.loserStagger);
          assert.ok(Math.abs(winner.x - loser.x) > lockTestNumbers.distance);
          loser.intent.evade = true;
          winner.intent.heavyAttack = false;
          simulation.step(STEP);
          assert.equal(loser.state, FighterState.DODGING);
        }
      }
    }
  }
});

it('clears both buffers and discards attacking edges during the release guard', () => {
  const { fighters, simulation } = startLock();
  fighters.forEach((fighter) => {
    fighter.combat.bufferedAction = 'heavyAttack';
    fighter.combat.bufferTime = 0.15;
  });
  pressSteps(simulation, 19);
  for (const fighter of fighters) {
    assert.equal(fighter.combat.bufferedAction, null);
    assert.equal(fighter.combat.bufferTime, 0);
    assert.equal(fighter.combat.lockReleaseGuard, 0.15);
  }
  for (let step = 0; step < 9; step += 1) {
    fighters.forEach((fighter) => Object.assign(fighter.intent, { lightAttack: true, heavyAttack: true, special: true }));
    simulation.step(STEP);
    fighters.forEach((fighter) => assert.equal(fighter.combat.bufferedAction, null));
  }
  fighters.forEach((fighter) => {
    assert.equal(fighter.combat.lockReleaseGuard, 0);
    fighter.clearIntent();
  });
  pressSteps(simulation, 30, []);
  fighters.forEach((fighter) => assert.equal(fighter.combat.attack, null));
  fighters[0].intent.lightAttack = true;
  simulation.step(STEP);
  assert.equal(fighters[0].state, FighterState.ATTACKING);
});

it('does not turn a held human attack into an automatic strike after release', () => {
  const { fighters: [a, b], simulation } = startLock();
  let pressed = true;
  const controller = new PlayerController({ isDown: (action) => action === Action.LIGHT_ATTACK,
    wasPressed: (action) => pressed && action === Action.LIGHT_ATTACK });
  for (let step = 0; step < 150; step += 1) {
    controller.updateIntent(a.intent, STEP);
    b.clearIntent();
    simulation.step(STEP);
    pressed = false;
  }
  assert.equal(a.combat.attack, null);
  assert.equal(a.combat.bufferedAction, null);
  assert.equal(a.health, a.stats.maxHealth);
});

it('also protects a draw and replays the release guard from a snapshot', () => {
  const { fighters, simulation } = startLock();
  pressSteps(simulation, 120, []);
  fighters.forEach((fighter) => assert.equal(fighter.combat.lockReleaseGuard, 0.15));
  assertSnapshotContinuation(simulation, 60, (current, step) => {
    current.forEach((fighter) => { fighter.intent.heavyAttack = step < 9; });
  });
  fighters.forEach((fighter) => assert.equal(fighter.combat.attack, null));
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AttackPhase, getAttackDuration, getAttackPhase, getPhaseProgress } from '../src/combat/attackPhases.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { STEP, createSimulation, repeat, spawnFighter } from './helpers.js';

function createDuel() {
  const player = spawnFighter(300, 1);
  const opponent = spawnFighter(900, -1, 'shadow');
  const simulation = createSimulation([player, opponent]);
  return { player, opponent, simulation };
}

function stepWithIntent(simulation, fighter, changes) {
  Object.assign(fighter.intent, changes);
  simulation.step(STEP);
  fighter.clearIntent();
}

function stepFor(simulation, seconds) {
  repeat(Math.ceil(seconds / STEP), () => simulation.step(STEP));
}

describe('attackPhases', () => {
  const attack = { startup: 0.1, active: 0.2, recovery: 0.3 };

  it('splits the attack into startup, active and recovery', () => {
    assert.equal(getAttackPhase(attack, 0.05), AttackPhase.STARTUP);
    assert.equal(getAttackPhase(attack, 0.15), AttackPhase.ACTIVE);
    assert.equal(getAttackPhase(attack, 0.45), AttackPhase.RECOVERY);
    assert.equal(getAttackPhase(attack, 0.7), AttackPhase.DONE);
  });

  it('reports the progress inside the current phase', () => {
    assert.equal(getPhaseProgress(attack, 0.05), 0.5);
    assert.equal(getPhaseProgress(attack, 0.2), 0.5);
    assert.equal(getPhaseProgress(attack, 2), 1);
  });
});

describe('CombatSystem actions', () => {
  it('starts a light attack, spends stamina and returns to idle at the end', () => {
    const { player, simulation } = createDuel();
    const attack = player.stats.attacks.light;

    stepWithIntent(simulation, player, { lightAttack: true });
    assert.equal(player.state, FighterState.ATTACKING);
    assert.equal(player.stamina, player.stats.maxStamina - attack.staminaCost);

    stepFor(simulation, getAttackDuration(attack) + STEP);
    assert.equal(player.state, FighterState.IDLE);
    assert.equal(player.combat.attack, null);
  });

  it('emits an event when an attack or a dodge starts', () => {
    const { player, simulation } = createDuel();

    stepWithIntent(simulation, player, { heavyAttack: true });
    assert.deepEqual(
      simulation.events.map((event) => [event.type, event.attackType, event.attacker]),
      [[CombatEvent.ATTACK_START, 'heavy', player]],
    );

    stepFor(simulation, 1.5);
    stepWithIntent(simulation, player, { dodge: true });
    assert.deepEqual(simulation.events.map((event) => event.type), [CombatEvent.DODGE]);
  });

  it('emits actionRejected once for a refused action', () => {
    const { player, simulation } = createDuel();
    player.stamina = 0;

    stepWithIntent(simulation, player, { heavyAttack: true });
    assert.deepEqual(simulation.events.map((event) => event.type), [CombatEvent.ACTION_REJECTED]);
    assert.equal(simulation.events[0].attacker, player);

    simulation.step(STEP);
    assert.deepEqual(simulation.events, []);
    assert.equal(player.combat.bufferedAction, null);
  });

  it('starts a heavy attack', () => {
    const { player, simulation } = createDuel();

    stepWithIntent(simulation, player, { heavyAttack: true });

    assert.equal(player.state, FighterState.HEAVY_ATTACK);
  });

  it('gives priority to dodge, then heavy, then light', () => {
    const { player, simulation } = createDuel();

    stepWithIntent(simulation, player, { dodge: true, heavyAttack: true, lightAttack: true });
    assert.equal(player.state, FighterState.DODGING);
  });

  it('refuses an action without enough stamina', () => {
    const { player, simulation } = createDuel();
    player.stamina = player.stats.attacks.heavy.staminaCost - 1;

    stepWithIntent(simulation, player, { heavyAttack: true });

    assert.equal(player.state, FighterState.IDLE);
  });

  it('does not move or start another action during an attack', () => {
    const { player, simulation } = createDuel();
    stepWithIntent(simulation, player, { lightAttack: true });

    stepWithIntent(simulation, player, { moveX: 1, heavyAttack: true, jump: true });

    assert.equal(player.state, FighterState.ATTACKING);
    assert.equal(player.grounded, true);
  });

  it('lunges forward when the attack becomes active', () => {
    const { player, simulation } = createDuel();
    const startX = player.x;

    stepWithIntent(simulation, player, { lightAttack: true });
    stepFor(simulation, player.stats.attacks.light.startup + STEP);

    assert.ok(player.x > startX);
    assert.equal(player.combat.lungeApplied, true);
  });

  it('cannot attack in the air', () => {
    const { player, simulation } = createDuel();
    stepWithIntent(simulation, player, { jump: true });

    stepWithIntent(simulation, player, { lightAttack: true });

    assert.equal(player.state, FighterState.JUMPING);
  });

  it('blocks while the key is held and stops when released', () => {
    const { player, simulation } = createDuel();

    stepWithIntent(simulation, player, { block: true });
    assert.equal(player.state, FighterState.BLOCKING);

    stepWithIntent(simulation, player, { block: true });
    assert.equal(player.state, FighterState.BLOCKING);

    simulation.step(STEP);
    assert.equal(player.state, FighterState.IDLE);
  });

  it('dodges backward by default and in the held direction otherwise', () => {
    const backward = createDuel();
    stepWithIntent(backward.simulation, backward.player, { dodge: true });
    assert.ok(backward.player.vx < 0);

    const forward = createDuel();
    stepWithIntent(forward.simulation, forward.player, { dodge: true, moveX: 1 });
    assert.ok(forward.player.vx > 0);
  });

  it('ends the dodge after its duration', () => {
    const { player, simulation } = createDuel();
    stepWithIntent(simulation, player, { dodge: true });

    stepFor(simulation, player.stats.dodge.duration + STEP);

    assert.notEqual(player.state, FighterState.DODGING);
  });
});

describe('StaminaSystem', () => {
  it('waits for the regen delay and then regenerates', () => {
    const { player, simulation } = createDuel();
    stepWithIntent(simulation, player, { heavyAttack: true });
    const afterAttack = player.stamina;

    stepFor(simulation, player.stats.stamina.regenDelay / 2);
    assert.equal(player.stamina, afterAttack);

    stepFor(simulation, player.stats.stamina.regenDelay);
    assert.ok(player.stamina > afterAttack);
  });

  it('never goes above the maximum', () => {
    const { player, simulation } = createDuel();

    stepFor(simulation, 2);

    assert.equal(player.stamina, player.stats.maxStamina);
  });

  it('regenerates slower while blocking', () => {
    const idle = createDuel();
    const blocking = createDuel();
    idle.player.stamina = 10;
    blocking.player.stamina = 10;

    repeat(30, () => {
      idle.simulation.step(STEP);
      stepWithIntent(blocking.simulation, blocking.player, { block: true });
    });

    assert.ok(blocking.player.stamina < idle.player.stamina);
  });
});

describe('input buffer', () => {
  it('starts an attack pressed during recovery on the first free frame', () => {
    const { player, simulation } = createDuel();
    const attack = player.stats.attacks.light;

    stepWithIntent(simulation, player, { lightAttack: true });
    stepFor(simulation, getAttackDuration(attack) - 0.1);
    assert.equal(player.state, FighterState.ATTACKING);

    stepWithIntent(simulation, player, { heavyAttack: true });
    stepFor(simulation, 0.1);

    assert.equal(player.state, FighterState.HEAVY_ATTACK);
  });

  it('forgets a press after the buffer time', () => {
    const { player, simulation } = createDuel();
    const attack = player.stats.attacks.heavy;

    stepWithIntent(simulation, player, { heavyAttack: true });
    stepWithIntent(simulation, player, { lightAttack: true });
    stepFor(simulation, getAttackDuration(attack));

    assert.equal(player.state, FighterState.IDLE);
    assert.equal(player.combat.bufferedAction, null);
  });

  it('keeps only the latest press', () => {
    const { player, simulation } = createDuel();
    const attack = player.stats.attacks.light;

    stepWithIntent(simulation, player, { lightAttack: true });
    stepFor(simulation, getAttackDuration(attack) - 0.1);
    stepWithIntent(simulation, player, { heavyAttack: true });
    stepWithIntent(simulation, player, { dodge: true });
    stepFor(simulation, 0.1);

    assert.equal(player.state, FighterState.DODGING);
  });
});

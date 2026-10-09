import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { isInPowerRange } from '../src/combat/PowerSystem.js';
import { hasHurtbox } from '../src/combat/hitboxes.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { airDashConfig } from '../src/config/airDashConfig.js';
import { fighterArchetypes } from '../src/config/fightersConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { STEP, arena, createSimulation, repeat, spawnFighter } from './helpers.js';

function press(simulation, fighter, field, steps = 1) {
  fighter.intent[field] = true;
  simulation.step(STEP);
  fighter.intent[field] = false;
  const events = simulation.events.map((event) => event.type);
  repeat(steps - 1, () => simulation.step(STEP));
  return events;
}

function airborne(characterId = 'guardian', opponentX = 1000) {
  const fighter = spawnFighter(400, 1, characterId);
  const opponent = spawnFighter(opponentX, -1, 'shadow');
  const simulation = createSimulation([fighter, opponent]);
  press(simulation, fighter, 'jump', 6);
  return { fighter, opponent, simulation };
}

describe('double jump for everyone', () => {
  it('gives every archetype two jumps and the wasp the strongest air jump and the cheapest air dash', () => {
    for (const [id, archetype] of Object.entries(fighterArchetypes)) {
      assert.equal(archetype.movement.maxJumps, 2, id);
      if (id !== 'wasp') {
        assert.ok(fighterArchetypes.wasp.movement.airJumpVelocityScale > archetype.movement.airJumpVelocityScale, id);
      }
    }
    assert.ok(spawnFighter(400, 1, 'wasp').stats.airDash.staminaCost < airDashConfig.profile.staminaCost);
    assert.equal(spawnFighter(400, 1, 'guardian').stats.airDash, airDashConfig.profile);
  });

  it('jumps again in the air for every fighter', () => {
    const { fighter, simulation } = airborne('bastion');
    press(simulation, fighter, 'jump');
    assert.equal(fighter.combat.jumpsUsed, 2);
    assert.ok(fighter.vy < 0);
  });
});

describe('air dash', () => {
  it('turns the dodge into a short horizontal dash once per jump, paid with stamina and without invulnerability', () => {
    const { fighter, simulation } = airborne();
    const stamina = fighter.stamina;
    const events = press(simulation, fighter, 'dodge');
    assert.ok(events.includes(CombatEvent.DODGE));
    assert.equal(fighter.state, FighterState.DODGING);
    assert.equal(fighter.combat.airDashUsed, true);
    assert.equal(fighter.vx, fighter.facing * airDashConfig.profile.speed);
    assert.ok(fighter.stamina <= stamina - airDashConfig.profile.staminaCost + 1);
    assert.equal(hasHurtbox(fighter), true);
    repeat(Math.ceil(airDashConfig.profile.duration / STEP) + 1, () => simulation.step(STEP));
    assert.notEqual(fighter.state, FighterState.DODGING);
    if (!fighter.grounded) {
      const again = press(simulation, fighter, 'dodge');
      assert.ok(again.includes(CombatEvent.ACTION_REJECTED));
      assert.notEqual(fighter.state, FighterState.DODGING);
    }
    repeat(120, () => simulation.step(STEP));
    assert.equal(fighter.grounded, true);
    assert.equal(fighter.combat.airDashUsed, false);
  });

  it('follows the held direction and is refused without stamina', () => {
    const back = airborne();
    back.fighter.intent.moveX = -1;
    press(back.simulation, back.fighter, 'dodge');
    assert.ok(back.fighter.vx < 0);

    const tired = airborne();
    tired.fighter.stamina = 0;
    const events = press(tired.simulation, tired.fighter, 'dodge');
    assert.ok(events.includes(CombatEvent.ACTION_REJECTED));
    assert.notEqual(tired.fighter.state, FighterState.DODGING);
  });

  it('crosses over the opponent and turns around on landing', () => {
    const fighter = spawnFighter(560, 1, 'guardian');
    const opponent = spawnFighter(640, -1, 'bastion');
    const simulation = createSimulation([fighter, opponent]);
    press(simulation, fighter, 'jump', 10);
    press(simulation, fighter, 'jump', 4);
    press(simulation, fighter, 'dodge');
    repeat(90, () => simulation.step(STEP));
    assert.ok(fighter.x > opponent.x);
    assert.equal(fighter.grounded, true);
    assert.equal(fighter.facing, -1);
  });
});

describe('powers against airborne targets', () => {
  it('reach a target at the height of a double jump', () => {
    const caster = spawnFighter(400, 1, 'guardian');
    const target = spawnFighter(600, -1, 'shadow');
    target.grounded = false;
    target.y = arena.floorY - powersConfig.airReach + 10;
    assert.equal(isInPowerRange(caster, target, powersConfig.powers.push), true);
    target.y = arena.floorY - powersConfig.airReach - 10;
    assert.equal(isInPowerRange(caster, target, powersConfig.powers.push), false);
  });

  it('push harder and hold longer when the target is in the air', () => {
    const results = [];
    for (const inAir of [false, true]) {
      const caster = spawnFighter(400, 1, 'guardian');
      const target = spawnFighter(600, -1, 'shadow');
      const simulation = createSimulation([caster, target], { powers: true });
      caster.flowMeter = 100;
      caster.intent.power = true;
      simulation.step(STEP);
      caster.intent.power = false;
      let velocity = 0;
      for (let i = 0; i < 40 && velocity === 0; i += 1) {
        if (inAir) {
          target.grounded = false;
          target.y = arena.floorY - 150;
          target.vy = 0;
        }
        simulation.step(STEP);
        if (simulation.events.some((event) => event.type === CombatEvent.POWER_HIT)) {
          velocity = target.vx;
          results.push({ velocity, stagger: target.combat.stunDuration });
        }
      }
    }
    const [ground, air] = results;
    assert.ok(air.velocity > ground.velocity * (1 + (powersConfig.interactions.push.air.scale - 1) / 2));
    assert.ok(air.stagger >= ground.stagger);
  });
});

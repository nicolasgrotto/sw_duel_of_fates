import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { isBarrierUp, selectPower } from '../src/combat/PowerSystem.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { Fighter } from '../src/entities/Fighter.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { ReplayBuffer, restoreFighter } from '../src/simulation/ReplayBuffer.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';

const { push, pull, lightning, barrier } = powersConfig.powers;

function duel(casterId, targetId, gap = 160) {
  const caster = spawnFighter(400, 1, casterId);
  const target = spawnFighter(400 + caster.width / 2 + gap + 23, -1, targetId);
  const simulation = createSimulation([caster, target], { powers: true });
  caster.flowMeter = 100;
  target.flowMeter = 100;
  return { caster, target, simulation, events: [] };
}

function step(setup, count = 1) {
  for (let i = 0; i < count; i += 1) {
    setup.simulation.step(STEP);
    setup.events.push(...setup.simulation.events.map((event) => event.type));
    for (const fighter of [setup.caster, setup.target]) {
      fighter.intent.power = false;
      fighter.intent.lightAttack = false;
      fighter.intent.heavyAttack = false;
      fighter.intent.dodge = false;
    }
  }
}

function cast(setup, fighter, moveX = 0) {
  fighter.intent.moveX = moveX;
  fighter.intent.power = true;
  step(setup);
  fighter.intent.moveX = 0;
}

function stepsFor(seconds) {
  return Math.ceil(seconds / STEP) + 1;
}

function setLevel(fighter, level) {
  fighter.stats = { ...fighter.stats, flowLevel: level };
}

describe('power selection', () => {
  it('maps neutral, forward and back to the alignment loadout', () => {
    const light = spawnFighter(400, 1, 'guardian');
    const dark = spawnFighter(400, -1, 'shadow');
    assert.equal(selectPower(light).id, 'push');
    light.intent.moveX = -1;
    assert.equal(selectPower(light).id, 'barrier');
    light.intent.moveX = 1;
    assert.equal(selectPower(light).id, 'push');
    assert.equal(selectPower(dark).id, 'lightning');
    dark.intent.moveX = -1;
    assert.equal(selectPower(dark).id, 'pull');
  });
});

describe('instant powers', () => {
  it('pushes, damages and staggers a target in range, then sets the cooldown', () => {
    const setup = duel('guardian', 'shadow');
    const { caster, target } = setup;
    cast(setup, caster);
    assert.equal(caster.state, FighterState.CASTING);
    assert.ok(Math.abs(caster.flowMeter - (100 - push.cost)) < 1);
    step(setup, stepsFor(push.startup));
    assert.ok(setup.events.includes(CombatEvent.POWER_HIT));
    assert.equal(target.state, FighterState.STAGGERED);
    assert.ok(target.vx > 0);
    assert.ok(target.health < target.stats.maxHealth);
    step(setup, stepsFor(push.active + push.recovery));
    assert.equal(caster.state, FighterState.IDLE);
    assert.ok(caster.combat.powerCooldown > 0);
    cast(setup, caster);
    assert.notEqual(caster.state, FighterState.CASTING);
  });

  it('only slides and drains stamina from a guarding target', () => {
    const setup = duel('guardian', 'shadow');
    const { caster, target } = setup;
    target.intent.block = true;
    step(setup);
    const stamina = target.stamina;
    cast(setup, caster);
    step(setup, stepsFor(push.startup));
    assert.ok(setup.events.includes(CombatEvent.POWER_BLOCKED));
    assert.equal(target.state, FighterState.BLOCKING);
    assert.ok(target.stamina < stamina);
    assert.equal(target.health, target.stats.maxHealth);
  });

  it('is resisted from three levels of difference and halved at two', () => {
    const resisted = duel('guardian', 'shadow');
    setLevel(resisted.caster, 3);
    setLevel(resisted.target, 6);
    cast(resisted, resisted.caster);
    step(resisted, stepsFor(push.startup));
    assert.ok(resisted.events.includes(CombatEvent.POWER_RESISTED));
    assert.equal(resisted.target.health, resisted.target.stats.maxHealth);
    assert.notEqual(resisted.target.state, FighterState.STAGGERED);

    const full = duel('guardian', 'shadow');
    const reduced = duel('guardian', 'shadow');
    setLevel(full.caster, 5);
    setLevel(full.target, 5);
    setLevel(reduced.caster, 5);
    setLevel(reduced.target, 7);
    for (const setup of [full, reduced]) {
      cast(setup, setup.caster);
      step(setup, stepsFor(push.startup) - 1);
    }
    const fullDamage = full.target.stats.maxHealth - full.target.health;
    const reducedDamage = reduced.target.stats.maxHealth - reduced.target.health;
    assert.ok(Math.abs(reducedDamage - fullDamage / 2) < 0.01);
  });

  it('misses targets out of range or invulnerable', () => {
    const far = duel('guardian', 'shadow', push.range + 40);
    cast(far, far.caster);
    step(far, stepsFor(push.startup));
    assert.ok(!far.events.includes(CombatEvent.POWER_HIT));
    assert.ok(far.events.includes(CombatEvent.POWER_ACTIVE));

    const dodged = duel('guardian', 'shadow');
    cast(dodged, dodged.caster);
    step(dodged, stepsFor(push.startup) - 4);
    dodged.target.intent.dodge = true;
    step(dodged, 4);
    assert.ok(!dodged.events.includes(CombatEvent.POWER_HIT));
  });

  it('is interrupted by a hit during the startup', () => {
    const setup = duel('guardian', 'shadow', 20);
    const { caster, target } = setup;
    target.intent.lightAttack = true;
    step(setup);
    cast(setup, caster);
    step(setup, stepsFor(push.startup + 0.2));
    assert.ok(setup.events.includes(CombatEvent.HIT));
    assert.ok(!setup.events.includes(CombatEvent.POWER_ACTIVE));
    assert.equal(caster.combat.power, null);
  });

  it('pulls the target toward the caster and staggers it', () => {
    const setup = duel('shadow', 'guardian', 300);
    const { caster, target } = setup;
    cast(setup, caster, -caster.facing * -1);
    assert.equal(caster.combat.power.id, 'pull');
    step(setup, stepsFor(pull.startup));
    assert.ok(target.vx < 0);
    assert.equal(target.state, FighterState.STAGGERED);
    const startGap = target.x - caster.x;
    step(setup, 40);
    assert.ok(target.x - caster.x < startGap - 150);
  });
});

describe('channeled powers', () => {
  it('ticks lightning while held, drains the meter and stops when released', () => {
    const setup = duel('shadow', 'guardian', 150);
    const { caster, target } = setup;
    caster.intent.powerHeld = true;
    cast(setup, caster);
    assert.equal(caster.state, FighterState.CHANNELING);
    step(setup, stepsFor(lightning.startup + lightning.tickInterval * 3));
    const ticks = setup.events.filter((type) => type === CombatEvent.POWER_HIT).length;
    assert.ok(ticks >= 3);
    assert.ok(target.health < target.stats.maxHealth);
    assert.ok(caster.flowMeter < 100 - lightning.cost);
    caster.intent.powerHeld = false;
    step(setup, stepsFor(lightning.recovery) + 1);
    assert.equal(caster.state, FighterState.IDLE);
  });

  it('gives at least one tick for a tap and lets the target act between ticks', () => {
    const setup = duel('shadow', 'guardian', 150);
    cast(setup, setup.caster);
    step(setup, stepsFor(lightning.startup + lightning.recovery));
    assert.equal(setup.events.filter((type) => type === CombatEvent.POWER_HIT).length, 1);
    assert.ok(lightning.stun < lightning.tickInterval);
  });

  it('reduces lightning to chip damage on guard', () => {
    const open = duel('shadow', 'guardian', 150);
    const guarded = duel('shadow', 'guardian', 150);
    guarded.target.intent.block = true;
    step(guarded);
    for (const setup of [open, guarded]) {
      setup.caster.intent.powerHeld = true;
      cast(setup, setup.caster);
      step(setup, stepsFor(lightning.startup + lightning.tickInterval * 2));
    }
    const openDamage = open.target.stats.maxHealth - open.target.health;
    const guardedDamage = guarded.target.stats.maxHealth - guarded.target.health;
    assert.ok(guardedDamage > 0 && guardedDamage < openDamage / 2);
    assert.ok(guarded.events.includes(CombatEvent.POWER_BLOCKED));
  });

  it('raises a barrier that absorbs lightning and saber hits until a shove breaks it', () => {
    const setup = duel('guardian', 'shadow', 150);
    const { caster: holder, target: attacker } = setup;
    holder.intent.powerHeld = true;
    cast(setup, holder, -1);
    assert.equal(holder.combat.power.id, 'barrier');
    step(setup, stepsFor(barrier.startup));
    assert.ok(isBarrierUp(holder));

    attacker.intent.powerHeld = true;
    cast(setup, attacker);
    step(setup, stepsFor(lightning.startup + lightning.tickInterval));
    assert.ok(setup.events.includes(CombatEvent.POWER_ABSORBED));
    assert.equal(holder.health, holder.stats.maxHealth);
    assert.ok(holder.flowMeter < 100 - barrier.cost);
  });

  it('blocks saber hits without stamina and falls to a shove', () => {
    const setup = duel('guardian', 'shadow', 30);
    const { caster: holder, target: attacker } = setup;
    holder.intent.powerHeld = true;
    cast(setup, holder, -1);
    step(setup, stepsFor(barrier.startup));
    const stamina = holder.stamina;
    attacker.intent.lightAttack = true;
    step(setup, stepsFor(attacker.moves.light.startup + attacker.moves.light.active));
    assert.ok(setup.events.includes(CombatEvent.POWER_ABSORBED));
    assert.equal(holder.health, holder.stats.maxHealth);
    assert.ok(holder.stamina >= stamina);

    step(setup, stepsFor(attacker.moves.light.recovery));
    attacker.intent.lightAttack = true;
    attacker.intent.block = true;
    step(setup);
    attacker.intent.block = false;
    step(setup, stepsFor(attacker.moves.shove.startup + attacker.moves.shove.active));
    assert.ok(setup.events.includes(CombatEvent.SHOVE));
    assert.equal(holder.state, FighterState.STAGGERED);
    assert.equal(isBarrierUp(holder), false);
  });
});

describe('powers and rules', () => {
  it('ignores the power action silently in the classic rules', () => {
    const caster = spawnFighter(400, 1, 'guardian');
    const target = spawnFighter(600, -1, 'shadow');
    const simulation = createSimulation([caster, target]);
    caster.intent.power = true;
    simulation.step(STEP);
    assert.equal(caster.state, FighterState.IDLE);
    assert.equal(simulation.events.length, 0);
  });

  it('rejects a power without enough meter and tags the rejection', () => {
    const setup = duel('guardian', 'shadow');
    setup.caster.flowMeter = push.cost - 1;
    setup.caster.intent.power = true;
    setup.simulation.step(STEP);
    const rejection = setup.simulation.events.find((event) => event.type === CombatEvent.ACTION_REJECTED);
    assert.equal(rejection.attackType, 'power');
  });

  it('replays a duel with powers to the exact same state', () => {
    const fighters = [spawnFighter(420, 1, 'guardian'), spawnFighter(700, -1, 'shadow')];
    const simulation = createSimulation(fighters, { powers: true });
    const buffer = new ReplayBuffer({ frames: 180, snapshotInterval: 30 });
    for (let index = 0; index < 500; index += 1) {
      fighters[0].intent.power = index % 140 === 20;
      fighters[0].intent.powerHeld = index % 140 > 60 && index % 140 < 100;
      fighters[0].intent.moveX = index % 140 > 59 && index % 140 < 62 ? -1 : 0;
      fighters[1].intent.power = index % 110 === 50;
      fighters[1].intent.powerHeld = index % 110 > 50 && index % 110 < 90;
      fighters[1].intent.lightAttack = index % 37 === 0;
      buffer.record(fighters, STEP);
      simulation.step(STEP);
      fighters.forEach((fighter) => fighter.clearIntent());
    }
    const playback = buffer.createPlayback();
    const replayed = fighters.map((original, index) => {
      const snapshot = playback.snapshot.fighters[index];
      const fighter = new Fighter({
        id: original.id, name: original.name, stats: original.stats, appearance: original.appearance,
        sound: original.sound, x: snapshot.x, y: original.floorY, facing: snapshot.facing,
      });
      restoreFighter(fighter, snapshot);
      return fighter;
    });
    const replay = createSimulation(replayed, { powers: true });
    for (let index = playback.firstStep; index < playback.lastStep; index += 1) {
      replay.step(buffer.readStep(index, replayed));
    }
    for (let index = 0; index < fighters.length; index += 1) {
      assert.equal(replayed[index].x, fighters[index].x);
      assert.equal(replayed[index].health, fighters[index].health);
      assert.equal(replayed[index].flowMeter, fighters[index].flowMeter);
      assert.equal(replayed[index].state, fighters[index].state);
    }
  });
});

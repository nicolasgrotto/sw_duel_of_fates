import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { resolveLevelBand } from '../src/combat/flowInteractions.js';
import { captureProjectiles, restoreProjectiles } from '../src/combat/ProjectileSystem.js';
import { projectilesConfig } from '../src/config/projectilesConfig.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { Fighter } from '../src/entities/Fighter.js';
import { ReplayBuffer, captureFighter, restoreFighter } from '../src/simulation/ReplayBuffer.js';
import { STEP, arena, createSimulation, spawnFighter } from './helpers.js';

const sizes = projectilesConfig.throw.sizes;

function setLevel(fighter, level) {
  fighter.stats = { ...fighter.stats, flowLevel: level };
}

function throwSetup({ casterId = 'mirror', targetId = 'shadow', gap = 300, level = null } = {}) {
  const caster = spawnFighter(300, 1, casterId);
  const target = spawnFighter(300 + gap, -1, targetId);
  if (level !== null) setLevel(caster, level);
  const simulation = createSimulation([caster, target], { powers: true });
  caster.flowMeter = 100;
  target.flowMeter = 100;
  return { caster, target, simulation, events: [] };
}

function run(setup, steps, each = () => {}) {
  for (let i = 0; i < steps; i += 1) {
    each(i);
    setup.simulation.step(STEP);
    setup.events.push(...setup.simulation.events.map((event) => event.type));
    for (const fighter of [setup.caster, setup.target]) {
      fighter.intent.power = false;
      fighter.intent.special = false;
    }
  }
}

function castThrow(setup) {
  setup.caster.intent.moveX = setup.caster.facing;
  setup.caster.intent.power = true;
  run(setup, 1);
  setup.caster.intent.moveX = 0;
}

function activeProjectiles(setup) {
  return setup.simulation.projectiles.pool.filter((projectile) => projectile.active);
}

describe('projectile pool', () => {
  it('keeps a fixed pool and reuses its slots', () => {
    const setup = throwSetup();
    const { pool } = setup.simulation.projectiles;
    const slots = [...pool];
    assert.equal(pool.length, projectilesConfig.capacity);
    castThrow(setup);
    run(setup, 120);
    assert.ok(slots.every((slot, index) => slot === setup.simulation.projectiles.pool[index]));
    assert.equal(setup.simulation.projectiles.pool.length, projectilesConfig.capacity);
  });

  it('round-trips through a snapshot', () => {
    const setup = throwSetup({ gap: 600 });
    castThrow(setup);
    run(setup, 20);
    const snapshot = captureProjectiles(setup.simulation.projectiles);
    assert.ok(snapshot.some((projectile) => projectile.active));
    const other = createSimulation([spawnFighter(300), spawnFighter(600, -1)], { powers: true });
    restoreProjectiles(other.projectiles, snapshot);
    assert.deepEqual(captureProjectiles(other.projectiles), snapshot);
  });
});

describe('throw', () => {
  it('picks size, damage, speed, cost and cooldown from the flow band of the caster', () => {
    assert.deepEqual([1, 3, 4, 5, 6, 8, 9, 10].map((level) => resolveLevelBand(level, sizes).id), ['small', 'small', 'medium', 'medium', 'large', 'large', 'huge', 'max']);
    for (let i = 1; i < sizes.length; i += 1) {
      assert.ok(sizes[i].radius > sizes[i - 1].radius && sizes[i].damage > sizes[i - 1].damage && sizes[i].speed < sizes[i - 1].speed);
    }
    for (const level of [2, 10]) {
      const setup = throwSetup({ level, gap: 700 });
      castThrow(setup);
      const band = resolveLevelBand(level, sizes);
      assert.ok(Math.abs(setup.caster.flowMeter - (100 - band.cost)) < 1);
      run(setup, 25);
      assert.equal(activeProjectiles(setup)[0].radius, band.radius);
      run(setup, 60);
      assert.ok(setup.caster.combat.powerCooldown > 0 && setup.caster.combat.powerCooldown <= band.cooldown);
    }
  });

  it('flies to a distant target and staggers it', () => {
    const setup = throwSetup({ gap: 500 });
    castThrow(setup);
    run(setup, 80);
    assert.ok(setup.events.includes(CombatEvent.POWER_HIT));
    assert.ok(setup.target.health < setup.target.stats.maxHealth);
    assert.equal(activeProjectiles(setup).length, 0);
  });

  it('is blocked with chip damage, absorbed by the barrier and dodged', () => {
    const guarded = throwSetup({ gap: 400 });
    run(guarded, 1, () => { guarded.target.intent.block = true; });
    castThrow(guarded);
    run(guarded, 80, () => { guarded.target.intent.block = true; });
    assert.ok(guarded.events.includes(CombatEvent.POWER_BLOCKED));
    assert.equal(guarded.target.state, FighterState.BLOCKING);
    assert.ok(guarded.target.health < guarded.target.stats.maxHealth);

    const barrier = throwSetup({ targetId: 'guardian', gap: 500 });
    castThrow(barrier);
    run(barrier, 80, () => {
      barrier.target.intent.moveX = 1;
      barrier.target.intent.power = true;
      barrier.target.intent.powerHeld = true;
    });
    assert.ok(barrier.events.includes(CombatEvent.POWER_ABSORBED));
    assert.equal(barrier.target.health, barrier.target.stats.maxHealth);

    const dodged = throwSetup({ gap: 300 });
    castThrow(dodged);
    let dodgedOnce = false;
    run(dodged, 60, () => {
      const near = activeProjectiles(dodged).some((projectile) => Math.abs(projectile.x - dodged.target.x) < 70);
      dodged.target.intent.dodge = near && !dodgedOnce;
      dodged.target.intent.moveX = dodged.target.intent.dodge ? dodged.target.facing : 0;
      dodgedOnce ||= near;
    });
    assert.ok(dodgedOnce);
    assert.equal(dodged.target.health, dodged.target.stats.maxHealth);
  });

  it('is resisted three levels below and breaks on the wall when it misses', () => {
    const resisted = throwSetup({ gap: 300 });
    setLevel(resisted.caster, 2);
    setLevel(resisted.target, 5);
    castThrow(resisted);
    run(resisted, 80);
    assert.ok(resisted.events.includes(CombatEvent.POWER_RESISTED));
    assert.equal(resisted.target.health, resisted.target.stats.maxHealth);

    const missed = throwSetup({ gap: 300 });
    castThrow(missed);
    run(missed, 200, () => {
      missed.target.grounded = false;
      missed.target.y = arena.floorY - 400;
      missed.target.vy = 0;
    });
    assert.equal(activeProjectiles(missed).length, 0);
    assert.equal(missed.target.health, missed.target.stats.maxHealth);
  });
});

describe('saber throw', () => {
  function throwSaber(gap) {
    const setup = throwSetup({ casterId: 'guardian', targetId: 'bastion', gap });
    setup.caster.intent.moveX = -1;
    setup.caster.intent.special = true;
    run(setup, 1);
    setup.caster.intent.moveX = 0;
    return setup;
  }

  it('leaves the hand, hits once, comes back and blocks blade actions meanwhile', () => {
    const setup = throwSaber(250);
    let thrown = false;
    let rejected = false;
    run(setup, 120, (i) => {
      thrown ||= setup.caster.combat.saberThrown;
      setup.caster.intent.lightAttack = i === 30 && setup.caster.combat.saberThrown;
      if (setup.caster.intent.lightAttack) rejected = true;
    });
    assert.ok(thrown);
    assert.ok(rejected);
    assert.equal(setup.events.filter((type) => type === CombatEvent.HIT).length, 1);
    assert.ok(setup.target.health < setup.target.stats.maxHealth);
    assert.equal(setup.caster.combat.saberThrown, false);
    assert.equal(activeProjectiles(setup).length, 0);
  });

  it('is blocked from the front and still returns', () => {
    const setup = throwSaber(250);
    run(setup, 120, () => { setup.target.intent.block = true; });
    assert.ok(setup.events.includes(CombatEvent.BLOCK));
    assert.equal(setup.caster.combat.saberThrown, false);
  });

  it('replays deterministically with a blade in the air', () => {
    const setup = throwSaber(250);
    const fighters = [setup.caster, setup.target];
    const buffer = new ReplayBuffer({ frames: 240, snapshotInterval: 10 });
    for (let i = 0; i < 52; i += 1) {
      buffer.record(fighters, STEP, setup.simulation.projectiles);
      setup.simulation.step(STEP);
    }
    const start = buffer.snapshots.find((snapshot) => snapshot && snapshot.step === 20);
    assert.ok(start.projectiles.some((projectile) => projectile.active));
    const clones = fighters.map((original, index) => {
      const clone = new Fighter({ id: original.id, name: original.name, stats: original.stats, appearance: original.appearance, sound: original.sound, x: 0, y: original.floorY, facing: 1 });
      restoreFighter(clone, start.fighters[index]);
      return clone;
    });
    const replay = createSimulation(clones, { powers: true });
    replay.projectiles.fighters = clones;
    restoreProjectiles(replay.projectiles, start.projectiles);
    for (let step = start.step; step < buffer.count; step += 1) {
      replay.step(buffer.readStep(step, clones));
    }
    for (let i = 0; i < fighters.length; i += 1) {
      const original = captureFighter(fighters[i]);
      const replayed = captureFighter(clones[i]);
      assert.equal(replayed.x, original.x);
      assert.equal(replayed.health, original.health);
      assert.equal(replayed.combat.saberThrown, original.combat.saberThrown);
    }
    assert.deepEqual(captureProjectiles(replay.projectiles), captureProjectiles(setup.simulation.projectiles));
  });
});

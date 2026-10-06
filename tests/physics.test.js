import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CollisionSystem } from '../src/systems/CollisionSystem.js';
import { PhysicsSystem } from '../src/systems/PhysicsSystem.js';
import { STEP, arena, physicsConfig, repeat, spawnFighter } from './helpers.js';

describe('PhysicsSystem', () => {
  it('pulls an airborne fighter down with gravity', () => {
    const fighter = spawnFighter(400);
    fighter.y = 300;
    fighter.grounded = false;
    const physics = new PhysicsSystem(physicsConfig, arena);

    physics.update([fighter], STEP);

    assert.equal(fighter.vy, physicsConfig.gravity * STEP);
    assert.ok(fighter.y > 300);
  });

  it('limits the fall speed', () => {
    const fighter = spawnFighter(400);
    fighter.y = -100000;
    fighter.grounded = false;
    const physics = new PhysicsSystem(physicsConfig, arena);

    repeat(120, () => physics.update([fighter], STEP));

    assert.equal(fighter.vy, physicsConfig.maxFallSpeed);
  });

  it('stops the fighter on the floor', () => {
    const fighter = spawnFighter(400);
    fighter.y = arena.floorY - 1;
    fighter.vy = 600;
    fighter.grounded = false;
    const physics = new PhysicsSystem(physicsConfig, arena);

    physics.update([fighter], STEP);

    assert.equal(fighter.y, arena.floorY);
    assert.equal(fighter.vy, 0);
    assert.equal(fighter.grounded, true);
  });

  it('keeps the fighter inside the arena walls', () => {
    const fighter = spawnFighter(arena.left + 30);
    fighter.vx = -500;
    const physics = new PhysicsSystem(physicsConfig, arena);

    repeat(30, () => physics.update([fighter], STEP));

    assert.equal(fighter.left, arena.left);
    assert.equal(fighter.vx, 0);
  });
});

describe('CollisionSystem', () => {
  it('pushes overlapping fighters apart by the same amount', () => {
    const a = spawnFighter(600);
    const b = spawnFighter(620, -1);
    const collision = new CollisionSystem(arena);

    collision.update([a, b]);

    assert.equal(a.right, b.left);
    assert.equal((a.x + b.x) / 2, 610);
  });

  it('pushes only the free fighter when the other is against a wall', () => {
    const cornered = spawnFighter(arena.left + 23);
    const attacker = spawnFighter(arena.left + 40, -1);
    const collision = new CollisionSystem(arena);

    collision.update([cornered, attacker]);

    assert.equal(cornered.left, arena.left);
    assert.equal(cornered.right, attacker.left);
  });

  it('ignores fighters that do not overlap vertically', () => {
    const grounded = spawnFighter(600);
    const jumper = spawnFighter(610);
    jumper.y = grounded.top - 1;
    const collision = new CollisionSystem(arena);

    collision.update([grounded, jumper]);

    assert.equal(grounded.x, 600);
    assert.equal(jumper.x, 610);
  });
});

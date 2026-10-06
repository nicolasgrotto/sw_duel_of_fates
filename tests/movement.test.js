import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FighterState } from '../src/entities/fighterStates.js';
import { MovementSystem } from '../src/systems/MovementSystem.js';
import { PhysicsSystem } from '../src/systems/PhysicsSystem.js';
import { STEP, arena, physicsConfig, repeat, spawnFighter } from './helpers.js';

function createWorld() {
  const player = spawnFighter(400, 1);
  const opponent = spawnFighter(900, -1, 'shadow');
  const fighters = [player, opponent];
  const movement = new MovementSystem(physicsConfig);
  const physics = new PhysicsSystem(physicsConfig, arena);

  const step = () => {
    movement.applyIntents(fighters, STEP);
    physics.update(fighters, STEP);
    movement.updateStates(fighters);
  };

  return { player, opponent, fighters, movement, step };
}

describe('MovementSystem', () => {
  it('accelerates up to the walk speed instead of starting at full speed', () => {
    const { player, step } = createWorld();
    const { walkSpeed } = player.stats.movement;
    player.intent.moveX = 1;

    step();
    assert.ok(player.vx > 0 && player.vx < walkSpeed);

    repeat(60, step);
    assert.equal(player.vx, walkSpeed);
    assert.equal(player.state, FighterState.WALKING);
  });

  it('walks backward slower than forward', () => {
    const { player, step } = createWorld();
    const { walkSpeed, backwardSpeedMultiplier } = player.stats.movement;
    player.intent.moveX = -1;

    repeat(60, step);

    assert.equal(player.vx, -walkSpeed * backwardSpeedMultiplier);
  });

  it('slows down and becomes idle when there is no input', () => {
    const { player, step } = createWorld();
    player.intent.moveX = 1;
    repeat(60, step);

    player.intent.moveX = 0;
    repeat(60, step);

    assert.equal(player.vx, 0);
    assert.equal(player.state, FighterState.IDLE);
  });

  it('jumps only from the ground and lands back on the floor', () => {
    const { player, step } = createWorld();
    player.intent.jump = true;

    step();
    assert.equal(player.state, FighterState.JUMPING);
    assert.ok(player.y < arena.floorY);

    const heightAfterFirstStep = player.y;
    step();
    assert.ok(player.y < heightAfterFirstStep);

    player.intent.jump = false;
    repeat(120, step);

    assert.equal(player.y, arena.floorY);
    assert.equal(player.grounded, true);
    assert.equal(player.state, FighterState.IDLE);
  });

  it('does not jump again while in the air', () => {
    const { player, step } = createWorld();
    player.intent.jump = true;
    step();
    const verticalSpeed = player.vy;

    step();

    assert.ok(player.vy > verticalSpeed);
  });

  it('faces the opponent while on the ground', () => {
    const { player, opponent, step } = createWorld();
    player.x = 1000;

    step();

    assert.equal(player.facing, -1);
    assert.equal(opponent.facing, 1);
  });

  it('keeps the facing while in the air', () => {
    const { player, step } = createWorld();
    player.intent.jump = true;
    step();

    player.x = 1000;
    step();

    assert.equal(player.facing, 1);
  });

  it('ignores intents when the fighter cannot move', () => {
    const { player, step } = createWorld();
    player.setState(FighterState.STUNNED);
    player.intent.moveX = 1;
    player.intent.jump = true;

    step();

    assert.equal(player.vx, 0);
    assert.equal(player.grounded, true);
    assert.equal(player.state, FighterState.STUNNED);
  });
});

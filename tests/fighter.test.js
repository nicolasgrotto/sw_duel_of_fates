import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createFighter } from '../src/characters/characterFactory.js';
import { characters } from '../src/characters/characterData.js';
import { fighterArchetypes } from '../src/config/fightersConfig.js';
import { FighterState } from '../src/entities/fighterStates.js';

const spawn = { x: 400, y: 600, facing: 1 };

describe('characterFactory', () => {
  it('creates a fighter with the stats of its archetype', () => {
    const fighter = createFighter('guardian', spawn);
    const stats = fighterArchetypes.guardian;

    assert.equal(fighter.name, characters.guardian.name);
    assert.equal(fighter.health, stats.maxHealth);
    assert.equal(fighter.stamina, stats.maxStamina);
    assert.equal(fighter.width, stats.body.width);
    assert.equal(fighter.height, stats.body.height);
  });

  it('creates every character in the data file', () => {
    for (const id of Object.keys(characters)) {
      assert.doesNotThrow(() => createFighter(id, spawn));
    }
  });

  it('throws for an unknown character', () => {
    assert.throws(() => createFighter('nobody', spawn), /Unknown character/);
  });
});

describe('Fighter', () => {
  it('starts idle, on the ground and without intent', () => {
    const fighter = createFighter('guardian', spawn);

    assert.equal(fighter.state, FighterState.IDLE);
    assert.equal(fighter.grounded, true);
    assert.equal(fighter.intent.moveX, 0);
    assert.equal(fighter.intent.jump, false);
  });

  it('computes its body box from the feet position', () => {
    const fighter = createFighter('guardian', spawn);

    assert.equal(fighter.left, spawn.x - fighter.width / 2);
    assert.equal(fighter.right, spawn.x + fighter.width / 2);
    assert.equal(fighter.top, spawn.y - fighter.height);
  });

  it('resets the state time only when the state changes', () => {
    const fighter = createFighter('guardian', spawn);

    fighter.advanceStateTime(0.5);
    fighter.setState(FighterState.IDLE);
    assert.equal(fighter.stateTime, 0.5);

    fighter.setState(FighterState.WALKING);
    assert.equal(fighter.stateTime, 0);
  });

  it('can move only in locomotion states', () => {
    const fighter = createFighter('guardian', spawn);

    fighter.setState(FighterState.JUMPING);
    assert.equal(fighter.canMove, true);

    fighter.setState(FighterState.STUNNED);
    assert.equal(fighter.canMove, false);
  });

  it('clears the intent', () => {
    const fighter = createFighter('guardian', spawn);
    fighter.intent.moveX = 1;
    fighter.intent.jump = true;

    fighter.clearIntent();

    assert.equal(fighter.intent.moveX, 0);
    assert.equal(fighter.intent.jump, false);
  });
});

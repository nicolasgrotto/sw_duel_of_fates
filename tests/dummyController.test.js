import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DummyBehavior, DummyController } from '../src/controllers/DummyController.js';
import { STEP, repeat, spawnFighter } from './helpers.js';

describe('DummyController', () => {
  it('cycles idle, block and attack', () => {
    const dummy = new DummyController({ attackInterval: 1, heavyInterval: [1, 1], approachGap: 40 });

    assert.equal(dummy.behavior, DummyBehavior.IDLE);
    dummy.cycleBehavior();
    assert.equal(dummy.behavior, DummyBehavior.BLOCK);
    dummy.cycleBehavior();
    assert.equal(dummy.behavior, DummyBehavior.ATTACK);
    dummy.cycleBehavior();
    assert.equal(dummy.behavior, DummyBehavior.HEAVY);
    dummy.cycleBehavior();
    assert.equal(dummy.behavior, DummyBehavior.IDLE);
  });

  it('holds block in block mode', () => {
    const dummy = new DummyController({ attackInterval: 1, heavyInterval: [1, 1], approachGap: 40 });
    const fighter = spawnFighter(400);
    dummy.cycleBehavior();

    dummy.updateIntent(fighter.intent, STEP);

    assert.equal(fighter.intent.block, true);
    assert.equal(fighter.intent.lightAttack, false);
  });

  it('attacks once per interval in attack mode', () => {
    const dummy = new DummyController({ attackInterval: 0.5, heavyInterval: [1, 1], approachGap: 40 });
    const fighter = spawnFighter(400);
    dummy.cycleBehavior();
    dummy.cycleBehavior();
    let attacks = 0;

    repeat(65, () => {
      dummy.updateIntent(fighter.intent, STEP);
      attacks += fighter.intent.lightAttack ? 1 : 0;
    });

    assert.equal(attacks, 2);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { tutorialConfig } from '../src/config/tutorialConfig.js';
import { DummyBehavior, DummyController } from '../src/controllers/DummyController.js';
import { ParryChallenge } from '../src/modes/ParryChallenge.js';
import { TutorialDirector } from '../src/modes/TutorialDirector.js';
import { STEP, repeat, spawnFighter } from './helpers.js';

function hit(attacker, defender, attackType) {
  return { type: 'hit', attacker, defender, attackType };
}

describe('TutorialDirector', () => {
  it('finishes the move step after walking both ways', () => {
    const director = new TutorialDirector(tutorialConfig.steps);
    const player = spawnFighter(400, 1);

    player.intent.moveX = 1;
    director.update(STEP, player);
    assert.equal(director.step.id, 'move');

    player.intent.moveX = -1;
    director.update(STEP, player);
    assert.equal(director.step.id, 'light');
  });

  it('counts only the matching events of the player for each step', () => {
    const director = new TutorialDirector(tutorialConfig.steps);
    const player = spawnFighter(400, 1);
    const dummy = spawnFighter(500, -1, 'shadow');
    director.advance();

    director.handleEvents([hit(dummy, player, 'light'), hit(player, dummy, 'heavy')], player);
    assert.equal(director.progress, 0);

    director.handleEvents([hit(player, dummy, 'light'), hit(player, dummy, 'light')], player);
    assert.equal(director.step.id, 'chain');

    director.handleEvents([hit(player, dummy, 'light')], player);
    assert.equal(director.step.id, 'chain');
    director.handleEvents([hit(player, dummy, 'light2')], player);
    assert.equal(director.step.id, 'heavy');
  });

  it('asks the dummy for the behavior of the current step and ends after the last one', () => {
    const director = new TutorialDirector(tutorialConfig.steps);
    const behaviors = [];
    while (!director.isFinished) {
      behaviors.push(director.dummyBehavior);
      director.advance();
    }
    assert.deepEqual(behaviors, tutorialConfig.steps.map((step) => step.dummy));
    assert.equal(director.step, null);
  });
});

describe('ParryChallenge', () => {
  it('scores parries and perfect parries and counts hits taken until the time ends', () => {
    const challenge = new ParryChallenge(tutorialConfig.challenge);
    const player = spawnFighter(400, 1);
    const dummy = spawnFighter(500, -1);

    challenge.handleEvents([
      { type: 'parry', attacker: dummy, defender: player },
      { type: 'perfectParry', attacker: dummy, defender: player },
      hit(dummy, player, 'heavy'),
    ], player);
    assert.equal(challenge.score, 3);
    assert.equal(challenge.hitsTaken, 1);

    challenge.update(tutorialConfig.challenge.duration);
    assert.equal(challenge.isFinished, true);
    challenge.handleEvents([{ type: 'parry', attacker: dummy, defender: player }], player);
    assert.equal(challenge.score, 3);
  });
});

describe('DummyController heavy mode', () => {
  it('walks toward the player and throws heavy attacks at random intervals', () => {
    const dummy = new DummyController({ attackInterval: 1, heavyInterval: [0.5, 0.5], approachGap: 40 }, () => 0.5);
    const self = spawnFighter(800, -1);
    const player = spawnFighter(300, 1);
    dummy.setFighters(self, player);
    dummy.setBehavior(DummyBehavior.HEAVY);
    let heavies = 0;

    repeat(62, () => {
      dummy.updateIntent(self.intent, STEP);
      heavies += self.intent.heavyAttack ? 1 : 0;
    });

    assert.equal(self.intent.moveX, -1);
    assert.equal(heavies, 2);
  });
});

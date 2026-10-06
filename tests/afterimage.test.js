import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { afterimage } from '../src/config/fighterVisualConfig.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { DodgeAfterimage } from '../src/rendering/DodgeAfterimage.js';
import { computePose, createPose } from '../src/rendering/fighterPose.js';
import { spawnFighter } from './helpers.js';

function createRecordingRenderer() {
  const alphas = [];
  const noop = () => {};
  return {
    alphas,
    save: noop,
    restore: noop,
    translate: noop,
    scale: noop,
    rotate: noop,
    polyline: noop,
    fillPolygon: noop,
    fillCircle: noop,
    fillEllipse: noop,
    line: noop,
    setAlpha: (alpha) => alphas.push(alpha),
  };
}

describe('DodgeAfterimage', () => {
  it('records copies only while dodging, one per interval', () => {
    const fighter = spawnFighter(400);
    const pose = computePose(fighter, createPose());
    const trail = new DodgeAfterimage();

    trail.record(fighter, pose);
    assert.equal(trail.newest, -1);

    fighter.restartState(FighterState.DODGING);
    trail.record(fighter, pose);
    fighter.animation.time += afterimage.interval / 2;
    trail.record(fighter, pose);
    assert.equal(trail.newest, 0);

    fighter.animation.time += afterimage.interval;
    fighter.x += 30;
    trail.record(fighter, pose);
    assert.equal(trail.newest, 1);
    assert.equal(trail.samples[0].ghost.x, 400);
    assert.equal(trail.samples[1].ghost.x, 430);
  });

  it('draws fading copies and forgets old ones', () => {
    const fighter = spawnFighter(400);
    const trail = new DodgeAfterimage();
    fighter.restartState(FighterState.DODGING);
    trail.record(fighter, computePose(fighter, createPose()));

    const renderer = createRecordingRenderer();
    trail.draw(renderer, fighter.animation.time + afterimage.duration / 2, 600);
    assert.deepEqual(renderer.alphas, [afterimage.alpha / 2]);

    const later = createRecordingRenderer();
    trail.draw(later, fighter.animation.time + afterimage.duration, 600);
    assert.deepEqual(later.alphas, []);
  });
});

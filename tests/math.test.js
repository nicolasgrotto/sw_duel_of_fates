import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { approach, clamp, degreesToRadians, lerp, smoothTowards } from '../src/utils/math.js';

describe('math', () => {
  it('clamps a value between min and max', () => {
    assert.equal(clamp(5, 0, 3), 3);
    assert.equal(clamp(-1, 0, 3), 0);
    assert.equal(clamp(2, 0, 3), 2);
  });

  it('interpolates between two values', () => {
    assert.equal(lerp(10, 20, 0.25), 12.5);
  });

  it('approaches the target without passing it', () => {
    assert.equal(approach(0, 10, 4), 4);
    assert.equal(approach(8, 10, 4), 10);
    assert.equal(approach(10, 0, 4), 6);
    assert.equal(approach(2, 0, 4), 0);
  });

  it('moves smoothly towards the target', () => {
    const value = smoothTowards(0, 1, 10, 0.1);

    assert.ok(value > 0.5 && value < 1);
    assert.equal(smoothTowards(0, 1, 10, 0), 0);
  });

  it('converts degrees to radians', () => {
    assert.equal(degreesToRadians(180), Math.PI);
  });
});

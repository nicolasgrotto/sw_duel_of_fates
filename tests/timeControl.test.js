import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TimeControl } from '../src/systems/TimeControl.js';
import { STEP, repeat } from './helpers.js';

describe('TimeControl', () => {
  it('passes the time through when nothing is active', () => {
    assert.equal(new TimeControl().scale(STEP), STEP);
  });

  it('freezes the simulation during a hit stop and then releases it', () => {
    const time = new TimeControl();
    time.hitStop(0.05);

    assert.equal(time.scale(STEP), 0);
    assert.equal(time.isFrozen, true);
    repeat(3, () => time.scale(STEP));
    assert.equal(time.scale(STEP), STEP);
  });

  it('keeps the longest hit stop', () => {
    const time = new TimeControl();
    time.hitStop(0.1);
    time.hitStop(0.02);

    assert.equal(time.hitStopTime, 0.1);
  });

  it('slows the simulation down for the given real time', () => {
    const time = new TimeControl();
    time.slowMotion(0.1, 0.3);

    assert.equal(time.scale(STEP), STEP * 0.3);
    repeat(6, () => time.scale(STEP));
    assert.equal(time.scale(STEP), STEP);
  });
});

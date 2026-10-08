import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GameLoop } from '../src/core/GameLoop.js';

const FIXED_STEP = 0.125;
const MAX_FRAME_TIME = 0.5;

function createLoop(overrides = {}) {
  const calls = { updates: [], renders: [] };
  const loop = new GameLoop({
    fixedStep: FIXED_STEP,
    maxFrameTime: MAX_FRAME_TIME,
    update: (dt) => calls.updates.push(dt),
    render: (alpha) => calls.renders.push(alpha),
    ...overrides,
  });
  return { loop, calls };
}

function createFakeClock() {
  const clock = { time: 0, scheduled: null, cancelled: [] };
  clock.now = () => clock.time;
  clock.schedule = (callback) => {
    clock.scheduled = callback;
    return 1;
  };
  clock.cancel = (frameId) => clock.cancelled.push(frameId);
  clock.runFrame = (milliseconds) => {
    clock.time += milliseconds;
    const callback = clock.scheduled;
    clock.scheduled = null;
    callback();
  };
  return clock;
}

describe('GameLoop.advance', () => {
  it('runs one update for each fixed step that fits in the frame', () => {
    const { loop, calls } = createLoop();

    const steps = loop.advance(FIXED_STEP * 3);

    assert.equal(steps, 3);
    assert.deepEqual(calls.updates, [FIXED_STEP, FIXED_STEP, FIXED_STEP]);
  });

  it('keeps the remaining time for the next frame', () => {
    const { loop, calls } = createLoop();

    loop.advance(FIXED_STEP / 2);
    assert.equal(calls.updates.length, 0);

    loop.advance(FIXED_STEP / 2);
    assert.equal(calls.updates.length, 1);
  });

  it('renders once per frame with the interpolation alpha', () => {
    const { loop, calls } = createLoop();

    loop.advance(FIXED_STEP * 1.5);

    assert.deepEqual(calls.renders, [0.5]);
  });

  it('limits the frame time to avoid too many updates', () => {
    const { loop, calls } = createLoop();

    loop.advance(10);

    assert.equal(calls.updates.length, MAX_FRAME_TIME / FIXED_STEP);
  });

  it('ignores negative frame times', () => {
    const { loop, calls } = createLoop();

    loop.advance(-1);

    assert.equal(calls.updates.length, 0);
    assert.equal(loop.accumulator, 0);
  });
});

describe('GameLoop start and stop', () => {
  it('advances using the time between scheduled frames', () => {
    const clock = createFakeClock();
    const { loop, calls } = createLoop(clock);

    loop.start();
    clock.runFrame(FIXED_STEP * 2 * 1000);

    assert.equal(calls.updates.length, 2);
    assert.equal(typeof clock.scheduled, 'function');
  });

  it('cancels the scheduled frame when stopped', () => {
    const clock = createFakeClock();
    const { loop } = createLoop(clock);

    loop.start();
    loop.stop();

    assert.equal(loop.running, false);
    assert.deepEqual(clock.cancelled, [1]);
  });

  it('does nothing when start is called twice', () => {
    const clock = createFakeClock();
    let scheduleCount = 0;
    const { loop } = createLoop({
      ...clock,
      schedule: (callback) => {
        scheduleCount += 1;
        return clock.schedule(callback);
      },
    });

    loop.start();
    loop.start();

    assert.equal(scheduleCount, 1);
  });
});

it('measures update and render cost with the injected clock and preserves fixed dt', () => {
  let time = 0;
  const steps = [];
  const { loop } = createLoop({
    now: () => time, timingSampleFrames: 2,
    update: (dt) => { steps.push(dt); time += 2; },
    render: () => { time += 5; },
  });
  loop.advance(FIXED_STEP * 2);
  loop.advance(0);
  assert.deepEqual(steps, [FIXED_STEP, FIXED_STEP]);
  assert.deepEqual(loop.timings, { updateMs: 2, renderMs: 5 });
});

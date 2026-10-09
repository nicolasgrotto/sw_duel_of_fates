import { it } from 'node:test';
import assert from 'node:assert/strict';
import { RenderInterpolation } from '../src/rendering/RenderInterpolation.js';

function createFighter(overrides = {}) {
  return {
    x: 100, y: 500, state: 'walking', stateTime: 0.5,
    animation: { time: 2, walkPhase: 0.2, walkBlend: 0.5, airBlend: 0 },
    ...overrides,
  };
}

function advance(fighter, { x = fighter.x, y = fighter.y, state = fighter.state, stateTime = fighter.stateTime + 0.1, time = fighter.animation.time + 0.1, walkPhase = fighter.animation.walkPhase }) {
  Object.assign(fighter, { x, y, state, stateTime });
  Object.assign(fighter.animation, { time, walkPhase });
}

it('draws positions and pose clocks between the last two simulation steps', () => {
  const fighter = createFighter();
  const interpolation = new RenderInterpolation({ maxDistance: 60 });
  interpolation.capture([fighter]);
  advance(fighter, { x: 110 });
  interpolation.capture([fighter]);

  interpolation.apply([fighter], 0.25);
  assert.equal(fighter.x, 102.5);
  assert.ok(Math.abs(fighter.stateTime - 0.525) < 1e-9);
  assert.ok(Math.abs(fighter.animation.time - 2.025) < 1e-9);
  interpolation.restore([fighter]);
  assert.equal(fighter.x, 110);
  assert.ok(Math.abs(fighter.stateTime - 0.6) < 1e-9);
});

it('shows the current step across discontinuities', () => {
  const fighter = createFighter();
  const interpolation = new RenderInterpolation({ maxDistance: 60 });
  interpolation.capture([fighter]);
  advance(fighter, { x: 400, state: 'idle', stateTime: 0, time: 0 });
  interpolation.capture([fighter]);

  interpolation.apply([fighter], 0.5);
  assert.equal(fighter.x, 400);
  assert.equal(fighter.stateTime, 0);
  assert.equal(fighter.animation.time, 0);
});

it('wraps the walk phase along the shortest arc', () => {
  const fighter = createFighter({ animation: { time: 1, walkPhase: Math.PI * 2 - 0.1, walkBlend: 1, airBlend: 0 } });
  const interpolation = new RenderInterpolation({ maxDistance: 60 });
  interpolation.capture([fighter]);
  advance(fighter, { walkPhase: 0.1 });
  interpolation.capture([fighter]);

  interpolation.apply([fighter], 0.5);
  assert.ok(Math.abs(fighter.animation.walkPhase) < 1e-9 || Math.abs(fighter.animation.walkPhase - Math.PI * 2) < 1e-9);
});

it('restores every interpolated field exactly', () => {
  const fighter = createFighter();
  const interpolation = new RenderInterpolation({ maxDistance: 60 });
  interpolation.capture([fighter]);
  advance(fighter, { x: 103.3, y: 497.1 });
  interpolation.capture([fighter]);
  const before = JSON.stringify(fighter);

  interpolation.apply([fighter], 0.37);
  interpolation.restore([fighter]);
  assert.equal(JSON.stringify(fighter), before);
});

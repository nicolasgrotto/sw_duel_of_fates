import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DebugOverlay, FpsCounter } from '../src/utils/debug.js';

const layout = { enabled: false, fpsSampleWindow: 1, x: 0, y: 0, width: 100, padding: 0, lineHeight: 10 };

function createFakeRenderer() {
  const texts = [];
  return {
    texts,
    fillRect: () => {},
    text: (content) => texts.push(content),
  };
}

function createFakeStates(...states) {
  return { stack: states };
}

describe('FpsCounter', () => {
  it('measures frames per second over the sample window', () => {
    const counter = new FpsCounter(1);

    for (let frame = 0; frame <= 60; frame += 1) {
      counter.tick(frame * (1000 / 60));
    }

    assert.equal(Math.round(counter.fps), 60);
  });

  it('reports zero before the first window ends', () => {
    const counter = new FpsCounter(1);

    counter.tick(0);
    counter.tick(16);

    assert.equal(counter.fps, 0);
  });
});

describe('DebugOverlay', () => {
  it('draws nothing while disabled', () => {
    const overlay = new DebugOverlay(layout, () => 0);
    const renderer = createFakeRenderer();

    overlay.render(renderer, createFakeStates());

    assert.equal(renderer.texts.length, 0);
  });

  it('shows the state stack and the debug info of each state when enabled', () => {
    const overlay = new DebugOverlay(layout, () => 0);
    const renderer = createFakeRenderer();
    const duel = { name: 'DuelState', getDebugInfo: () => ['duel time: 1.00s'] };
    const pause = { name: 'PauseState', getDebugInfo: () => [] };

    overlay.toggle();
    overlay.render(renderer, createFakeStates(duel, pause));

    assert.deepEqual(renderer.texts, ['fps: 0', 'states: DuelState > PauseState', 'duel time: 1.00s']);
  });
});

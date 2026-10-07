import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { layout } from '../src/config/uiConfig.js';
import { Letterbox } from '../src/ui/Letterbox.js';
import { STEP, repeat } from './helpers.js';

describe('Letterbox', () => {
  it('slides the bars in and out smoothly', () => {
    const letterbox = new Letterbox(layout.letterbox);

    letterbox.setTarget(1);
    letterbox.update(STEP);
    assert.ok(letterbox.amount > 0 && letterbox.amount < 1);

    repeat(60, () => letterbox.update(STEP));
    assert.equal(letterbox.amount, 1);

    letterbox.setTarget(0);
    repeat(60, () => letterbox.update(STEP));
    assert.equal(letterbox.amount, 0);
  });

  it('pulses briefly and then goes back to the target', () => {
    const letterbox = new Letterbox(layout.letterbox);

    letterbox.pulse(0.5, 0.2);
    repeat(10, () => letterbox.update(STEP));
    assert.ok(letterbox.amount > 0 && letterbox.amount <= 0.5);

    repeat(60, () => letterbox.update(STEP));
    assert.equal(letterbox.amount, 0);
  });

  it('draws two bars only while visible', () => {
    const rects = [];
    const renderer = { width: 1280, height: 720, fillRect: (x, y, width, height) => rects.push({ y, height }) };
    const letterbox = new Letterbox(layout.letterbox);

    letterbox.render(renderer);
    assert.equal(rects.length, 0);

    letterbox.amount = 1;
    letterbox.render(renderer);
    assert.deepEqual(rects, [{ y: 0, height: layout.letterbox.height }, { y: 720 - layout.letterbox.height, height: layout.letterbox.height }]);
  });
});

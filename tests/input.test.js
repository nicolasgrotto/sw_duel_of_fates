import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Input } from '../src/core/Input.js';

const bindings = {
  moveLeft: ['KeyA', 'ArrowLeft'],
  jump: ['Space'],
  confirm: ['Enter', 'Space'],
};

function keyEvent(type, code, { repeat = false } = {}) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { code, repeat });
  return event;
}

describe('Input', () => {
  let target;
  let input;

  beforeEach(() => {
    target = new EventTarget();
    input = new Input({ bindings, target });
  });

  function press(code, options) {
    const event = keyEvent('keydown', code, options);
    target.dispatchEvent(event);
    return event;
  }

  function release(code) {
    const event = keyEvent('keyup', code);
    target.dispatchEvent(event);
    return event;
  }

  it('maps a key to its action while the key is held', () => {
    press('KeyA');
    assert.equal(input.isDown('moveLeft'), true);

    release('KeyA');
    assert.equal(input.isDown('moveLeft'), false);
  });

  it('keeps the action down while another key of the same action is held', () => {
    press('KeyA');
    press('ArrowLeft');
    release('KeyA');

    assert.equal(input.isDown('moveLeft'), true);
  });

  it('reports a press only until the end of the frame', () => {
    press('Enter');
    assert.equal(input.wasPressed('confirm'), true);

    input.endFrame();
    assert.equal(input.wasPressed('confirm'), false);
    assert.equal(input.isDown('confirm'), true);
  });

  it('does not report a new press for repeated keydown events', () => {
    press('Enter');
    input.endFrame();
    press('Enter', { repeat: true });

    assert.equal(input.wasPressed('confirm'), false);
  });

  it('triggers every action bound to the same key', () => {
    press('Space');

    assert.equal(input.wasPressed('jump'), true);
    assert.equal(input.wasPressed('confirm'), true);
  });

  it('prevents the default browser action only for bound keys', () => {
    assert.equal(press('ArrowLeft').defaultPrevented, true);
    assert.equal(press('KeyZ').defaultPrevented, false);
  });

  it('returns false for unknown actions', () => {
    assert.equal(input.isDown('fly'), false);
    assert.equal(input.wasPressed('fly'), false);
  });

  it('releases all keys when the window loses focus', () => {
    press('KeyA');
    target.dispatchEvent(new Event('blur'));

    assert.equal(input.isDown('moveLeft'), false);
    assert.equal(input.wasPressed('moveLeft'), false);
  });

  it('stops listening after destroy', () => {
    input.destroy();
    press('KeyA');

    assert.equal(input.isDown('moveLeft'), false);
  });
});

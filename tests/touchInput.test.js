import { it } from 'node:test';
import assert from 'node:assert/strict';
import { TouchInput } from '../src/core/TouchInput.js';
import { Input } from '../src/core/Input.js';
import { keyboardPresets } from '../src/config/controlsConfig.js';

function setup() {
  const target = new EventTarget();
  target.getBoundingClientRect = () => ({ left: 10, top: 20, width: 640, height: 360 });
  const input = new Input({ target, bindings: keyboardPresets.classic });
  const touch = new TouchInput({ target });
  input.addSource(touch);
  touch.setContext('duel');
  const pointer = (type, id, x, y) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerId: id, pointerType: 'touch', clientX: 10 + x / 2, clientY: 20 + y / 2 });
    target.dispatchEvent(event);
  };
  return { target, input, touch, pointer };
}

it('combines joystick and simultaneous guard and attack, releasing fingers independently', () => {
  const { input, pointer } = setup();
  pointer('pointerdown', 1, 150, 600);
  pointer('pointermove', 1, 220, 600);
  pointer('pointerdown', 2, 1100, 630);
  pointer('pointerdown', 3, 1220, 630);
  assert.equal(input.isDown('moveRight'), true);
  assert.equal(input.isDown('block'), true);
  assert.equal(input.wasPressed('lightAttack'), true);
  pointer('pointerup', 3, 1220, 630);
  assert.equal(input.isDown('block'), true);
  pointer('pointercancel', 2, 1100, 630);
  assert.equal(input.isDown('block'), false);
});

it('uses deadzone and dominant vertical threshold and requests EVADE once per gesture', () => {
  const { input, pointer } = setup();
  pointer('pointerdown', 1, 150, 500);
  pointer('pointermove', 1, 160, 510);
  assert.equal(input.isDown('moveRight'), false);
  pointer('pointermove', 1, 230, 550);
  assert.equal(input.wasPressed('evade'), false);
  pointer('pointermove', 1, 155, 570);
  assert.equal(input.wasPressed('evade'), true);
  input.endFrame();
  pointer('pointermove', 1, 155, 580);
  assert.equal(input.wasPressed('evade'), false);
});

it('preserves quick taps, clears on blur and stops listening on destroy', () => {
  const { target, input, touch, pointer } = setup();
  pointer('pointerdown', 1, 1220, 510);
  pointer('pointerup', 1, 1220, 510);
  input.poll();
  assert.equal(input.wasPressed('jump'), true);
  pointer('pointerdown', 2, 1100, 630);
  target.dispatchEvent(new Event('blur'));
  assert.equal(touch.pointers.size, 0);
  assert.equal(input.isDown('block'), false);
  input.destroy();
  pointer('pointerdown', 3, 1100, 630);
  assert.equal(touch.actions.size, 0);
});

it('switches input kind on touch and unbound keyboard activity without duplicate union edges', () => {
  const { target, input, pointer } = setup();
  pointer('pointerdown', 1, 1220, 630);
  input.endFrame();
  const event = new Event('keydown', { cancelable: true });
  Object.assign(event, { code: 'KeyJ', repeat: false });
  target.dispatchEvent(event);
  assert.equal(input.lastInputKind, 'keyboard');
  assert.equal(input.wasPressed('lightAttack'), false);
});

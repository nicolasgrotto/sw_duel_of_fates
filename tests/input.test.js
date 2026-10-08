import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Action, keyboardPresets } from '../src/config/controlsConfig.js';
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

  it('remembers the last pressed key code, bound or not, until the end of the frame', () => {
    press('KeyQ');
    assert.equal(input.lastPressedCode, 'KeyQ');
    press('KeyQ', { repeat: true });
    assert.equal(input.lastPressedCode, 'KeyQ');

    input.endFrame();
    assert.equal(input.lastPressedCode, null);
  });

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

describe('gamepad input', () => {
  function setup() {
    const pad = {
      connected: true, mapping: 'standard', axes: [0, 0],
      buttons: Array.from({ length: 16 }, () => ({ pressed: false })),
    };
    let pads = [pad];
    const target = new EventTarget();
    const input = new Input({ bindings, target, getGamepads: () => pads });
    return { input, pad, target, disconnect: () => { pads = []; } };
  }

  it('turns buttons into held actions and reports only fresh presses', () => {
    const { input, pad } = setup();
    pad.buttons[4].pressed = true;
    pad.buttons[2].pressed = true;
    input.pollGamepads();
    assert.equal(input.isDown('block'), true);
    assert.equal(input.wasPressed('block'), true);
    assert.equal(input.wasPressed('lightAttack'), true);
    input.endFrame();
    input.pollGamepads();
    assert.equal(input.isDown('block'), true);
    assert.equal(input.wasPressed('block'), false);
    pad.buttons[4].pressed = false;
    input.pollGamepads();
    assert.equal(input.isDown('block'), false);
  });

  it('filters stick drift and keeps keyboard movement when a gamepad disconnects', () => {
    const { input, pad, target, disconnect } = setup();
    pad.axes[0] = 0.2;
    input.pollGamepads();
    assert.equal(input.isDown('moveRight'), false);
    pad.axes[0] = 0.8;
    input.pollGamepads();
    assert.equal(input.isDown('moveRight'), true);
    target.dispatchEvent(keyEvent('keydown', 'KeyA'));
    disconnect();
    input.pollGamepads();
    assert.equal(input.isDown('moveRight'), false);
    assert.equal(input.isDown('moveLeft'), true);
  });

  it('releases gamepad actions on blur and ignores polling until focus returns', () => {
    const { input, pad, target } = setup();
    pad.buttons[0].pressed = true;
    input.pollGamepads();
    assert.equal(input.wasPressed('confirm'), true);
    target.dispatchEvent(new Event('blur'));
    input.pollGamepads();
    assert.equal(input.isDown('jump'), false);
    assert.equal(input.wasPressed('confirm'), false);
    target.dispatchEvent(new Event('focus'));
    input.pollGamepads();
    assert.equal(input.isDown('jump'), true);
    input.destroy();
    target.dispatchEvent(new Event('focus'));
    input.pollGamepads();
    assert.equal(input.isDown('jump'), false);
  });

  it('uses reduced vibration and tolerates unavailable or failing hardware', async () => {
    const { input, pad } = setup();
    const effects = [];
    pad.vibrationActuator = { playEffect: (type, recipe) => { effects.push({ type, recipe }); return Promise.resolve(); } };
    input.pollGamepads();
    input.rumble('heavyHit', true);
    assert.equal(effects[0].type, 'dual-rumble');
    assert.equal(effects[0].recipe.strongMagnitude, 0.125);
    pad.vibrationActuator.playEffect = () => Promise.reject(new Error('Disconnected'));
    assert.doesNotThrow(() => input.rumble('hit'));
    await Promise.resolve();
    delete pad.vibrationActuator;
    assert.doesNotThrow(() => input.rumble('hit'));
  });
});

it('switches keyboard presets and releases keys from the previous mapping', () => {
  const target = new EventTarget();
  const input = new Input({ bindings: keyboardPresets.classic, target });
  target.dispatchEvent(keyEvent('keydown', 'KeyJ'));
  assert.equal(input.wasPressed('lightAttack'), true);
  input.setBindings(keyboardPresets.arrows);
  assert.equal(input.isDown('lightAttack'), false);
  assert.equal(input.wasPressed('lightAttack'), false);
  target.dispatchEvent(keyEvent('keydown', 'KeyJ'));
  assert.equal(input.isDown('lightAttack'), false);
  target.dispatchEvent(keyEvent('keydown', 'KeyZ'));
  assert.equal(input.isDown('lightAttack'), true);
  target.dispatchEvent(keyEvent('keydown', 'KeyC'));
  assert.equal(input.isDown('block'), true);
  assert.equal(input.wasPressed('block'), true);
});

describe('Input gamepad slots', () => {
  it('reads the second connected standard gamepad when its slot is 1', () => {
    const pad = (pressedIndex) => ({
      connected: true,
      mapping: 'standard',
      axes: [0, 0],
      buttons: Array.from({ length: 16 }, (_, index) => ({ pressed: index === pressedIndex })),
    });
    const target = new EventTarget();
    const pads = [pad(2), pad(3)];
    const first = new Input({ bindings: {}, target, getGamepads: () => pads });
    const second = new Input({ bindings: {}, target, getGamepads: () => pads, gamepadSlot: 1 });

    first.pollGamepads();
    second.pollGamepads();

    assert.equal(first.wasPressed(Action.LIGHT_ATTACK), true);
    assert.equal(second.wasPressed(Action.HEAVY_ATTACK), true);
    assert.equal(second.wasPressed(Action.LIGHT_ATTACK), false);
  });
});

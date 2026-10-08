import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { keyBindings, remappableActions } from '../src/config/controlsConfig.js';
import { assignKey, createCustomBindings, sanitizeCustomBindings } from '../src/core/keyBindings.js';

describe('key remapping', () => {
  it('assigns a free key to an action and keeps the other actions', () => {
    const custom = assignKey(keyBindings, remappableActions, 'lightAttack', 'KeyU');
    const bindings = createCustomBindings(keyBindings, custom, remappableActions);

    assert.deepEqual(bindings.lightAttack, ['KeyU']);
    assert.deepEqual(bindings.heavyAttack, keyBindings.heavyAttack);
    assert.deepEqual(bindings.confirm, keyBindings.confirm);
  });

  it('swaps keys when the new key already belongs to another action', () => {
    const custom = assignKey(keyBindings, remappableActions, 'lightAttack', 'KeyK');

    assert.deepEqual(custom.lightAttack, ['KeyK']);
    assert.deepEqual(custom.heavyAttack, ['KeyJ']);
  });

  it('drops anything invalid read from storage', () => {
    const custom = sanitizeCustomBindings({ lightAttack: ['KeyU'], block: 'KeyL', jump: [], unknown: ['KeyZ'] }, remappableActions);

    assert.deepEqual(custom, { lightAttack: ['KeyU'] });
    assert.deepEqual(sanitizeCustomBindings(null, remappableActions), {});
  });
});

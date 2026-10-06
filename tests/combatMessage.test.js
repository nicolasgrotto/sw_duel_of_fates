import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { layout } from '../src/config/uiConfig.js';
import { CombatMessage } from '../src/ui/CombatMessage.js';

describe('CombatMessage', () => {
  it('fades in, stays and fades out', () => {
    const message = new CombatMessage();
    const { fadeTime } = layout.messages;
    message.show('DUELO', 1);

    assert.equal(message.alpha, 0);
    message.update(fadeTime / 2);
    assert.equal(message.alpha, 0.5);
    message.update(0.3);
    assert.equal(message.alpha, 1);
    message.update(1);
    assert.equal(message.isVisible, false);
    assert.equal(message.alpha, 0);
  });
});

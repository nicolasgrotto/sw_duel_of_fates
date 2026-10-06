import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Action, keyBindings } from '../src/config/controlsConfig.js';
import { formatText } from '../src/ui/formatText.js';
import { formatActionKeys, formatKey, formatKeys } from '../src/ui/keyLabels.js';
import { MenuList } from '../src/ui/MenuList.js';

function createFakeInput(pressed = []) {
  return { wasPressed: (action) => pressed.includes(action), isDown: () => false };
}

function createMenu() {
  return new MenuList(
    [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ],
    { firstItemY: 100, itemSpacing: 50 },
  );
}

describe('formatText', () => {
  it('replaces known placeholders and keeps unknown ones', () => {
    assert.equal(formatText('{name} venceu em {time} s {x}', { name: 'Sombra', time: 12 }), 'Sombra venceu em 12 s {x}');
  });
});

describe('keyLabels', () => {
  it('formats letters, arrows and special keys', () => {
    assert.equal(formatKey('KeyJ'), 'J');
    assert.equal(formatKey('ArrowLeft'), '←');
    assert.equal(formatKey('Space'), 'Espaço');
    assert.equal(formatKey('Digit3'), '3');
    assert.equal(formatKey('F3'), 'F3');
  });

  it('removes duplicated and hidden labels', () => {
    assert.equal(formatKeys(['ShiftLeft', 'ShiftRight']), 'Shift');
    assert.equal(formatKeys(['Enter', 'NumpadEnter']), 'Enter');
  });

  it('builds the label from the real key bindings', () => {
    assert.equal(formatActionKeys(keyBindings, Action.LIGHT_ATTACK), 'J');
    assert.equal(formatActionKeys(keyBindings, Action.MOVE_LEFT), 'A / ←');
  });
});

describe('MenuList', () => {
  it('moves the selection and wraps around', () => {
    const menu = createMenu();

    menu.update(createFakeInput([Action.MENU_UP]));
    assert.equal(menu.selected.id, 'c');

    menu.update(createFakeInput([Action.MENU_DOWN]));
    menu.update(createFakeInput([Action.MENU_DOWN]));
    assert.equal(menu.selected.id, 'b');
  });

  it('returns the selected id only on confirm', () => {
    const menu = createMenu();

    assert.equal(menu.update(createFakeInput()), null);
    assert.equal(menu.update(createFakeInput([Action.CONFIRM])), 'a');
  });

  it('draws every item and a marker only for the selected one', () => {
    const menu = createMenu();
    const texts = [];
    const lines = [];
    const renderer = {
      text: (content) => texts.push(content),
      line: (...args) => lines.push(args),
      measureText: () => 20,
    };

    menu.render(renderer, 640);

    assert.deepEqual(texts, ['A', 'B', 'C']);
    assert.equal(lines.length, 1);
  });
});

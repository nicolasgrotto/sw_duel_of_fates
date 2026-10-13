import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { characters } from '../src/characters/characterData.js';
import { keyBindings } from '../src/config/controlsConfig.js';
import { buildMoveList, countLightChain } from '../src/ui/moveList.js';
import { resolveCharacterVariant } from '../src/characters/variants.js';
import { Action } from '../src/config/controlsConfig.js';
import { formatActionKeys } from '../src/ui/keyLabels.js';
import { keyComboSeparator, texts } from '../src/config/uiConfig.js';

describe('move list', () => {
  it('counts the light chain from the move data', () => {
    assert.equal(countLightChain(characters.guardian.moves), 2);
    assert.equal(countLightChain(characters.shadow.moves), 3);
    assert.equal(countLightChain(characters.wasp.moves), 5);
  });

  it('lists the moves with keys from the active bindings and the character ability', () => {
    const rows = buildMoveList(characters.wasp, keyBindings);

    assert.ok(rows[0].label.includes('5'));
    assert.equal(rows[0].keys, 'J');
    assert.equal(rows.find((row) => row.label === characters.wasp.info.ability).keys, 'I');
    assert.ok(rows.some((row) => row.keys === 'L  +  J'));
  });

  it('shows the fourth power on the Power + Ability chord in both variants', () => {
    const chord = [Action.POWER, Action.SPECIAL].map((action) => formatActionKeys(keyBindings, action)).join(keyComboSeparator);
    for (const variant of ['aurora', 'eclipse']) {
      const { character } = resolveCharacterVariant(characters.foretold, variant);
      const name = texts.powers[character.loadout.powers.fourth];
      const row = buildMoveList(character, keyBindings, true).find((entry) => entry.label.includes(name));
      assert.equal(row.keys, chord, variant);
    }
  });
});

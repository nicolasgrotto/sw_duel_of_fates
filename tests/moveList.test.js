import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { characters } from '../src/characters/characterData.js';
import { keyBindings } from '../src/config/controlsConfig.js';
import { buildMoveList, countLightChain } from '../src/ui/moveList.js';

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
});

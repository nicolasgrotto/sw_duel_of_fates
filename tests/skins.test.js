import { it } from 'node:test';
import assert from 'node:assert/strict';
import { characters } from '../src/characters/characterData.js';
import { createFighter } from '../src/characters/characterFactory.js';
import { resolveAppearance } from '../src/characters/skins.js';
import { getSkinOptions } from '../src/modes/unlocks.js';

it('applies only cosmetic overrides without mutating data or overriding the blade', () => {
  const character = { appearance: { cloakColor: 'original', saberColor: 'blade', hoodUp: false, bladeLength: 92 }, skins: [{ id: 'test', appearance: { hoodUp: true, saberColor: 'wrong', bladeLength: 500 } }] };
  assert.deepEqual(resolveAppearance(character, 'test'), { ...character.appearance, hoodUp: true });
  assert.deepEqual(resolveAppearance(character, 'unknown'), character.appearance);
  assert.equal(character.appearance.hoodUp, false);
});

it('keeps stats and moves identical across every roster skin, with blade overrides applied last', () => {
  const spawn = { x: 100, y: 600, facing: 1 };
  for (const character of Object.values(characters).filter((character) => character.selectable || character.secret)) {
    assert.equal(character.skins.length, character.secret ? 2 : 3);
    const base = createFighter(character.id, spawn);
    for (const skin of character.skins) {
      const fighter = createFighter(character.id, spawn, { skin: skin.id, saberColor: 'custom-blade' });
      assert.deepEqual(fighter.stats, base.stats);
      assert.equal(fighter.appearance.saberColor, 'custom-blade');
      assert.equal(base.appearance.saberColor, character.appearance.saberColor);
    }
  }
});

it('separates skin ids from color challenges and honors old Arcade clears', () => {
  const options = getSkinOptions(characters.guardian, { unlocks: { guardian: ['challenge'] } });
  assert.deepEqual(options.map((skin) => skin.unlocked), [true, false, false]);
  assert.deepEqual(getSkinOptions(characters.guardian, { arcadeCleared: ['guardian'], unlocks: { guardian: ['skin-story'] } }).map((skin) => skin.unlocked), [true, true, true]);
});

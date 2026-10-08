import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { characters } from '../src/characters/characterData.js';
import { createFighter } from '../src/characters/characterFactory.js';
import { addUnlocks, findChallengeUnlocks, getSaberOptions } from '../src/modes/unlocks.js';

describe('saber color unlocks', () => {
  it('starts with only the default color and unlocks the arcade color after clearing it', () => {
    const guardian = characters.guardian;
    const locked = getSaberOptions(guardian, { arcadeCleared: [], unlocks: {} });
    assert.deepEqual(locked.map((option) => option.unlocked), [true, false, false]);

    const cleared = getSaberOptions(guardian, { arcadeCleared: ['guardian'], unlocks: {} });
    assert.deepEqual(cleared.map((option) => option.unlocked), [true, true, false]);
  });

  it('unlocks the challenge color only when the stat reaches the target', () => {
    const wasp = characters.wasp;
    const settings = { arcadeCleared: [], unlocks: {} };

    assert.deepEqual(findChallengeUnlocks(wasp, { longestChain: 4 }, settings), []);
    const unlocked = findChallengeUnlocks(wasp, { longestChain: 5 }, settings);
    assert.deepEqual(unlocked.map((alt) => alt.id), ['challenge']);

    settings.unlocks = addUnlocks(settings.unlocks, 'wasp', unlocked);
    assert.deepEqual(settings.unlocks, { wasp: ['challenge'] });
    assert.deepEqual(findChallengeUnlocks(wasp, { longestChain: 5 }, settings), []);
  });

  it('gives every selectable character two alternative colors with a reachable challenge', () => {
    for (const character of Object.values(characters).filter((entry) => entry.selectable)) {
      assert.equal(character.altSaberColors.length, 2, character.id);
      assert.ok(character.altSaberColors.some((alt) => alt.challenge?.target > 0), character.id);
      assert.ok(character.info.saberName, character.id);
    }
  });

  it('creates a fighter with a chosen saber color without touching the shared character data', () => {
    const fighter = createFighter('guardian', { x: 0, y: 0, facing: 1 }, { saberColor: '#3fffc8' });

    assert.equal(fighter.appearance.saberColor, '#3fffc8');
    assert.equal(characters.guardian.appearance.saberColor, '#7fe4ff');
  });
});

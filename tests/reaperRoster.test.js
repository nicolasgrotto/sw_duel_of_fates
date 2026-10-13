import { it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { characters } from '../src/characters/characterData.js';
import { gameConfig } from '../src/config/gameConfig.js';
import { CharacterSelectState } from '../src/states/CharacterSelectState.js';
import { DuelMode } from '../src/states/duelModes.js';
import { galleryCasters, sanitizeGallery } from '../src/modes/galleryCatalog.js';
import { createArcadeRun } from '../src/modes/arcade.js';
import { createSurvivalRun, getSurvivalStage } from '../src/modes/survival.js';

const roster = Object.keys(characters).filter(id => characters[id].selectable);

for (const mode of [DuelMode.VERSUS, DuelMode.TRAINING, DuelMode.LOCAL, DuelMode.ARCADE, DuelMode.SURVIVAL]) {
  it(`selects the reaper without an unlock in ${mode}`, () => {
    let result;
    const game = { settings: { unlockedCharacters: [] }, audio: { play() {} }, input: {},
      changeState: (id, params) => { result = params; } };
    const state = new CharacterSelectState(game, { mode });
    state.enter();
    assert.ok(state.rosterIds.includes('reaper'));
    assert.ok(state.characterIds.includes('reaper'));
    assert.equal(state.previews.get('reaper').id, 'reaper');
    state.choose('reaper');
    if (mode === DuelMode.ARCADE) assert.equal(result.arcade.playerCharacter, 'reaper');
    else if (mode === DuelMode.SURVIVAL) assert.equal(result.survival.playerCharacter, 'reaper');
    else {
      state.choose('guardian');
      state.choose(gameConfig.duel.arenaOrder[0]);
      assert.equal(result.playerCharacter, 'reaper');
      assert.equal(result.opponentCharacter, 'guardian');
      assert.equal(result.mode, mode);
    }
  });
}

it('covers every common character as an Arcade opponent while retaining the six-fight limit', () => {
  const opponents = new Set();
  for (const player of roster) {
    const run = createArcadeRun(player, roster, gameConfig.arcade);
    assert.equal(run.ladder.length, gameConfig.arcade.maxOpponents + 1);
    assert.equal(run.ladder.at(-1), gameConfig.arcade.boss);
    assert.equal(new Set(run.ladder).size, run.ladder.length);
    assert.ok(!run.ladder.includes(player));
    run.ladder.slice(0, -1).forEach(id => opponents.add(id));
  }
  assert.deepEqual([...opponents].sort(), roster.toSorted());
});

it('includes the reaper in the seeded Survival opponent pool and Gallery caster save', () => {
  const opponents = new Set();
  for (let seed = 1; seed <= 100; seed++) {
    const run = createSurvivalRun('guardian', null, seed);
    opponents.add(getSurvivalStage(run, roster, gameConfig.survival, gameConfig.duel.arenaOrder).opponentCharacter);
  }
  assert.ok(opponents.has('reaper'));
  assert.ok(galleryCasters.includes('reaper'));
  assert.equal(sanitizeGallery({ caster: 'reaper' }).caster, 'reaper');
});

it('runs the reaper simulator with base powers and configurable attributes', () => {
  const output = execFileSync(process.execPath, ['tools/simulate.js', '--left', 'reaper', '--right', 'guardian',
    '--duels', '1', '--maxSeconds', '0.1', '--rules', 'powers', '--set', 'attributes.reaper.blade=7'], { encoding: 'utf8' });
  assert.match(output, /reaper/);
  assert.match(output, /attributes.reaper.blade=7/);
});

it('includes the reaper in the matrix with its own AI profile', () => {
  const output = execFileSync(process.execPath, ['tools/matrix.js', '--characters', 'reaper,guardian',
    '--duels', '1', '--difficulties', 'normal'], { encoding: 'utf8' });
  assert.match(output, /own profiles/);
  assert.match(output, /^reaper\s+/m);
  assert.match(output, /^guardian\s+/m);
});

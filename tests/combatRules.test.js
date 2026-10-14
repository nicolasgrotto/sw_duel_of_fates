import { it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { resolveCombatRules } from '../src/config/combatRulesConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { storyConfig } from '../src/config/storyConfig.js';
import { createDuelRules, DuelMode } from '../src/states/duelModes.js';

it('enables combat capabilities only in their approved modes', () => {
  for (const mode of Object.values(DuelMode)) {
    const rules = createDuelRules(mode, {}, powersConfig.modes);
    const enabled = ['versus', 'local', 'training'].includes(mode);
    const taught = enabled || mode === 'tutorial' || mode === 'drill';
    assert.equal(rules.exhaustion, taught);
    assert.equal(rules.wounds, taught);
    assert.equal(rules.focusEvade, enabled || mode === 'gallery');
    assert.equal(rules.bladeLock, taught);
    assert.equal(rules.finishers, taught || ['arcade', 'survival'].includes(mode));
  }
  assert.deepEqual(resolveCombatRules(storyConfig.rules), {
    powers: true, exhaustion: true, wounds: true, focusEvade: true, bladeLock: true, finishers: true,
    bladeLockRhythm: false,
  });
});

it('requires powers only for automatic focus evasion', () => {
  assert.deepEqual(createDuelRules('versus', { powers: false }, powersConfig.modes), {
    powers: false, exhaustion: true, wounds: true, focusEvade: false, bladeLock: true, finishers: true,
    bladeLockRhythm: false,
  });
  assert.deepEqual(resolveCombatRules(), {
    powers: false, exhaustion: false, wounds: false, focusEvade: false, bladeLock: false, finishers: false,
    bladeLockRhythm: false,
  });
});

it('accepts the complete combat capability list in the simulator', () => {
  const output = execFileSync(process.execPath, ['tools/simulate.js', '--duels', '1', '--maxSeconds', '0.1', '--rules', 'powers,exhaustion,wounds,focusEvade,bladeLock'], { encoding: 'utf8' });
  assert.match(output, /rules: powers,exhaustion,wounds,focusEvade,bladeLock/);
});

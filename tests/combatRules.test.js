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
    const taught = enabled || mode === 'tutorial';
    assert.equal(rules.exhaustion, taught);
    assert.equal(rules.wounds, taught);
    assert.equal(rules.focusEvade, enabled);
    assert.equal(rules.bladeLock, taught);
  }
  assert.equal(storyConfig.rules.exhaustion, false);
  assert.equal(storyConfig.rules.wounds, false);
  assert.equal(storyConfig.rules.focusEvade, false);
  assert.equal(storyConfig.rules.bladeLock, false);
});

it('requires powers only for automatic focus evasion', () => {
  assert.deepEqual(createDuelRules('versus', { powers: false }, powersConfig.modes), {
    powers: false, exhaustion: true, wounds: true, focusEvade: false, bladeLock: true,
  });
  assert.deepEqual(resolveCombatRules(), {
    powers: false, exhaustion: false, wounds: false, focusEvade: false, bladeLock: false,
  });
});

it('accepts the complete combat capability list in the simulator', () => {
  const output = execFileSync(process.execPath, ['tools/simulate.js', '--duels', '1', '--maxSeconds', '0.1', '--rules', 'powers,exhaustion,wounds,focusEvade,bladeLock'], { encoding: 'utf8' });
  assert.match(output, /rules: powers,exhaustion,wounds,focusEvade,bladeLock/);
});

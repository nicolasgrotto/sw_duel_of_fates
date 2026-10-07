import { it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

it('reports hits received by the loser separately from hits by both fighters', () => {
  const output = execFileSync(process.execPath, [
    'tools/simulate.js', '--duels', '12', '--difficulty', 'easy', '--profile', 'balanced',
    '--set', 'fighters.guardian.maxHealth=1', '--set', 'fighters.shadow.maxHealth=1',
  ], { encoding: 'utf8' });
  assert.match(output, /timeouts[ ]*: +0 /);
  assert.match(output, /avg hits to KO: 1\.0/);
  assert.match(output, /avg hits  : 1\.0/);
});

import { it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

it('reports hits received by the loser separately from hits by both fighters', () => {
  const output = execFileSync(process.execPath, [
    'tools/simulate.js', '--duels', '12', '--difficulty', 'easy', '--profile', 'balanced',
    '--set', 'attributeBases.guardian.maxHealth=1', '--set', 'attributeBases.shadow.maxHealth=1',
  ], { encoding: 'utf8' });
  assert.match(output, /timeouts[ ]*: +0 /);
  assert.match(output, /avg hits to KO: 1\.0/);
  assert.match(output, /avg hits  : 1\.0/);
});

it('applies attribute overrides before creating fighters in the simulator', () => {
  const output = execFileSync(process.execPath, ['tools/simulate.js', '--duels', '2', '--set', 'attributes.guardian.health=9', '--set', 'attributes.shadow.agility=1'], { encoding: 'utf8' });
  assert.match(output, /attributes.guardian.health=9/);
  assert.match(output, /Duels: 2/);
  assert.throws(() => execFileSync(process.execPath, ['tools/simulate.js', '--duels', '1', '--set', 'attributes.guardian.health=10'], { stdio: 'pipe' }));
});

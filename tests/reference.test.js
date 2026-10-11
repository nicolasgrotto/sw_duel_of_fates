import { it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

it('keeps classic scenarios identical to the v2 reference digests', () => {
  const output = execFileSync(process.execPath, ['tools/reference.js', '--check', 'tools/reference-v2.json', '--only', 'classic/normal/guardian-shadow'], { encoding: 'utf8' });
  assert.match(output, /2 scenarios, 0 changed, 0 missing/);
});

it('keeps a story scenario identical to the approved reference digest', () => {
  const output = execFileSync(process.execPath, ['tools/reference.js', '--check', 'tools/reference-v2.json', '--only', 'story/easy/light'], { encoding: 'utf8' });
  assert.match(output, /1 scenarios, 0 changed, 0 missing/);
});

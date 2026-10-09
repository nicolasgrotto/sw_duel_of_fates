import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { characters } from '../src/characters/characterData.js';

const SIMULATOR = fileURLToPath(new URL('./simulate.js', import.meta.url));
const run = promisify(execFile);
const DIFFICULTIES = ['normal', 'hard'];
const RULE_SETS = [
  { rules: '', duels: 20 },
  { rules: 'powers', duels: 60 },
];
const STORY_DIFFICULTIES = ['easy', 'normal', 'hard'];
const STORY_ALIGNMENTS = ['light', 'dark'];
const STORY_BOSS = 'sovereign';

function readOptions(argv) {
  const options = { write: '', check: '', out: '', only: '' };
  for (let i = 0; i < argv.length; i += 2) {
    const name = argv[i].replace(/^--/, '');
    if (name in options) {
      options[name] = argv[i + 1];
    }
  }
  return options;
}

function createScenarios() {
  const ids = Object.keys(characters);
  const scenarios = [];
  for (const { rules, duels } of RULE_SETS) {
    for (const difficulty of DIFFICULTIES) {
      for (const left of ids) {
        for (const right of ids) {
          if (left !== right) {
            scenarios.push({ key: `${rules || 'classic'}/${difficulty}/${left}-${right}`, args: { duels, difficulty, left, right, rules } });
          }
        }
      }
    }
  }
  for (const difficulty of STORY_DIFFICULTIES) {
    for (const alignment of STORY_ALIGNMENTS) {
      const left = `protagonist:${difficulty}:${alignment}:technique`;
      scenarios.push({ key: `story/${difficulty}/${alignment}-${STORY_BOSS}`, args: { duels: 60, difficulty, left, right: STORY_BOSS, rules: 'powers' } });
    }
  }
  return scenarios;
}

function toArgs({ duels, difficulty, left, right, rules }) {
  const args = [SIMULATOR, '--duels', String(duels), '--difficulty', difficulty, '--left', left, '--right', right];
  return rules ? [...args, '--rules', rules] : args;
}

async function runAll(scenarios, outDir) {
  const digests = {};
  let next = 0;
  const worker = async () => {
    while (next < scenarios.length) {
      const scenario = scenarios[next];
      next += 1;
      const { stdout } = await run(process.execPath, toArgs(scenario.args), { encoding: 'utf8' });
      digests[scenario.key] = createHash('sha256').update(stdout).digest('hex').slice(0, 16);
      if (outDir) {
        writeFileSync(join(outDir, `${scenario.key.replaceAll('/', '_').replaceAll(':', '-')}.txt`), stdout);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, availableParallelism()) }, worker));
  return Object.fromEntries(scenarios.map(({ key }) => [key, digests[key]]));
}

function compare(expected, actual) {
  const changed = Object.keys(actual).filter((key) => expected.scenarios[key] !== actual[key]);
  const missing = Object.keys(expected.scenarios).filter((key) => !(key in actual));
  for (const key of changed) console.log(`changed: ${key}`);
  for (const key of missing) console.log(`missing: ${key}`);
  console.log(`${Object.keys(actual).length} scenarios, ${changed.length} changed, ${missing.length} missing`);
  return changed.length === 0 && missing.length === 0;
}

async function main() {
  const options = readOptions(process.argv.slice(2));
  const scenarios = createScenarios().filter(({ key }) => !options.only || key.startsWith(options.only));
  if (options.out) {
    mkdirSync(options.out, { recursive: true });
  }
  const digests = await runAll(scenarios, options.out);
  if (options.write) {
    writeFileSync(options.write, `${JSON.stringify({ node: process.version, scenarios: digests }, null, 2)}\n`);
    console.log(`${scenarios.length} scenarios written to ${options.write}`);
  }
  if (options.check) {
    const expected = JSON.parse(readFileSync(options.check, 'utf8'));
    if (!compare(expected, digests)) {
      process.exitCode = 1;
    }
  }
}

await main();

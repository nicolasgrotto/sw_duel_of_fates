import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { characters } from '../src/characters/characterData.js';

const SIMULATOR = fileURLToPath(new URL('./simulate.js', import.meta.url));
const WIN_RATE = /\(([\d.]+)%\)/;

function readOptions(argv) {
  const options = { difficulties: 'normal,hard', duels: '60', characters: '', rules: '' };
  for (let i = 0; i < argv.length; i += 2) {
    const name = argv[i].replace(/^--/, '');
    if (name in options) {
      options[name] = argv[i + 1];
    }
  }
  return options;
}

function runPair(left, right, difficulty, duels, rules) {
  const args = [SIMULATOR, '--duels', duels, '--difficulty', difficulty, '--left', left, '--right', right];
  if (rules) {
    args.push('--rules', rules);
  }
  const output = execFileSync(process.execPath, args, { encoding: 'utf8' });
  return Number(output.split('\n')[1].match(WIN_RATE)[1]);
}

function printMatrix(ids, difficulty, duels, rules) {
  console.log(`== ${difficulty} (own profiles, ${duels} duels per pair${rules ? `, rules ${rules}` : ''})`);
  console.log(' '.repeat(10) + ids.map((id) => id.slice(0, 5).padStart(6)).join('') + '    avg');
  for (const left of ids) {
    const row = ids.map((right) => (left === right ? null : runPair(left, right, difficulty, duels, rules)));
    const values = row.filter((value) => value !== null);
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    const cells = row.map((value) => (value === null ? '--' : value.toFixed(0)).padStart(6)).join('');
    console.log(left.padEnd(10) + cells + average.toFixed(1).padStart(7));
  }
}

const options = readOptions(process.argv.slice(2));
const ids = options.characters
  ? options.characters.split(',')
  : Object.keys(characters).filter((id) => characters[id].selectable);
for (const difficulty of options.difficulties.split(',')) {
  printMatrix(ids, difficulty, options.duels, options.rules);
}

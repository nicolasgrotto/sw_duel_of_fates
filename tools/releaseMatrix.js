import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { runDuel } from './simulate.js';
import { characters } from '../src/characters/characterData.js';
import { createProtagonistCharacter } from '../src/characters/protagonist.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { resolveCombatRules } from '../src/config/combatRulesConfig.js';
import { storyConfig } from '../src/config/storyConfig.js';
import { createStoryRun, getStoryStage, raiseAttribute, resolveStoryResult, setLoadoutPower } from '../src/modes/story/storyRun.js';
import { createRandom } from '../src/utils/random.js';

const options = { suite: 'roster', duels: 60, seeds: '1,2', out: '', heronBlade: 0, powers: 'on', targets: '', ratings: '', encounters: '' };
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index].replace(/^--/, '');
  if (!(key in options)) throw new Error(`Unknown option: ${key}`);
  options[key] = typeof options[key] === 'number' ? Number(process.argv[index + 1]) : process.argv[index + 1];
}
if (!Number.isInteger(options.duels) || options.duels < 1) throw new Error('duels must be a positive integer');
if (!['on', 'off'].includes(options.powers)) throw new Error('powers must be on or off');
if (options.heronBlade && (!Number.isInteger(options.heronBlade) || options.heronBlade < 1 || options.heronBlade > 7)) throw new Error('heronBlade must be between 1 and 7');
for (const id of options.targets.split(',').filter(Boolean)) {
  if (!characters[id]?.selectable || characters[id].secret) throw new Error(`Unknown roster target: ${id}`);
}
for (const id of options.encounters.split(',').filter(Boolean)) {
  if (!storyConfig.encounters.some(encounter => encounter.id === id)) throw new Error(`Unknown encounter: ${id}`);
}
const seeds = options.seeds.split(',').map(Number);
if (!seeds.length || seeds.some(seed => !Number.isInteger(seed))) throw new Error('seeds must be integers');
if (options.heronBlade) characters.heron.attributes.blade = options.heronBlade;
for (const assignment of options.ratings.split(',').filter(Boolean)) {
  const [path, value] = assignment.split('=');
  const [id, attribute] = path.split('.');
  if (!characters[id] || !(attribute in characters[id].attributes)) throw new Error(`Unknown rating: ${path}`);
  const rating = Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 7 + (characters[id].potential ?? 0)) throw new Error(`Invalid rating: ${assignment}`);
  characters[id].attributes[attribute] = rating;
}
const rules = resolveCombatRules({ powers: options.powers === 'on', exhaustion: true, wounds: true, focusEvade: true, bladeLock: true, finishers: true });
const roster = Object.values(characters).filter(character => character.selectable && !character.secret);
const records = [];

function measure(left, right, seed, metadata = {}) {
  const random = createRandom(seed);
  const wins = { A: 0, B: 0 };
  let timeouts = 0;
  let doubleKnockouts = 0;
  let secretAccess = 0;
  let time = 0;
  let hitsToKnockout = 0;
  const counts = {};
  for (let index = 0; index < options.duels; index += 1) {
    const result = runDuel(...(index % 2 ? [right, left] : [left, right]), random, rules, 120);
    if (result.winnerSide) wins[result.winnerSide] += 1;
    timeouts += Number(result.ending === 'timeout');
    doubleKnockouts += Number(result.ending === 'doubleKnockout');
    secretAccess += Number(result.winnerSide === 'A' && result.healthRatios.A > 0.75);
    time += result.time;
    hitsToKnockout += result.hitsToKnockout ?? 0;
    for (const [key, value] of Object.entries(result.counts)) counts[key] = (counts[key] ?? 0) + value;
  }
  const record = { ...metadata, left: left.characterId, right: right.characterId, variant: right.variant ?? left.variant ?? null, leftDifficulty: left.difficulty, rightDifficulty: right.difficulty, seed, duels: options.duels, wins, timeouts, doubleKnockouts, secretAccess, meanTime: time / options.duels, meanHitsToKnockout: hitsToKnockout / Math.max(1, wins.A + wins.B), counts };
  records.push(record);
  return record;
}

function setup(characterId, side, difficulty, variant) {
  return { characterId, side, difficulty, variant };
}

function runRoster() {
  for (const seed of seeds) {
    for (const difficulty of ['normal', 'hard']) {
      for (const left of roster) {
        if (options.suite === 'heron' && left.id !== 'heron') continue;
        if (options.targets && !options.targets.split(',').includes(left.id)) continue;
        const rows = [];
        for (const right of roster) {
          if (left.id === right.id) continue;
          rows.push(measure(setup(left.id, 'A', difficulty), setup(right.id, 'B', difficulty), seed));
        }
        const rate = rows.reduce((sum, row) => sum + row.wins.A / row.duels, 0) / rows.length;
        console.log(`${seed} ${difficulty} ${left.id}: ${(rate * 100).toFixed(2)}%`);
      }
    }
  }
}

function runSecrets() {
  for (const seed of seeds) {
    for (const difficulty of ['normal', 'hard']) {
      for (const [id, variant] of [['elder'], ['sovereign'], ['foretold', 'aurora'], ['foretold', 'eclipse']]) {
        for (const opponent of roster) {
          measure(setup(id, 'A', difficulty, variant), setup(opponent.id, 'B', difficulty), seed, { group: id + (variant ? `.${variant}` : '') });
          measure(setup(opponent.id, 'A', difficulty), setup(id, 'B', difficulty, variant), seed, { group: id + (variant ? `.${variant}` : '') });
        }
      }
    }
  }
  for (const seed of seeds) {
    for (const difficulty of ['normal', 'hard']) {
      const left = setup('foretold', 'A', difficulty, 'aurora');
      const right = setup('foretold', 'B', difficulty, 'eclipse');
      measure(left, right, seed, { group: 'variants' });
      measure({ ...right, side: 'A' }, { ...left, side: 'B' }, seed, { group: 'variants' });
    }
  }
}

const BUILDS = {
  balanced: ['flow', 'blade', 'health', 'agility', 'defense', 'stamina'],
  blade: ['blade', 'health', 'stamina', 'defense', 'agility', 'flow'],
  flow: ['flow', 'stamina', 'health', 'defense', 'agility', 'blade'],
};
const LOADOUTS = { light: ['push', 'throw', 'focus'], dark: ['lightning', 'wrath', 'freeze'] };

function invest(run, build) {
  const names = BUILDS[build];
  while (run.points > 0) {
    const previous = run;
    for (const name of names) {
      run = raiseAttribute(run, name, storyConfig);
      if (build !== 'balanced' && run !== previous) break;
    }
    if (run === previous) break;
  }
  if (build !== 'balanced') {
    for (const [index, power] of LOADOUTS[run.protagonist.alignment].entries()) {
      run = setLoadoutPower(run, storyConfig.slotOrder[index], power, storyConfig);
    }
  }
  return run;
}

function runStory() {
  for (const seed of seeds) {
    for (const difficulty of storyConfig.difficulties) {
      for (const alignment of storyConfig.protagonist.alignments) {
        for (const style of Object.keys(storyConfig.protagonist.styles)) {
          for (const build of Object.keys(BUILDS)) {
            let run = createStoryRun({ name: 'QA', alignment, style, saberColor: storyConfig.protagonist.saberColors[0] }, difficulty, storyConfig);
            while (run.encounter) {
              run = invest(run, build);
              const stage = getStoryStage(run, storyConfig, aiConfig.difficultyOrder);
              const character = createProtagonistCharacter(run.protagonist, storyConfig, run.loadout);
              for (const pilot of ['same', 'normal', 'hard']) {
                if (options.encounters && !options.encounters.split(',').includes(stage.encounterId)) continue;
                const leftDifficulty = pilot === 'same' ? stage.difficulty : pilot;
                measure({ characterId: 'protagonist', character, side: 'A', difficulty: leftDifficulty }, setup(stage.opponentCharacter, 'B', stage.difficulty, stage.opponentVariant), seed, { difficulty, alignment, style, build, pilot, encounter: stage.encounterId, attributes: run.protagonist.attributes, loadout: run.loadout });
              }
              console.log(`${seed} story ${difficulty}/${alignment}/${style}/${build}/${stage.encounterId}`);
              run = resolveStoryResult(run, { winnerSide: 0, fighters: [{ healthRatio: 1 }] }, storyConfig).run;
            }
          }
        }
      }
    }
  }
}

if (options.suite === 'roster' || options.suite === 'heron') runRoster();
else if (options.suite === 'secrets') runSecrets();
else if (options.suite === 'story') runStory();
else throw new Error(`Unknown suite: ${options.suite}`);
if (options.out) {
  mkdirSync(dirname(options.out), { recursive: true });
  writeFileSync(options.out, JSON.stringify({ node: process.version, options, rules, roster: roster.map(character => character.id), attributes: Object.fromEntries(roster.map(character => [character.id, character.attributes])), records }, null, 2) + '\n');
}

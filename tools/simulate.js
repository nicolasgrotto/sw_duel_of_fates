import { attributesConfig } from '../src/config/attributesConfig.js';
import { EnemyAI } from '../src/ai/EnemyAI.js';
import { characters } from '../src/characters/characterData.js';
import { createFighter } from '../src/characters/characterFactory.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { evadeConfig } from '../src/config/evadeConfig.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { fighterArchetypes } from '../src/config/fightersConfig.js';
import { animation as animationStyle } from '../src/config/fighterVisualConfig.js';
import { gameConfig } from '../src/config/gameConfig.js';
import { createArenaBounds } from '../src/simulation/arenaBounds.js';
import { DuelSimulation } from '../src/simulation/DuelSimulation.js';
import { createRandom } from '../src/utils/random.js';

const STEP = gameConfig.loop.fixedStep;
const CONFIG_ROOTS = {
  fighters: fighterArchetypes,
  attributes: Object.fromEntries(Object.entries(characters).map(([id, character]) => [id, character.attributes])),
  attributeBases: attributesConfig.bases,
  attributeConfig: attributesConfig,
  ai: aiConfig,
  game: gameConfig,
  evade: evadeConfig,
};

function applyOverride(assignment) {
  const [path, rawValue] = assignment.split('=');
  const [rootName, ...keys] = path.split('.');
  let target = CONFIG_ROOTS[rootName];
  const lastKey = keys.pop();

  for (const key of keys) {
    target = target?.[key];
  }
  if (!target || !(lastKey in target)) {
    throw new Error(`Unknown config path: ${path}`);
  }
  target[lastKey] = rawValue === 'true' ? true : rawValue === 'false' ? false : Number.isNaN(Number(rawValue)) ? rawValue : Number(rawValue);
}
const MAX_DUEL_SECONDS = 120;

function readOptions(argv) {
  const options = {
    duels: 200,
    difficulty: aiConfig.defaultDifficulty,
    left: gameConfig.duel.playerCharacter,
    right: gameConfig.duel.opponentCharacter,
    leftDifficulty: '',
    rightDifficulty: '',
    profile: '',
    rules: '',
    seed: 1,
    overrides: [],
  };

  for (let i = 0; i < argv.length; i += 2) {
    const name = argv[i].replace(/^--/, '');
    if (name === 'set') {
      options.overrides.push(argv[i + 1]);
    } else if (name in options) {
      options[name] = typeof options[name] === 'number' ? Number(argv[i + 1]) : argv[i + 1];
    }
  }
  options.leftDifficulty ||= options.difficulty;
  options.rightDifficulty ||= options.difficulty;
  return options;
}

function createController(self, opponent, { characterId, difficulty, profile }, random) {
  return new EnemyAI({
    self,
    opponent,
    profile: aiConfig.profiles[profile || characters[characterId].aiProfile],
    difficulty: aiConfig.difficulties[difficulty],
    perception: aiConfig.perception,
    random,
  });
}

function readRules(names) {
  const enabled = new Set(names.split(',').filter(Boolean));
  return { powers: enabled.has('powers') };
}

function runDuel(leftSetup, rightSetup, random, rules) {
  const leftId = leftSetup.characterId;
  const rightId = rightSetup.characterId;
  const arena = createArenaBounds(gameConfig);
  const centerX = (arena.left + arena.right) / 2;
  const half = gameConfig.duel.spawnDistance / 2;
  const left = createFighter(leftId, { x: centerX - half, y: arena.floorY, facing: 1 });
  const right = createFighter(rightId, { x: centerX + half, y: arena.floorY, facing: -1 });
  const fighters = [left, right];
  const controllers = [
    createController(left, right, leftSetup, random),
    createController(right, left, rightSetup, random),
  ];
  const simulation = new DuelSimulation({
    arena,
    fighters,
    physicsConfig: gameConfig.physics,
    combatConfig: gameConfig.combat,
    animationConfig: animationStyle,
    rules,
  });
  const counts = { hits: 0, blocks: 0, clashes: 0, guardBreaks: 0, parries: 0, perfectParries: 0, shoves: 0, evades: 0, evadeAttempts: 0, jumps: 0, airJumps: 0 };

  const hitsReceived = new Map([[left, 0], [right, 0]]);
  let time = 0;
  while (time < MAX_DUEL_SECONDS && left.isAlive && right.isAlive) {
    for (let i = 0; i < fighters.length; i += 1) {
      controllers[i].updateIntent(fighters[i].intent, STEP);
      if (fighters[i].intent.evade) counts.evadeAttempts += 1;
    }
    const jumpsBefore = fighters.map((fighter) => fighter.combat.jumpsUsed);
    simulation.step(STEP);
    for (let i = 0; i < fighters.length; i++) {
      if (fighters[i].combat.jumpsUsed > jumpsBefore[i]) {
        counts.jumps += 1;
        if (fighters[i].combat.jumpsUsed > 1) counts.airJumps += 1;
      }
    }
    for (const event of simulation.events) {
      if (event.type === CombatEvent.HIT) {
        counts.hits += 1;
        hitsReceived.set(event.defender, hitsReceived.get(event.defender) + 1);
      }
      if (event.type === CombatEvent.BLOCK) counts.blocks += 1;
      if (event.type === CombatEvent.CLASH) counts.clashes += 1;
      if (event.type === CombatEvent.GUARD_BREAK) counts.guardBreaks += 1;
      if (event.type === CombatEvent.PARRY) counts.parries += 1;
      if (event.type === CombatEvent.PERFECT_PARRY) counts.perfectParries += 1;
      if (event.type === CombatEvent.EVADE_SUCCESS) counts.evades += 1;
      if (event.type === CombatEvent.SHOVE) counts.shoves += 1;
    }
    time += STEP;
  }

  const winner = left.isAlive && !right.isAlive ? left : right.isAlive && !left.isAlive ? right : null;
  const winnerSetup = winner === left ? leftSetup : winner === right ? rightSetup : null;
  return { winnerSide: winnerSetup?.side ?? null, time, counts, hitsToKnockout: winner ? hitsReceived.get(winner === left ? right : left) : null };
}

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
}

function main() {
  const options = readOptions(process.argv.slice(2));
  options.overrides.forEach(applyOverride);
  const random = createRandom(options.seed);
  const rules = readRules(options.rules);
  const results = [];

  const sides = [
    { side: 'A', characterId: options.left, difficulty: options.leftDifficulty, profile: options.profile },
    { side: 'B', characterId: options.right, difficulty: options.rightDifficulty, profile: options.profile },
  ];

  for (let i = 0; i < options.duels; i += 1) {
    const [first, second] = i % 2 === 1 ? [sides[1], sides[0]] : sides;
    results.push(runDuel(first, second, random, rules));
  }

  const wins = { A: 0, B: 0 };
  for (const result of results) {
    if (result.winnerSide) {
      wins[result.winnerSide] += 1;
    }
  }
  const timeouts = results.filter((result) => !result.winnerSide).length;
  const percent = (value) => `${((value / results.length) * 100).toFixed(1)}%`;
  const describe = ({ characterId, difficulty, profile }) =>
    `${characterId} (${difficulty}, ${profile || characters[characterId].aiProfile})`.padEnd(36);

  console.log(`Duels: ${results.length}  seed: ${options.seed}${options.rules ? `  rules: ${options.rules}` : ''}${options.overrides.length ? `  set: ${options.overrides.join(', ')}` : ''}`);
  console.log(`A ${describe(sides[0])} wins: ${String(wins.A).padStart(4)}  (${percent(wins.A)})`);
  console.log(`B ${describe(sides[1])} wins: ${String(wins.B).padStart(4)}  (${percent(wins.B)})`);
  console.log(`timeouts  : ${String(timeouts).padStart(4)}  (${percent(timeouts)})`);
  console.log(`avg time  : ${average(results.map((result) => result.time)).toFixed(1)} s`);
  console.log(`avg hits  : ${average(results.map((result) => result.counts.hits)).toFixed(1)}`);
  console.log(`avg hits to KO: ${average(results.filter((result) => result.hitsToKnockout !== null).map((result) => result.hitsToKnockout)).toFixed(1)}`);
  console.log(`avg blocks: ${average(results.map((result) => result.counts.blocks)).toFixed(1)}`);
  console.log(`avg clash : ${average(results.map((result) => result.counts.clashes)).toFixed(2)}`);
  console.log(`avg guard breaks: ${average(results.map((result) => result.counts.guardBreaks)).toFixed(2)}`);
  console.log(`avg parries: ${average(results.map((result) => result.counts.parries)).toFixed(2)}  perfect: ${average(results.map((result) => result.counts.perfectParries)).toFixed(2)}`);
  console.log(`avg evades : ${average(results.map((result) => result.counts.evades)).toFixed(2)}  attempts: ${average(results.map((result) => result.counts.evadeAttempts)).toFixed(2)}`);
  console.log(`avg jumps  : ${average(results.map((result) => result.counts.jumps)).toFixed(2)}  air: ${average(results.map((result) => result.counts.airJumps)).toFixed(2)}`);
  console.log(`avg shoves : ${average(results.map((result) => result.counts.shoves)).toFixed(2)}`);
}

main();

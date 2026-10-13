import { attributesConfig } from '../src/config/attributesConfig.js';
import { EnemyAI } from '../src/ai/EnemyAI.js';
import { characters } from '../src/characters/characterData.js';
import { createFighterFromCharacter } from '../src/characters/characterFactory.js';
import { createProtagonistCharacter } from '../src/characters/protagonist.js';
import { getCampaignBuild } from '../src/modes/story/storyRun.js';
import { storyConfig } from '../src/config/storyConfig.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { evadeConfig } from '../src/config/evadeConfig.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { combatRulesConfig, resolveCombatRules } from '../src/config/combatRulesConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { projectilesConfig } from '../src/config/projectilesConfig.js';
import { bladeTechniques } from '../src/config/movesConfig.js';
import { fighterArchetypes } from '../src/config/fightersConfig.js';
import { animation as animationStyle } from '../src/config/fighterVisualConfig.js';
import { gameConfig } from '../src/config/gameConfig.js';
import { createArenaBounds } from '../src/simulation/arenaBounds.js';
import { DuelSimulation } from '../src/simulation/DuelSimulation.js';
import { createRandom } from '../src/utils/random.js';

const STEP = gameConfig.loop.fixedStep;
const PROTAGONIST_PREFIX = 'protagonist:';
const PROTAGONIST_ORDER = ['flow', 'blade', 'health', 'agility', 'defense', 'stamina'];

function buildProtagonist(spec) {
  const [difficulty = 'normal', alignment = 'light', style = 'technique'] = spec.slice(PROTAGONIST_PREFIX.length).split(':');
  const attributes = { ...storyConfig.startAttributes };
  const cap = storyConfig.ratingCap;
  let total = Object.values(attributes).reduce((sum, value) => sum + value, 0);
  while (total < storyConfig.budgets[difficulty] && PROTAGONIST_ORDER.some((name) => attributes[name] < cap)) {
    for (const name of PROTAGONIST_ORDER) {
      if (attributes[name] < cap && total < storyConfig.budgets[difficulty]) {
        attributes[name] += 1;
        total += 1;
      }
    }
  }
  const profile = { name: 'Protagonista', alignment, style, saberColor: storyConfig.protagonist.saberColors[0], attributes };
  return createProtagonistCharacter(profile, storyConfig, getCampaignBuild(alignment, storyConfig).loadout);
}

function resolveCharacter(id) {
  return id.startsWith(PROTAGONIST_PREFIX) ? buildProtagonist(id) : characters[id];
}
const CONFIG_ROOTS = {
  fighters: fighterArchetypes,
  combatRules: combatRulesConfig,
  attributes: Object.fromEntries(Object.entries(characters).map(([id, character]) => [id, character.attributes])),
  loadouts: Object.fromEntries(Object.entries(characters).map(([id, character]) => [id, character.loadout])),
  attributeBases: attributesConfig.bases,
  attributeConfig: attributesConfig,
  ai: aiConfig,
  game: gameConfig,
  evade: evadeConfig,
  powers: powersConfig,
  projectiles: projectilesConfig,
  techniques: bladeTechniques,
  story: storyConfig,
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
    maxSeconds: 120,
    overrides: [],
    variant: '',
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

function createController(self, opponent, { characterId, difficulty, profile }, random, rules, arena) {
  return new EnemyAI({
    self,
    opponent,
    profile: aiConfig.profiles[profile || resolveCharacter(characterId).aiProfile],
    difficulty: aiConfig.difficulties[difficulty],
    perception: aiConfig.perception,
    random,
    rules,
    arena,
  });
}

function readRules(names) {
  const enabled = new Set(names.split(',').filter(Boolean));
  return resolveCombatRules(Object.fromEntries([...enabled].map((name) => [name, true])));
}

function describeEnding(left, right) {
  if (left.isAlive && right.isAlive) return 'timeout';
  return left.isAlive || right.isAlive ? 'knockout' : 'doubleKnockout';
}

function runDuel(leftSetup, rightSetup, random, rules, maxSeconds) {
  const leftId = leftSetup.characterId;
  const rightId = rightSetup.characterId;
  const arena = createArenaBounds(gameConfig);
  const centerX = (arena.left + arena.right) / 2;
  const half = gameConfig.duel.spawnDistance / 2;
  const left = createFighterFromCharacter(resolveCharacter(leftId), { x: centerX - half, y: arena.floorY, facing: 1 }, { variant: leftSetup.variant });
  const right = createFighterFromCharacter(resolveCharacter(rightId), { x: centerX + half, y: arena.floorY, facing: -1 }, { variant: rightSetup.variant });
  const fighters = [left, right];
  const controllers = [
    createController(left, right, leftSetup, random, rules, arena),
    createController(right, left, rightSetup, random, rules, arena),
  ];
  const simulation = new DuelSimulation({
    arena,
    fighters,
    physicsConfig: gameConfig.physics,
    combatConfig: gameConfig.combat,
    animationConfig: animationStyle,
    rules,
  });
  for (const controller of controllers) controller.projectiles = simulation.projectiles;
  const counts = { hits: 0, blocks: 0, clashes: 0, guardBreaks: 0, parries: 0, perfectParries: 0, shoves: 0, evades: 0, evadeAttempts: 0, jumps: 0, airJumps: 0, airDashes: 0, powers: 0, powerHits: 0, powerResisted: 0, powerAbsorbed: 0 };

  const hitsReceived = new Map([[left, 0], [right, 0]]);
  let firstWound = null;
  let time = 0;
  while (time < maxSeconds && left.isAlive && right.isAlive) {
    for (let i = 0; i < fighters.length; i += 1) {
      controllers[i].updateIntent(fighters[i].intent, STEP);
      if (fighters[i].intent.evade) counts.evadeAttempts += 1;
    }
    const jumpsBefore = fighters.map((fighter) => fighter.combat.jumpsUsed);
    const dashesBefore = fighters.map((fighter) => fighter.combat.airDashUsed);
    simulation.step(STEP);
    for (let i = 0; i < fighters.length; i++) {
      if (fighters[i].combat.jumpsUsed > jumpsBefore[i]) {
        counts.jumps += 1;
        if (fighters[i].combat.jumpsUsed > 1) counts.airJumps += 1;
      }
      if (fighters[i].combat.airDashUsed && !dashesBefore[i]) counts.airDashes += 1;
    }
    for (const event of simulation.events) {
      if (event.type === CombatEvent.WOUND && !firstWound) firstWound = { attacker: event.attacker, time };
      if (event.type === CombatEvent.HIT) {
        counts.hits += 1;
        hitsReceived.set(event.defender, hitsReceived.get(event.defender) + 1);
      }
      if (event.type === CombatEvent.BLOCK) counts.blocks += 1;
      if (event.type === CombatEvent.CLASH) counts.clashes += 1;
      if (event.type === CombatEvent.GUARD_BREAK) counts.guardBreaks += 1;
      if (event.type === CombatEvent.PARRY) counts.parries += 1;
      if (event.type === CombatEvent.PERFECT_PARRY) counts.perfectParries += 1;
      if (event.type === CombatEvent.EVADE_SUCCESS && !event.auto) counts.evades += 1;
      if (event.type === CombatEvent.SHOVE) counts.shoves += 1;
      if (event.type === CombatEvent.POWER_START) counts.powers += 1;
      if (event.type === CombatEvent.POWER_HIT) counts.powerHits += 1;
      if (event.type === CombatEvent.POWER_RESISTED) counts.powerResisted += 1;
      if (event.type === CombatEvent.POWER_ABSORBED) counts.powerAbsorbed += 1;
    }
    time += STEP;
  }

  const winner = left.isAlive && !right.isAlive ? left : right.isAlive && !left.isAlive ? right : null;
  for (const name of ['exhaustionSpendCount', 'exhaustionBlockCount', 'exhaustionGuardBreakCount', 'exhaustionDrainCount', 'exhaustionBladeLockCount', 'woundArmCount', 'woundLegCount', 'autoEvadeCount', 'wrathExtraDamage', 'lockCount', 'lockWinCount', 'lockDrawCount', 'lockEndCount', 'lockDurationTotal']) {
    counts[name] = left.combat[name] + right.combat[name];
  }
  counts.lockWinsA = leftSetup.side === 'A' ? left.combat.lockWinCount : right.combat.lockWinCount;
  counts.lockWinsB = leftSetup.side === 'B' ? left.combat.lockWinCount : right.combat.lockWinCount;
  const winnerSetup = winner === left ? leftSetup : winner === right ? rightSetup : null;
  const woundedFirst = firstWound ? { winnerWounded: winner === firstWound.attacker, timeAfter: time - firstWound.time } : null;
  return { winnerSide: winnerSetup?.side ?? null, ending: describeEnding(left, right), time, counts, woundedFirst, hitsToKnockout: winner ? hitsReceived.get(winner === left ? right : left) : null };
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

  const variants = Object.fromEntries(options.variant.split(',').filter(Boolean).map(entry => {
    const [id, variant] = entry.split('=');
    if (!characters[id]?.variants?.[variant]) throw new Error(`Unknown variant: ${entry}`);
    return [id, variant];
  }));
  const sides = [
    { side: 'A', characterId: options.left, variant: variants[options.left], difficulty: options.leftDifficulty, profile: options.profile },
    { side: 'B', characterId: options.right, variant: variants[options.right], difficulty: options.rightDifficulty, profile: options.profile },
  ];

  for (let i = 0; i < options.duels; i += 1) {
    const [first, second] = i % 2 === 1 ? [sides[1], sides[0]] : sides;
    results.push(runDuel(first, second, random, rules, options.maxSeconds));
  }

  const wins = { A: 0, B: 0 };
  for (const result of results) {
    if (result.winnerSide) {
      wins[result.winnerSide] += 1;
    }
  }
  const timeouts = results.filter((result) => result.ending === 'timeout').length;
  const doubleKnockouts = results.filter((result) => result.ending === 'doubleKnockout').length;
  const percent = (value) => `${((value / results.length) * 100).toFixed(1)}%`;
  const describe = ({ characterId, variant, difficulty, profile }) =>
    `${characterId}${variant ? `=${variant}` : ''} (${difficulty}, ${profile || resolveCharacter(characterId).aiProfile})`.padEnd(36);

  console.log(`Duels: ${results.length}  seed: ${options.seed}${options.rules ? `  rules: ${options.rules}` : ''}${options.overrides.length ? `  set: ${options.overrides.join(', ')}` : ''}`);
  console.log(`A ${describe(sides[0])} wins: ${String(wins.A).padStart(4)}  (${percent(wins.A)})`);
  console.log(`B ${describe(sides[1])} wins: ${String(wins.B).padStart(4)}  (${percent(wins.B)})`);
  console.log(`timeouts  : ${String(timeouts).padStart(4)}  (${percent(timeouts)})`);
  console.log(`double KOs: ${String(doubleKnockouts).padStart(4)}  (${percent(doubleKnockouts)})`);
  console.log(`avg time  : ${average(results.map((result) => result.time)).toFixed(1)} s`);
  console.log(`avg hits  : ${average(results.map((result) => result.counts.hits)).toFixed(1)}`);
  console.log(`avg hits to KO: ${average(results.filter((result) => result.hitsToKnockout !== null).map((result) => result.hitsToKnockout)).toFixed(1)}`);
  console.log(`avg blocks: ${average(results.map((result) => result.counts.blocks)).toFixed(1)}`);
  console.log(`avg clash : ${average(results.map((result) => result.counts.clashes)).toFixed(2)}`);
  console.log(`avg guard breaks: ${average(results.map((result) => result.counts.guardBreaks)).toFixed(2)}`);
  console.log(`avg parries: ${average(results.map((result) => result.counts.parries)).toFixed(2)}  perfect: ${average(results.map((result) => result.counts.perfectParries)).toFixed(2)}`);
  console.log(`avg evades : ${average(results.map((result) => result.counts.evades)).toFixed(2)}  attempts: ${average(results.map((result) => result.counts.evadeAttempts)).toFixed(2)}`);
  console.log(`avg jumps  : ${average(results.map((result) => result.counts.jumps)).toFixed(2)}  air: ${average(results.map((result) => result.counts.airJumps)).toFixed(2)}  air dashes: ${average(results.map((result) => result.counts.airDashes)).toFixed(2)}`);
  console.log(`avg shoves : ${average(results.map((result) => result.counts.shoves)).toFixed(2)}`);
  if (rules.powers) {
    const counts = (name) => average(results.map((result) => result.counts[name])).toFixed(2);
    console.log(`avg powers : ${counts('powers')}  hits: ${counts('powerHits')}  resisted: ${counts('powerResisted')}  absorbed: ${counts('powerAbsorbed')}`);
  }
  const wrathEquipped = sides.some(({ characterId }) => Object.values(resolveCharacter(characterId).loadout?.powers ?? {}).includes('wrath'));
  if (rules.exhaustion || rules.wounds || rules.focusEvade || rules.bladeLock || wrathEquipped) {
    const counts = (name) => average(results.map((result) => result.counts[name])).toFixed(2);
    console.log(`avg exhaustion: spend ${counts('exhaustionSpendCount')}  block ${counts('exhaustionBlockCount')}  guardBreak ${counts('exhaustionGuardBreakCount')}  drain ${counts('exhaustionDrainCount')}${rules.bladeLock ? `  bladeLock ${counts('exhaustionBladeLockCount')}` : ''}`);
    console.log(`avg wounds: arm ${counts('woundArmCount')}  leg ${counts('woundLegCount')}`);
    const wounded = results.filter((result) => result.woundedFirst);
    const after = wounded.map((result) => result.woundedFirst.timeAfter).sort((a, b) => a - b);
    const firstWins = wounded.filter((result) => result.woundedFirst.winnerWounded).length;
    console.log(`first wound: rounds ${wounded.length}  wins ${firstWins}  median after ${(after[Math.floor(after.length / 2)] ?? 0).toFixed(1)} s`);
    console.log(`avg auto evades: ${counts('autoEvadeCount')}`);
    console.log(`avg wrath extra damage: ${counts('wrathExtraDamage')}`);
  }
  if (rules.bladeLock) {
    const counts = (name, divisor = 1) => (average(results.map((result) => result.counts[name])) / divisor).toFixed(2);
    const duration = results.reduce((total, result) => total + result.counts.lockDurationTotal, 0);
    const resolved = results.reduce((total, result) => total + result.counts.lockEndCount, 0);
    console.log(`avg blade locks: ${counts('lockCount', 2)}  wins A ${counts('lockWinsA')} B ${counts('lockWinsB')}  draws ${counts('lockDrawCount', 2)}  duration ${(duration / Math.max(1, resolved)).toFixed(2)} s`);
  }
}

main();

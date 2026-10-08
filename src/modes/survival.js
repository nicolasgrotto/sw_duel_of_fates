import { createRandom } from '../utils/random.js';

const OPPONENT_SEED_STEP = 7919;

export function createSurvivalRun(playerCharacter, playerSaberColor, seed) {
  return { playerCharacter, playerSaberColor, wins: 0, health: null, seed };
}

function getDifficulty(wins, difficultyByWins) {
  let difficulty = difficultyByWins[0][1];
  for (const [fromWins, name] of difficultyByWins) {
    if (wins >= fromWins) {
      difficulty = name;
    }
  }
  return difficulty;
}

export function getSurvivalStage(run, roster, { bossEvery, boss, bossDifficulty, difficultyByWins }, arenaOrder) {
  const isBoss = (run.wins + 1) % bossEvery === 0;
  const opponents = roster.filter((id) => id !== run.playerCharacter);
  const random = createRandom(run.seed + run.wins * OPPONENT_SEED_STEP);
  return {
    number: run.wins + 1,
    wins: run.wins,
    opponentCharacter: isBoss ? boss : opponents[Math.floor(random() * opponents.length)],
    difficulty: isBoss ? bossDifficulty : getDifficulty(run.wins, difficultyByWins),
    arena: arenaOrder[run.wins % arenaOrder.length],
    isBoss,
  };
}

export function nextSurvivalRun(run, health, maxHealth, healRatio) {
  return { ...run, wins: run.wins + 1, health: Math.min(maxHealth, health + maxHealth * healRatio) };
}

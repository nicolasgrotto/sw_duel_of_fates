export function createArcadeRun(playerCharacter, roster, { maxOpponents, boss }) {
  const opponents = roster.filter((id) => id !== playerCharacter).slice(0, maxOpponents);
  return { playerCharacter, ladder: [...opponents, boss], stage: 0 };
}

export function getArcadeStage(run, { difficulties, bossDifficulty }, arenaOrder) {
  const isBoss = run.stage === run.ladder.length - 1;
  const lastDifficulty = difficulties[difficulties.length - 1];
  return {
    number: run.stage + 1,
    total: run.ladder.length,
    opponentCharacter: run.ladder[run.stage],
    difficulty: isBoss ? bossDifficulty : (difficulties[run.stage] ?? lastDifficulty),
    arena: arenaOrder[run.stage % arenaOrder.length],
    isBoss,
  };
}

export function isLastStage(run) {
  return run.stage >= run.ladder.length - 1;
}

export function nextArcadeRun(run) {
  return { ...run, stage: run.stage + 1 };
}

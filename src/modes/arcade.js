export function createArcadeRun(playerCharacter, roster, { maxOpponents, boss }) {
  const candidates = roster.filter((id) => id !== playerCharacter);
  const offset = candidates.length > maxOpponents ? Math.max(0, roster.indexOf(playerCharacter)) % candidates.length : 0;
  const opponents = [...candidates.slice(offset), ...candidates.slice(0, offset)].slice(0, maxOpponents);
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

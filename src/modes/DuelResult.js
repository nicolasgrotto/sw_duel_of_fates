export function createDuelResult({ fighters, winner, stats, duration, mode }) {
  return {
    mode,
    winnerSide: winner ? fighters.indexOf(winner) : null,
    duration,
    fighters: fighters.map((fighter) => ({
      id: fighter.id,
      name: fighter.name,
      health: fighter.health,
      maxHealth: fighter.stats.maxHealth,
      healthRatio: fighter.health / fighter.stats.maxHealth,
    })),
    stats: stats.map((entry) => ({ ...entry })),
  };
}

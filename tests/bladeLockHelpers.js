import { combatRulesConfig } from '../src/config/combatRulesConfig.js';
import { createSimulation, spawnFighter } from './helpers.js';
import './consequenceHelpers.js';

export const bladeLockTestNumbers = Object.freeze({ cooldown: 4, distance: 70, minPressInterval: 1 / 12,
  winMargin: 4, maxDuration: 2, timeoutMargin: 2, damage: 8, staminaLoss: 35,
  separation: 420, loserStagger: 0.35, winnerRecovery: 0.25, lockReleaseGuard: 0.15, holdRate: 6 });
Object.assign(combatRulesConfig.bladeLock, bladeLockTestNumbers);

export function createBladeLockFixture(rules = { bladeLock: true, exhaustion: true }) {
  const fighters = [spawnFighter(500, 1), spawnFighter(580, -1)];
  const simulation = createSimulation(fighters, rules);
  fighters.forEach((fighter) => { fighter.combat.attack = fighter.moves.heavy; });
  simulation.bladeLocks.tryStart(...fighters);
  return { fighters, simulation };
}

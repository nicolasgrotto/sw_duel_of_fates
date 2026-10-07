import { getAttackDuration } from './attackPhases.js';
import { FighterState } from '../entities/fighterStates.js';

function getRemainingLock(fighter) {
  if (fighter.combat.attack) {
    return Math.max(0, getAttackDuration(fighter.combat.attack) - fighter.stateTime);
  }
  if (fighter.state === FighterState.BLOCKING) {
    return fighter.combat.blockstun;
  }
  if (fighter.state === FighterState.HIT || fighter.state === FighterState.STAGGERED || fighter.state === FighterState.STUNNED) {
    return Math.max(0, fighter.combat.stunDuration - fighter.stateTime);
  }
  return 0;
}

export function getFrameAdvantage(attacker, defender) {
  if (!attacker.isAlive || !defender.isAlive) {
    return null;
  }
  return getRemainingLock(defender) - getRemainingLock(attacker);
}

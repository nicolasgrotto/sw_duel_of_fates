import { AttackPhase, getAttackPhase } from '../combat/attackPhases.js';
import { FighterState } from '../entities/fighterStates.js';

const PUNISHABLE_STATES = new Set([FighterState.HIT, FighterState.STUNNED]);

export function getGap(a, b) {
  return Math.abs(b.x - a.x) - (a.width + b.width) / 2;
}

export function getDirectionTo(self, target) {
  return Math.sign(target.x - self.x) || self.facing;
}

export function canReach(attacker, defender, attack, margin) {
  return getGap(attacker, defender) < attack.hitbox.reach - margin;
}

export function isThreatening(attacker, defender, margin) {
  const { attack } = attacker.combat;
  if (!attack) {
    return false;
  }

  const phase = getAttackPhase(attack, attacker.stateTime);
  const isComing = phase === AttackPhase.STARTUP || phase === AttackPhase.ACTIVE;
  const isFacing = getDirectionTo(attacker, defender) === attacker.facing;
  return isComing && isFacing && getGap(attacker, defender) < attack.hitbox.reach + margin;
}

export function isPunishable(fighter) {
  if (PUNISHABLE_STATES.has(fighter.state)) {
    return true;
  }
  const { attack } = fighter.combat;
  return attack !== null && getAttackPhase(attack, fighter.stateTime) === AttackPhase.RECOVERY;
}

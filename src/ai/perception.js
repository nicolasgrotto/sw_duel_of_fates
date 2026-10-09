import { AttackPhase, getAttackDuration, getAttackPhase } from '../combat/attackPhases.js';
import { FighterState } from '../entities/fighterStates.js';

const PUNISHABLE_STATES = new Set([FighterState.HIT, FighterState.STAGGERED, FighterState.STUNNED]);

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

export function getVulnerableTime(fighter) {
  if (PUNISHABLE_STATES.has(fighter.state)) {
    return Math.max(0, fighter.combat.stunDuration - fighter.stateTime);
  }
  const { attack } = fighter.combat;
  if (attack !== null && getAttackPhase(attack, fighter.stateTime) === AttackPhase.RECOVERY) {
    return getAttackDuration(attack) - fighter.stateTime;
  }
  return 0;
}

export function isPunishable(fighter) {
  if (PUNISHABLE_STATES.has(fighter.state)) {
    return true;
  }
  const { attack } = fighter.combat;
  return attack !== null && getAttackPhase(attack, fighter.stateTime) === AttackPhase.RECOVERY;
}

export function getTimeUntilAttackActive(fighter) {
  const { attack, hasHit } = fighter.combat;
  if (!attack || hasHit || getAttackPhase(attack, fighter.stateTime) === AttackPhase.RECOVERY) return Infinity;
  return Math.max(0, attack.startup - fighter.stateTime);
}

export function findIncomingProjectile(self, system, horizon) {
  if (!system) return null;
  let nearest = null;
  let shortest = horizon;
  for (const projectile of system.pool) {
    if (!projectile.active || projectile.hit || system.fighters[projectile.owner] === self) continue;
    if (projectile.y + projectile.radius < self.top || projectile.y - projectile.radius > self.y) continue;
    const distance = self.x - projectile.x;
    if (distance * projectile.vx <= 0) continue;
    const time = Math.max(0, (Math.abs(distance) - self.width / 2 - projectile.radius) / Math.abs(projectile.vx));
    if (time <= shortest) {
      nearest = projectile;
      shortest = time;
    }
  }
  return nearest;
}

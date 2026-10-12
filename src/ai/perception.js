import { AttackPhase, getAttackDuration, getAttackPhase } from '../combat/attackPhases.js';
import { FighterState } from '../entities/fighterStates.js';

const PUNISHABLE_STATES = new Set([FighterState.HIT, FighterState.STAGGERED, FighterState.STUNNED]);

export function getGap(a, b) {
  return Math.abs(b.x - a.x) - (a.width + b.width) / 2;
}

export function getDirectionTo(self, target) {
  return Math.sign(target.x - self.x) || self.facing;
}

export function getAttackReach(attack) {
  return attack.throwRange ?? attack.hitbox.reach;
}

export function canReach(attacker, defender, attack, margin) {
  return getGap(attacker, defender) < getAttackReach(attack) - margin;
}

export function isThreatening(attacker, defender, margin) {
  const { attack } = attacker.combat;
  if (!attack) {
    return false;
  }

  const phase = getAttackPhase(attack, attacker.stateTime);
  const isComing = phase === AttackPhase.STARTUP || phase === AttackPhase.ACTIVE;
  const isFacing = getDirectionTo(attacker, defender) === attacker.facing;
  return isComing && isFacing && getGap(attacker, defender) < getAttackReach(attack) + margin;
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

export function findStormEscapeX(self, opponent, arena, margin) {
  const marks = opponent.combat.stormMarks;
  const clearance = opponent.combat.power.strikeWidth / 2 + self.width / 2 + margin;
  let nearest = null;
  let distance = Infinity;
  for (const mark of marks) {
    if (!mark.active) continue;
    const preferred = Math.sign(self.x - mark.x) || -getDirectionTo(self, opponent);
    for (const side of [preferred, -preferred]) {
      const x = mark.x + side * clearance;
      if (arena && (x < arena.left + self.width / 2 || x > arena.right - self.width / 2)) continue;
      if (marks.some(other => other.active && Math.abs(x - other.x) < clearance)) continue;
      const gap = Math.abs(x - self.x);
      if (gap < distance) { nearest = x; distance = gap; }
    }
  }
  return nearest;
}

export function findStormThreat(self, opponent, reactionTime, margin) {
  const power = opponent.combat.power;
  if (!power?.stormPhases) return null;
  for (const mark of opponent.combat.stormMarks) {
    if (!mark.active || opponent.stateTime < mark.markTime + reactionTime) continue;
    const time = mark.impactTime - opponent.stateTime;
    const distance = Math.abs(self.x - mark.x);
    const clearance = power.strikeWidth / 2 + self.width / 2 + margin;
    if (distance < clearance && time > 0) return mark;
  }
  return null;
}

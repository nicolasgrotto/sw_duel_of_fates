import { combatRulesConfig } from '../config/combatRulesConfig.js';
import { FighterState } from '../entities/fighterStates.js';
import { clamp } from '../utils/math.js';

function hasPeriodicOffense(fighter) {
  return fighter.combat.chokeTime > 0 || ['choke', 'storm', 'lightning'].includes(fighter.combat.power?.effect);
}

export class BladeLockSystem {
  constructor(combat, fighters, arena) {
    this.combat = combat;
    this.fighters = fighters;
    this.arena = arena;
  }

  canStart(a, b) {
    if (!this.combat.rules.bladeLock || !a.isAlive || !b.isAlive || !a.grounded || !b.grounded
      || a.combat.attack?.bladeLock !== true || b.combat.attack?.bladeLock !== true
      || a.combat.lockOpponent >= 0 || b.combat.lockOpponent >= 0
      || a.combat.lockCooldown > 0 || b.combat.lockCooldown > 0
      || hasPeriodicOffense(a) || hasPeriodicOffense(b)) return false;
    const aIndex = this.fighters.indexOf(a);
    const bIndex = this.fighters.indexOf(b);
    return aIndex >= 0 && bIndex >= 0 && !this.combat.projectiles.pool.some((projectile) =>
      projectile.active && (projectile.owner === aIndex || projectile.owner === bIndex));
  }

  tryStart(a, b) {
    if (!this.canStart(a, b)) return false;
    const left = a.x <= b.x ? a : b;
    const right = left === a ? b : a;
    const half = combatRulesConfig.bladeLock.distance / 2;
    const center = clamp((a.x + b.x) / 2, this.arena.left + left.width / 2 + half,
      this.arena.right - right.width / 2 - half);
    left.x = center - half;
    right.x = center + half;
    left.facing = 1;
    right.facing = -1;
    this.enter(a, b);
    this.enter(b, a);
    return true;
  }

  enter(fighter, opponent) {
    const { combat } = fighter;
    combat.lockTime = 0;
    combat.lockPresses = 0;
    combat.lockLastPress = -combatRulesConfig.bladeLock.minPressInterval;
    combat.lockOpponent = this.fighters.indexOf(opponent);
    fighter.clearAttack();
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.restartState(FighterState.BLADE_LOCK);
  }
}

import { combatRulesConfig } from '../config/combatRulesConfig.js';
import { FighterState } from '../entities/fighterStates.js';
import { clamp } from '../utils/math.js';
import { clearActionBuffer } from './actionBuffer.js';

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
    combat.lockPressHeld = fighter.intent.lightAttack;
    combat.lockReleaseGuard = 0;
    fighter.clearAttack();
    fighter.vx = 0;
    fighter.vy = 0;
    fighter.restartState(FighterState.BLADE_LOCK);
  }

  update(dt) {
    const tolerance = Number.EPSILON * Math.max(1, combatRulesConfig.bladeLock.cooldown / dt);
    for (const fighter of this.fighters) {
      const guard = fighter.combat.lockReleaseGuard - dt;
      fighter.combat.lockReleaseGuard = guard <= tolerance ? 0 : guard;
      if (fighter.combat.lockOpponent < 0) {
        const remaining = fighter.combat.lockCooldown - dt;
        fighter.combat.lockCooldown = remaining <= tolerance ? 0 : remaining;
      }
    }
    for (let index = 0; index < this.fighters.length; index += 1) {
      const fighter = this.fighters[index];
      const opponentIndex = fighter.combat.lockOpponent;
      if (opponentIndex < 0) continue;
      const opponent = this.fighters[opponentIndex];
      if (!opponent || !fighter.isAlive || !opponent.isAlive || fighter.state !== FighterState.BLADE_LOCK
        || opponent.state !== FighterState.BLADE_LOCK || opponent.combat.lockOpponent !== index) {
        this.cancel(fighter);
        if (opponent) this.cancel(opponent);
        continue;
      }
      if (index > opponentIndex) continue;
      this.advancePair(fighter, opponent, dt);
    }
  }

  advancePair(a, b, dt) {
    const config = combatRulesConfig.bladeLock;
    a.combat.lockTime = Math.min(config.maxDuration, a.combat.lockTime + dt);
    const tolerance = Number.EPSILON * Math.max(1, config.maxDuration / dt);
    if (config.maxDuration - a.combat.lockTime <= tolerance) a.combat.lockTime = config.maxDuration;
    b.combat.lockTime = a.combat.lockTime;
    this.countPress(a);
    this.countPress(b);
    const margin = a.combat.lockPresses - b.combat.lockPresses;
    if (Math.abs(margin) >= config.winMargin) {
      this.finish(a, b, margin > 0 ? a : b);
    } else if (a.combat.lockTime >= config.maxDuration) {
      this.finish(a, b, Math.abs(margin) >= config.timeoutMargin ? margin > 0 ? a : b : null);
    }
  }

  countPress(fighter) {
    const { combat, intent } = fighter;
    const pressed = intent.lightAttack && !combat.lockPressHeld;
    combat.lockPressHeld = intent.lightAttack;
    if (!pressed || combat.lockTime - combat.lockLastPress + Number.EPSILON * Math.max(1, combat.lockTime) < combatRulesConfig.bladeLock.minPressInterval) return;
    combat.lockPresses += 1;
    combat.lockLastPress = combat.lockTime;
  }

  finish(a, b, winner) {
    const config = combatRulesConfig.bladeLock;
    const loser = winner === a ? b : a;
    this.release(a);
    this.release(b);
    a.combat.lockCooldown = config.cooldown;
    b.combat.lockCooldown = config.cooldown;
    if (!winner) {
      this.combat.recoil(a, b);
      this.combat.recoil(b, a);
      return;
    }
    const contact = { attacker: winner, defender: loser, attackType: 'bladeLock',
      x: loser.x, y: loser.y - loser.height / 2 };
    this.combat.applyDamage(contact, config.damage, 'bladeLock');
    this.combat.spendStamina(loser, config.staminaLoss, 'bladeLock');
    winner.vx = -winner.facing * config.separation;
    loser.vx = -loser.facing * config.separation;
    winner.combat.stunDuration = config.winnerRecovery;
    winner.restartState(FighterState.HIT);
    if (loser.isAlive) {
      loser.combat.stunDuration = config.loserStagger;
      loser.restartState(FighterState.STAGGERED);
    }
  }

  release(fighter) {
    const { combat } = fighter;
    combat.lockTime = 0;
    combat.lockPresses = 0;
    combat.lockLastPress = 0;
    combat.lockOpponent = -1;
    combat.lockPressHeld = false;
    combat.lockReleaseGuard = combatRulesConfig.bladeLock.lockReleaseGuard;
    clearActionBuffer(fighter);
  }

  cancel(fighter) {
    this.release(fighter);
    fighter.combat.lockCooldown = 0;
    fighter.combat.lockReleaseGuard = 0;
    if (fighter.state === FighterState.BLADE_LOCK) fighter.restartState(FighterState.IDLE);
  }

  reset() {
    for (const fighter of this.fighters) this.cancel(fighter);
  }
}

import { combatRulesConfig } from '../config/combatRulesConfig.js';
import { FighterState } from '../entities/fighterStates.js';
import { clamp } from '../utils/math.js';
import { clearActionBuffer } from './actionBuffer.js';
import { CombatEvent, createCombatEvent } from './combatEvents.js';

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
    if (a === b || !this.combat.rules.bladeLock || !a.isAlive || !b.isAlive || !a.grounded || !b.grounded
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
    this.emit(CombatEvent.BLADE_LOCK_START, a, b, { advantage: 0 });
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
    combat.lockCount += 1;
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
        this.abort(fighter, opponent, !fighter.isAlive || opponent && !opponent.isAlive ? 'death' : 'reset');
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
    const aPressed = this.countPress(a);
    const bPressed = this.countPress(b);
    const margin = a.combat.lockPresses - b.combat.lockPresses;
    if (aPressed) this.emit(CombatEvent.BLADE_LOCK_PRESS, a, b, { side: this.fighters.indexOf(a), advantage: margin, presses: a.combat.lockPresses });
    if (bPressed) this.emit(CombatEvent.BLADE_LOCK_PRESS, b, a, { side: this.fighters.indexOf(b), advantage: b.combat.lockPresses - a.combat.lockPresses, presses: b.combat.lockPresses });
    if (Math.abs(margin) >= config.winMargin) {
      this.finish(a, b, margin > 0 ? a : b);
    } else if (a.combat.lockTime >= config.maxDuration) {
      this.finish(a, b, Math.abs(margin) >= config.timeoutMargin ? margin > 0 ? a : b : null, 'timeout');
    }
  }

  countPress(fighter) {
    const { combat, intent } = fighter;
    const pressed = intent.lightAttack && !combat.lockPressHeld;
    combat.lockPressHeld = intent.lightAttack;
    if (!pressed || combat.lockTime - combat.lockLastPress + Number.EPSILON * Math.max(1, combat.lockTime) < combatRulesConfig.bladeLock.minPressInterval) return false;
    combat.lockPresses += 1;
    combat.lockLastPress = combat.lockTime;
    return true;
  }

  finish(a, b, winner, reason = winner ? 'margin' : 'timeout') {
    if (a.combat.lockOpponent < 0 || a.combat.lockOpponent !== this.fighters.indexOf(b) || b.combat.lockOpponent !== this.fighters.indexOf(a)) return;
    if (!a.isAlive || !b.isAlive) {
      this.abort(a, b, 'death');
      return;
    }
    const config = combatRulesConfig.bladeLock;
    const loser = winner === a ? b : a;
    const duration = a.combat.lockTime;
    const data = { winner, loser: winner ? loser : null, draw: !winner, reason, duration,
      winnerPresses: winner?.combat.lockPresses ?? null, loserPresses: winner ? loser.combat.lockPresses : null };
    for (const fighter of [a, b]) {
      fighter.combat.lockEndCount += 1;
      fighter.combat.lockDurationTotal += duration;
      if (!winner) fighter.combat.lockDrawCount += 1;
    }
    if (winner) winner.combat.lockWinCount += 1;
    this.release(a);
    this.release(b);
    a.combat.lockCooldown = config.cooldown;
    b.combat.lockCooldown = config.cooldown;
    if (!winner) {
      this.combat.recoil(a, b);
      this.combat.recoil(b, a);
      this.emit(CombatEvent.BLADE_LOCK_END, a, b, data);
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
    this.emit(CombatEvent.BLADE_LOCK_END, winner, loser, { ...data, damage: contact.damage });
  }

  emit(type, attacker, defender, data) {
    this.combat.events.push(Object.assign(createCombatEvent(type, {
      attacker, defender: defender ?? null, attackType: 'bladeLock',
      x: defender ? (attacker.x + defender.x) / 2 : attacker.x,
      y: attacker.y - attacker.height / 2,
    }), data));
  }

  abort(fighter, opponent, reason) {
    const duration = fighter.combat.lockTime;
    this.emit(CombatEvent.BLADE_LOCK_END, fighter, opponent, { winner: null, loser: null, draw: false, reason, duration });
    this.cancel(fighter);
    if (opponent) this.cancel(opponent);
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
    for (const fighter of this.fighters) {
      if (fighter.combat.lockOpponent >= 0) this.abort(fighter, this.fighters[fighter.combat.lockOpponent], 'reset');
      this.cancel(fighter);
      Object.assign(fighter.combat, { lockCount: 0, lockWinCount: 0, lockDrawCount: 0, lockEndCount: 0, lockDurationTotal: 0,
        exhaustionBladeLockCount: 0 });
    }
  }
}

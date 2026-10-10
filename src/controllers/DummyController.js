import { FighterState } from '../entities/fighterStates.js';
import { randomRange } from '../utils/random.js';

export const DummyBehavior = Object.freeze({
  IDLE: 'idle',
  BLOCK: 'block',
  ATTACK: 'attack',
  HEAVY: 'heavy',
  LOCK: 'lock',
});

const BEHAVIOR_ORDER = [DummyBehavior.IDLE, DummyBehavior.BLOCK, DummyBehavior.ATTACK, DummyBehavior.HEAVY, DummyBehavior.LOCK];
const ATTACKING_BEHAVIORS = new Set([DummyBehavior.ATTACK, DummyBehavior.HEAVY]);
const READY_STATES = new Set([FighterState.IDLE, FighterState.WALKING]);
const APPROACHING_BEHAVIORS = new Set([DummyBehavior.ATTACK, DummyBehavior.HEAVY, DummyBehavior.LOCK]);

export class DummyController {
  constructor({ attackInterval, heavyInterval, approachGap, lockGapMargin = 0, lockGapTolerance = 0, lockPressRate = 0 }, random = Math.random) {
    this.attackInterval = attackInterval;
    this.heavyInterval = heavyInterval;
    this.approachGap = approachGap;
    this.lockGapMargin = lockGapMargin;
    this.lockGapTolerance = lockGapTolerance;
    this.lockPressRate = lockPressRate;
    this.lockPressTime = 0;
    this.answeredAttack = null;
    this.random = random;
    this.behavior = DummyBehavior.IDLE;
    this.attackTimer = 0;
    this.nextAttack = attackInterval;
    this.self = null;
    this.opponent = null;
  }

  setFighters(self, opponent) {
    this.self = self;
    this.opponent = opponent;
  }

  setBehavior(behavior) {
    if (this.behavior === behavior) {
      return;
    }
    this.behavior = behavior;
    this.attackTimer = 0;
    this.nextAttack = this.pickInterval();
    this.lockPressTime = 0;
  }

  cycleBehavior() {
    const nextIndex = (BEHAVIOR_ORDER.indexOf(this.behavior) + 1) % BEHAVIOR_ORDER.length;
    this.setBehavior(BEHAVIOR_ORDER[nextIndex]);
  }

  pickInterval() {
    return this.behavior === DummyBehavior.HEAVY ? randomRange(this.random, this.heavyInterval) : this.attackInterval;
  }

  updateIntent(intent, dt) {
    const attacking = ATTACKING_BEHAVIORS.has(this.behavior);
    const due = attacking && this.isAttackDue(dt);

    intent.moveX = APPROACHING_BEHAVIORS.has(this.behavior) ? this.getApproachDirection() : 0;
    intent.jump = false;
    intent.dodge = false;
    intent.evade = false;
    intent.block = this.behavior === DummyBehavior.BLOCK;
    intent.blockPressed = false;
    intent.special = false;
    intent.specialHeld = false;
    intent.lightAttack = due && this.behavior === DummyBehavior.ATTACK;
    intent.heavyAttack = due && this.behavior === DummyBehavior.HEAVY;
    if (this.behavior === DummyBehavior.LOCK) {
      this.updateLockIntent(intent, dt);
    }
  }

  updateLockIntent(intent, dt) {
    intent.heavyAttack = this.shouldAnswerHeavy(dt);
    if (this.self?.state !== FighterState.BLADE_LOCK) {
      this.lockPressTime = 0;
      return;
    }
    this.lockPressTime += dt;
    if (this.lockPressRate > 0 && this.lockPressTime >= 1 / this.lockPressRate) {
      this.lockPressTime = 0;
      intent.lightAttack = true;
    }
  }

  shouldAnswerHeavy(dt) {
    const { self, opponent } = this;
    const attack = opponent?.state === FighterState.HEAVY_ATTACK ? opponent.combat.attack : null;
    if (!self || attack?.bladeLock !== true || attack === this.answeredAttack || !READY_STATES.has(self.state)) {
      if (!attack) this.answeredAttack = null;
      return false;
    }
    if (opponent.stateTime + dt < attack.startup - self.moves.heavy.startup) {
      return false;
    }
    this.answeredAttack = attack;
    return true;
  }

  getApproachDirection() {
    if (!this.self || !this.opponent) {
      return 0;
    }
    const gap = Math.abs(this.opponent.x - this.self.x) - (this.self.width + this.opponent.width) / 2;
    const toward = Math.sign(this.opponent.x - this.self.x);
    if (this.behavior !== DummyBehavior.LOCK) {
      return gap > this.approachGap ? toward : 0;
    }
    const standoff = this.opponent.moves.heavy.hitbox.reach + this.lockGapMargin;
    if (gap > standoff + this.lockGapTolerance) return toward;
    return gap < standoff - this.lockGapTolerance ? -toward : 0;
  }

  isAttackDue(dt) {
    this.attackTimer += dt;
    if (this.attackTimer < this.nextAttack) {
      return false;
    }
    this.attackTimer = 0;
    this.nextAttack = this.pickInterval();
    return true;
  }
}

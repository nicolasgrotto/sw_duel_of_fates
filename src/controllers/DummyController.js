import { randomRange } from '../utils/random.js';

export const DummyBehavior = Object.freeze({
  IDLE: 'idle',
  BLOCK: 'block',
  ATTACK: 'attack',
  HEAVY: 'heavy',
});

const BEHAVIOR_ORDER = [DummyBehavior.IDLE, DummyBehavior.BLOCK, DummyBehavior.ATTACK, DummyBehavior.HEAVY];
const ATTACKING_BEHAVIORS = new Set([DummyBehavior.ATTACK, DummyBehavior.HEAVY]);

export class DummyController {
  constructor({ attackInterval, heavyInterval, approachGap }, random = Math.random) {
    this.attackInterval = attackInterval;
    this.heavyInterval = heavyInterval;
    this.approachGap = approachGap;
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

    intent.moveX = attacking ? this.getApproachDirection() : 0;
    intent.jump = false;
    intent.dodge = false;
    intent.evade = false;
    intent.block = this.behavior === DummyBehavior.BLOCK;
    intent.blockPressed = false;
    intent.special = false;
    intent.specialHeld = false;
    intent.lightAttack = due && this.behavior === DummyBehavior.ATTACK;
    intent.heavyAttack = due && this.behavior === DummyBehavior.HEAVY;
  }

  getApproachDirection() {
    if (!this.self || !this.opponent) {
      return 0;
    }
    const gap = Math.abs(this.opponent.x - this.self.x) - (this.self.width + this.opponent.width) / 2;
    return gap > this.approachGap ? Math.sign(this.opponent.x - this.self.x) : 0;
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

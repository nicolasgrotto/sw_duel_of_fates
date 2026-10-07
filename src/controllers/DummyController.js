export const DummyBehavior = Object.freeze({
  IDLE: 'idle',
  BLOCK: 'block',
  ATTACK: 'attack',
});

const BEHAVIOR_ORDER = [DummyBehavior.IDLE, DummyBehavior.BLOCK, DummyBehavior.ATTACK];

export class DummyController {
  constructor({ attackInterval }) {
    this.attackInterval = attackInterval;
    this.behavior = DummyBehavior.IDLE;
    this.attackTimer = 0;
  }

  cycleBehavior() {
    const nextIndex = (BEHAVIOR_ORDER.indexOf(this.behavior) + 1) % BEHAVIOR_ORDER.length;
    this.behavior = BEHAVIOR_ORDER[nextIndex];
    this.attackTimer = 0;
  }

  updateIntent(intent, dt) {
    intent.moveX = 0;
    intent.jump = false;
    intent.heavyAttack = false;
    intent.dodge = false;
    intent.block = this.behavior === DummyBehavior.BLOCK;
    intent.blockPressed = false;
    intent.special = false;
    intent.specialHeld = false;
    intent.lightAttack = this.behavior === DummyBehavior.ATTACK && this.isAttackDue(dt);
  }

  isAttackDue(dt) {
    this.attackTimer += dt;
    if (this.attackTimer < this.attackInterval) {
      return false;
    }
    this.attackTimer = 0;
    return true;
  }
}

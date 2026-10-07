import { AttackType } from '../combat/attackPhases.js';
import { FighterState } from '../entities/fighterStates.js';
import { canAfford } from '../systems/StaminaSystem.js';
import { canReach, getDirectionTo, getGap, isPunishable, isThreatening } from './perception.js';

export const AiDecision = Object.freeze({
  BUSY: 'busy',
  HESITATE: 'hesitate',
  BLOCK: 'block',
  DODGE: 'dodge',
  COUNTER: 'counter',
  GUARD: 'guard',
  RECOVER: 'recover',
  ATTACK: 'attack',
  APPROACH: 'approach',
  BACK_OFF: 'backOff',
  WAIT: 'wait',
});

const PendingAction = Object.freeze({
  NONE: null,
  LIGHT_ATTACK: 'lightAttack',
  HEAVY_ATTACK: 'heavyAttack',
  DODGE: 'dodge',
});

export class EnemyAI {
  constructor({ self, opponent, profile, difficulty, perception, random }) {
    this.self = self;
    this.opponent = opponent;
    this.profile = profile;
    this.difficulty = difficulty;
    this.perception = perception;
    this.random = random;
    this.thinkTimer = 0;
    this.attackCooldown = 0;
    this.decision = AiDecision.WAIT;
    this.plan = {
      moveX: 0,
      blockTime: 0,
      pendingAction: PendingAction.NONE,
    };
  }

  updateIntent(intent, dt) {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.plan.blockTime = Math.max(0, this.plan.blockTime - dt);
    this.thinkTimer -= dt;

    if (this.thinkTimer <= 0) {
      this.think();
      this.thinkTimer = this.difficulty.reactionTime;
    }

    this.writeIntent(intent);
  }

  writeIntent(intent) {
    const { plan } = this;

    intent.moveX = plan.moveX;
    intent.jump = false;
    intent.block = plan.blockTime > 0;
    intent.lightAttack = plan.pendingAction === PendingAction.LIGHT_ATTACK;
    intent.heavyAttack = plan.pendingAction === PendingAction.HEAVY_ATTACK;
    intent.dodge = plan.pendingAction === PendingAction.DODGE;
    plan.pendingAction = PendingAction.NONE;
  }

  think() {
    this.resetPlan();
    this.decision = this.decide();
  }

  resetPlan() {
    this.plan.moveX = 0;
    this.plan.pendingAction = PendingAction.NONE;
  }

  decide() {
    const { self, opponent } = this;

    if (!self.isAlive || !opponent.isAlive) {
      this.plan.blockTime = 0;
      return AiDecision.WAIT;
    }
    if (!self.canAct && self.state !== FighterState.BLOCKING) {
      return AiDecision.BUSY;
    }
    if (this.random() < this.difficulty.mistakeChance) {
      return AiDecision.HESITATE;
    }

    return (
      this.tryDefend() ??
      this.tryCounter() ??
      this.tryRecoverStamina() ??
      this.tryAttack() ??
      this.tryGuard() ??
      this.position()
    );
  }

  tryDefend() {
    if (!isThreatening(this.opponent, this.self, this.perception.threatMargin)) {
      this.plan.blockTime = 0;
      return null;
    }

    const roll = this.random();
    const blockChance = this.profile.blockChance * this.difficulty.defenseMultiplier;
    const dodgeChance = this.profile.dodgeChance * this.difficulty.defenseMultiplier;

    if (roll < blockChance) {
      this.plan.blockTime = this.perception.blockHoldTime;
      return AiDecision.BLOCK;
    }
    if (roll < blockChance + dodgeChance && canAfford(this.self, this.self.stats.dodge.staminaCost)) {
      this.plan.pendingAction = PendingAction.DODGE;
      return AiDecision.DODGE;
    }
    return null;
  }

  tryCounter() {
    if (!isPunishable(this.opponent) || this.attackCooldown > 0 || !this.canReachWith(AttackType.LIGHT)) {
      return null;
    }
    if (this.random() >= this.profile.counterChance) {
      return null;
    }

    const wantsHeavy = this.opponent.state === FighterState.STUNNED;
    return this.startAttack(wantsHeavy) ? AiDecision.COUNTER : null;
  }

  tryRecoverStamina() {
    const staminaRatio = this.self.stamina / this.self.stats.maxStamina;
    if (staminaRatio >= this.profile.retreatStaminaRatio) {
      return null;
    }

    const safeGap = this.profile.preferredGap + this.perception.safeGapExtra;
    if (getGap(this.self, this.opponent) < safeGap) {
      this.plan.moveX = -getDirectionTo(this.self, this.opponent);
    }
    return AiDecision.RECOVER;
  }

  tryAttack() {
    if (this.attackCooldown > 0 || !this.canReachWith(AttackType.LIGHT)) {
      return null;
    }
    if (this.random() >= this.profile.attackChance) {
      return null;
    }

    const wantsHeavy = this.random() < this.profile.heavyChance;
    return this.startAttack(wantsHeavy) ? AiDecision.ATTACK : null;
  }

  tryGuard() {
    const opponentReach = this.opponent.stats.attacks.light;
    if (!canReach(this.opponent, this.self, opponentReach, -this.perception.threatMargin)) {
      return null;
    }
    if (this.random() >= this.profile.guardChance * this.difficulty.defenseMultiplier) {
      return null;
    }

    this.plan.blockTime = this.perception.blockHoldTime;
    return AiDecision.GUARD;
  }

  position() {
    const gap = getGap(this.self, this.opponent);
    const direction = getDirectionTo(this.self, this.opponent);
    const { preferredGap } = this.profile;

    if (gap > preferredGap) {
      this.plan.moveX = direction;
      return AiDecision.APPROACH;
    }
    if (gap < preferredGap * this.perception.closeGapRatio) {
      this.plan.moveX = -direction;
      return AiDecision.BACK_OFF;
    }
    return AiDecision.WAIT;
  }

  canReachWith(attackType) {
    const attack = this.self.stats.attacks[attackType];
    return canReach(this.self, this.opponent, attack, this.perception.reachMargin);
  }

  startAttack(wantsHeavy) {
    const { attacks } = this.self.stats;
    const useHeavy = wantsHeavy && canAfford(this.self, attacks.heavy.staminaCost) && this.canReachWith(AttackType.HEAVY);

    if (!useHeavy && !canAfford(this.self, attacks.light.staminaCost)) {
      return false;
    }

    this.plan.blockTime = 0;
    this.plan.pendingAction = useHeavy ? PendingAction.HEAVY_ATTACK : PendingAction.LIGHT_ATTACK;
    this.attackCooldown = this.difficulty.attackCooldown;
    return true;
  }
}

import { AttackPhase, AttackType, getAttackDuration, getAttackPhase, isHeavyAttack } from '../combat/attackPhases.js';
import { getPowerMode, isBarrierUp, isChannelOpen, isInPowerRange, isPowerRecovering, isUsingPower } from '../combat/PowerSystem.js';
import { isStormShieldUp } from '../combat/StormSystem.js';
import { getFlowDifference, resolveInteraction, resolveLevelBand } from '../combat/flowInteractions.js';
import { projectilesConfig } from '../config/projectilesConfig.js';
import { evadeConfig } from '../config/evadeConfig.js';
import { powersConfig } from '../config/powersConfig.js';
import { combatRulesConfig, resolveCombatRules } from '../config/combatRulesConfig.js';
import { isNeutralForFocus } from '../combat/StatusSystem.js';
import { FighterState } from '../entities/fighterStates.js';
import { canAfford, getStaminaCost } from '../systems/StaminaSystem.js';
import { getMaxJumps } from '../systems/MovementSystem.js';
import { HabitMemory } from './HabitMemory.js';
import { canReach, findIncomingProjectile, findStormThreat, getAttackReach, getDirectionTo, getGap, getVulnerableTime, getTimeUntilAttackActive, isPunishable, isThreatening } from './perception.js';

export const AiDecision = Object.freeze({
  BUSY: 'busy',
  HESITATE: 'hesitate',
  BLOCK: 'block',
  PARRY: 'parry',
  DODGE: 'dodge',
  EVADE: 'evade',
  JUMP: 'jump',
  AIR_DASH: 'airDash',
  TECHNIQUE: 'technique',
  COUNTER: 'counter',
  SHOVE: 'shove',
  SPECIAL: 'special',
  POWER: 'power',
  BAIT: 'bait',
  GUARD: 'guard',
  RECOVER: 'recover',
  ATTACK: 'attack',
  APPROACH: 'approach',
  BACK_OFF: 'backOff',
  WAIT: 'wait',
  FOCUS_WAIT: 'focusWait',
  BLADE_LOCK: 'bladeLock',
});

const STUN_STATES = new Set([FighterState.HIT, FighterState.STAGGERED]);

const POWER_SLOTS = ['forward', 'neutral', 'back'];

export const SpecialKind = Object.freeze({
  COUNTER: 'counter',
  ARMOR: 'armor',
  DASH: 'dash',
  CHARGE: 'charge',
  LEAP: 'leap',
  STRIKE: 'strike',
});

export function getSpecialKind(move) {
  if (move.counter) {
    return SpecialKind.COUNTER;
  }
  if (move.dash) {
    return SpecialKind.DASH;
  }
  if (move.leap) {
    return SpecialKind.LEAP;
  }
  if (move.charge) {
    return SpecialKind.CHARGE;
  }
  return move.armor ? SpecialKind.ARMOR : SpecialKind.STRIKE;
}

const PendingAction = Object.freeze({
  NONE: null,
  LIGHT_ATTACK: 'lightAttack',
  HEAVY_ATTACK: 'heavyAttack',
  SHOVE: 'shove',
  SPECIAL: 'special',
  POWER: 'power',
  PARRY: 'parry',
  DODGE: 'dodge',
  EVADE: 'evade',
  JUMP: 'jump',
});

export class EnemyAI {
  constructor({ self, opponent, profile, difficulty, perception, random, rules = {}, arena = null, projectiles = null }) {
    this.self = self;
    this.arena = arena;
    this.projectiles = projectiles;
    this.opponent = opponent;
    this.profile = profile;
    this.difficulty = difficulty;
    this.perception = perception;
    this.random = random;
    this.powersEnabled = rules.powers === true;
    this.rules = resolveCombatRules(rules);
    this.thinkTimer = 0;
    this.attackCooldown = 0;
    this.decision = AiDecision.WAIT;
    this.habits = new HabitMemory(perception.habits);
    this.chainRolledFor = null;
    this.observedBladeHit = self.combat.bladeHitSequence;
    this.comboHits = 0;
    this.comboElapsed = Infinity;
    this.plan = {
      moveX: 0,
      blockTime: 0,
      parryDelay: -1,
      evadeDelay: -1,
      evadeAttack: null,
      punishAfterBlock: false,
      chargeHoldTime: 0,
      powerHoldTime: 0,
      feintDelay: -1,
      pendingAction: PendingAction.NONE,
      delayedAction: PendingAction.NONE,
      actionDelay: 0,
    };
  }

  updateIntent(intent, dt) {
    this.comboElapsed += dt;
    if (this.observedBladeHit !== this.self.combat.bladeHitSequence) {
      const use = this.perception.powerUse.supremePush;
      this.comboHits = this.comboElapsed < use.comboWindow ? this.comboHits + this.self.combat.bladeHitSequence - this.observedBladeHit : 1;
      this.comboElapsed = 0;
      this.observedBladeHit = this.self.combat.bladeHitSequence;
    }
    if (this.self.state === FighterState.BLADE_LOCK) {
      this.requestBladeLockPress(intent, dt);
      return;
    }
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.plan.blockTime = Math.max(0, this.plan.blockTime - dt);
    this.plan.chargeHoldTime = Math.max(0, this.plan.chargeHoldTime - dt);
    this.plan.powerHoldTime = Math.max(0, this.plan.powerHoldTime - dt);
    this.thinkTimer -= dt;

    if (this.thinkTimer <= 0) {
      this.think();
      this.thinkTimer = this.difficulty.reactionTime * (1 + this.perception.reactionJitter * this.random());
    }

    this.habits.observe(this.opponent, dt);
    this.updateBlockPunish();
    this.updateParryTiming(dt);
    this.updateEvadeTiming(dt);
    this.updateDelayedAction(dt);
    this.updateFeint(dt);
    this.tryChain();
    this.writeIntent(intent);
  }

  requestBladeLockPress(intent, dt) {
    const { plan, self, difficulty } = this;
    this.resetPlan();
    plan.blockTime = 0;
    plan.parryDelay = -1;
    plan.evadeDelay = -1;
    plan.evadeAttack = null;
    plan.punishAfterBlock = false;
    plan.chargeHoldTime = 0;
    plan.powerHoldTime = 0;
    plan.feintDelay = -1;
    plan.delayedAction = PendingAction.NONE;
    plan.actionDelay = 0;
    this.thinkTimer = 0;
    this.decision = AiDecision.BLADE_LOCK;
    this.writeIntent(intent);
    const interval = Math.max(combatRulesConfig.bladeLock.minPressInterval,
      (1 + this.perception.reactionJitter * this.random()) / difficulty.bladeLockRate);
    const { combat } = self;
    if (!combat.lockPressHeld && combat.lockTime + dt - combat.lockLastPress + Number.EPSILON * Math.max(1, combat.lockTime) >= interval
      && this.random() >= difficulty.mistakeChance) intent.lightAttack = true;
  }

  updateBlockPunish() {
    const { plan, self } = this;
    if (!plan.punishAfterBlock || self.state !== FighterState.BLOCKING || self.combat.blockstun <= 0) {
      return;
    }
    plan.punishAfterBlock = false;
    plan.blockTime = 0;
    plan.pendingAction = PendingAction.LIGHT_ATTACK;
  }

  updateDelayedAction(dt) {
    const { plan } = this;
    if (plan.delayedAction === PendingAction.NONE) {
      return;
    }
    if (!this.self.canAct) {
      plan.delayedAction = PendingAction.NONE;
      return;
    }
    plan.actionDelay -= dt;
    plan.moveX = this.wantsWound() && plan.delayedAction === PendingAction.HEAVY_ATTACK && this.canUseForwardHeavy()
      ? getDirectionTo(this.self, this.opponent) : 0;
    if (plan.actionDelay <= 0) {
      plan.pendingAction = plan.delayedAction;
      plan.delayedAction = PendingAction.NONE;
    }
  }

  updateFeint(dt) {
    const { plan } = this;
    if (plan.feintDelay < 0) {
      return;
    }
    plan.feintDelay -= dt;
    if (plan.feintDelay <= 0) {
      plan.feintDelay = -1;
      if (this.rules.exhaustion && !this.canSpend(this.self.stats.feint.staminaCost)) return;
      plan.pendingAction = PendingAction.PARRY;
    }
  }

  tryChain() {
    const { attack, attackConnected } = this.self.combat;
    if (!attack || !attackConnected || attack === this.chainRolledFor || attack.cancelsInto.length === 0) {
      return;
    }
    if (getAttackPhase(attack, this.self.stateTime) !== AttackPhase.RECOVERY) {
      return;
    }
    this.chainRolledFor = attack;
    if (this.rules.exhaustion && !this.canSpend(this.self.moves[attack.cancelsInto[0]].staminaCost, this.self.moves[attack.cancelsInto[0]])) {
      return;
    }
    if (this.random() < this.difficulty.chainChance) {
      this.plan.pendingAction = PendingAction.LIGHT_ATTACK;
    }
  }

  updateParryTiming(dt) {
    const { plan } = this;
    if (plan.parryDelay < 0) {
      return;
    }
    plan.parryDelay -= dt;
    if (plan.parryDelay <= 0) {
      plan.parryDelay = -1;
      plan.pendingAction = PendingAction.PARRY;
      plan.blockTime = this.perception.blockHoldTime;
    }
  }

  writeIntent(intent) {
    const { plan } = this;
    const shoving = plan.pendingAction === PendingAction.SHOVE;

    const compensation = this.difficulty.confusionCompensation;
    const confused = this.self.combat.confuseTime > 0 && compensation != null && this.self.combat.confuseElapsed >= compensation;
    intent.moveX = confused ? -plan.moveX : plan.moveX;
    intent.jump = plan.pendingAction === PendingAction.JUMP;
    intent.block = plan.blockTime > 0 || shoving;
    intent.blockPressed = plan.pendingAction === PendingAction.PARRY;
    intent.special = plan.pendingAction === PendingAction.SPECIAL;
    intent.specialHeld = plan.chargeHoldTime > 0;
    intent.lightAttack = plan.pendingAction === PendingAction.LIGHT_ATTACK || shoving;
    intent.heavyAttack = plan.pendingAction === PendingAction.HEAVY_ATTACK;
    intent.dodge = plan.pendingAction === PendingAction.DODGE;
    intent.evade = plan.pendingAction === PendingAction.EVADE;
    intent.power = plan.pendingAction === PendingAction.POWER;
    intent.powerHeld = plan.powerHoldTime > 0;
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
      this.plan.parryDelay = -1;
      return AiDecision.WAIT;
    }
    const fractureAnswer = this.tryJumpFracture();
    if (fractureAnswer) return fractureAnswer;
    const escapeAnswer = this.trySupremeEscape();
    if (escapeAnswer) return escapeAnswer;
    const stormAnswer = this.tryEscapeStorm();
    if (stormAnswer) return stormAnswer;
    if (this.powersEnabled && this.difficulty.powerAware && isChannelOpen(self)
      && self.combat.power.effect === 'lightning' && opponent.combat.absorbTime > 0) {
      this.plan.powerHoldTime = 0;
    }
    if (this.tryFocusNeutral()) return AiDecision.FOCUS_WAIT;
    if (this.plan.evadeDelay >= 0) return AiDecision.EVADE;
    if (this.plan.parryDelay >= 0) {
      return AiDecision.PARRY;
    }
    if (this.plan.delayedAction !== PendingAction.NONE) {
      return AiDecision.ATTACK;
    }
    if (!self.grounded && self.canMove && this.tryAirJump()) return AiDecision.JUMP;
    if (!self.grounded && self.state === FighterState.JUMPING && this.tryAirDash()) return AiDecision.AIR_DASH;
    if (!self.canAct && self.state !== FighterState.BLOCKING) {
      this.planRecoveryGuard();
      return AiDecision.BUSY;
    }
    if (self.combat.rainActive) {
      const defense = this.tryDefend();
      if (defense) return defense;
      this.plan.moveX = -getDirectionTo(self, opponent);
      return AiDecision.BACK_OFF;
    }
    if (this.random() < this.difficulty.mistakeChance) {
      return AiDecision.HESITATE;
    }
    const wrathAnswer = this.answerWrath();
    if (wrathAnswer) return wrathAnswer;

    for (const step of this.profile.priorities) {
      const decision = this.runStep(step);
      if (decision) {
        return decision;
      }
    }
    return AiDecision.WAIT;
  }

  wantsWound() {
    return this.rules.wounds && this.opponent.combat.exhausted && !this.opponent.combat.woundUsed
      && Boolean(this.self.moves.heavy.wound);
  }

  canUseForwardHeavy() {
    const move = this.self.moves.forwardHeavy;
    return Boolean(move?.wound) && this.canReachWith(AttackType.FORWARD_HEAVY) && this.canSpend(move.staminaCost, move);
  }

  canSpend(cost, move = null, type = 'action') {
    if (!this.rules.exhaustion && !this.rules.wounds && !this.rules.focusEvade) {
      return canAfford(this.self, cost);
    }
    const derived = getStaminaCost(this.self, cost, type);
    if (!canAfford(this.self, derived)) return false;
    if (!this.rules.exhaustion || this.self.stamina - derived > this.self.stats.maxStamina * combatRulesConfig.exhaustion.enterRatio) return true;
    return move !== null && this.expectedDamage(move) >= this.opponent.health;
  }

  allowsNewSpend(cost, type) {
    return !this.rules.exhaustion && !this.rules.wounds && !this.rules.focusEvade || this.canSpend(cost, null, type);
  }

  expectedDamage(move) {
    let damage = move.damage;
    if (this.rules.exhaustion && this.opponent.combat.exhausted && move.exhaustionBonus) damage *= combatRulesConfig.exhaustion.damageScale;
    if (this.self.combat.wrathTime > 0) damage *= this.self.combat.wrathDamageDealtScale;
    if (this.opponent.combat.wrathTime > 0) damage *= this.opponent.combat.wrathDamageTakenScale;
    return damage;
  }

  tryFocusNeutral() {
    const { self, opponent, plan } = this;
    if (!this.rules.focusEvade || self.combat.focusTime <= 0 || !self.grounded
      || !(self.canAct || self.state === FighterState.BLOCKING && self.combat.blockstun === 0)
      || self.flowMeter < combatRulesConfig.focus.autoEvadeCost || !opponent.combat.attack
      || opponent.combat.attack.projectile || opponent.combat.attackType === AttackType.SHOVE
      || !isThreatening(opponent, self, this.perception.threatMargin)
      || this.random() >= this.perception.consequences.focusNeutralWeight * this.difficulty.defenseMultiplier) return false;
    plan.moveX = 0;
    plan.blockTime = 0;
    plan.parryDelay = -1;
    plan.evadeDelay = -1;
    plan.feintDelay = -1;
    plan.powerHoldTime = 0;
    plan.chargeHoldTime = 0;
    plan.pendingAction = PendingAction.NONE;
    plan.delayedAction = PendingAction.NONE;
    return true;
  }

  answerWrath() {
    if (!this.powersEnabled || this.opponent.combat.wrathTime <= 0
      || this.random() >= this.perception.consequences.wrathDefenseWeight * this.difficulty.defenseMultiplier) return null;
    if (isThreatening(this.opponent, this.self, this.perception.threatMargin) && !this.self.combat.saberThrown
      && this.canSpend(this.opponent.combat.attack.blockStaminaCost * this.self.stats.blockStaminaScale, null, 'block')) {
      this.plan.blockTime = this.perception.blockHoldTime;
      return AiDecision.GUARD;
    }
    this.plan.moveX = -getDirectionTo(this.self, this.opponent);
    this.plan.blockTime = 0;
    return AiDecision.BACK_OFF;
  }

  runStep(step) {
    switch (step) {
      case 'defend':
        return this.tryDefend();
      case 'counter':
        return this.tryCounter();
      case 'shove':
        return this.tryShove();
      case 'recover':
        return this.tryRecoverStamina();
      case 'special':
        return this.trySpecialAttack();
      case 'power':
        return this.tryPower();
      case 'attack':
        return this.tryAttack();
      case 'guard':
        return this.tryGuard();
      default:
        return this.position();
    }
  }

  tryTechnique() {
    const { self, opponent } = this;
    if (!this.powersEnabled || this.attackCooldown > 0 || self.combat.attack || self.combat.saberThrown) {
      return null;
    }
    for (const [slot, id] of Object.entries(self.stats.techniques ?? {})) {
      const move = self.moves[id];
      const reach = move.throwRange ?? getAttackReach(move) + (move.lunge ?? 0) * move.active;
      if (!this.canSpend(move.staminaCost, move) || getGap(self, opponent) >= reach - this.perception.reachMargin) {
        continue;
      }
      if (this.random() >= (this.profile.techniqueChance ?? this.perception.techniqueChance) * this.difficulty.specialMultiplier) {
        return null;
      }
      const direction = getDirectionTo(self, opponent);
      this.plan.moveX = slot === 'forward' ? direction : -direction;
      this.plan.blockTime = 0;
      this.plan.pendingAction = PendingAction.SPECIAL;
      this.attackCooldown = this.difficulty.attackCooldown;
      return AiDecision.TECHNIQUE;
    }
    return null;
  }

  trySpecialAttack() {
    const technique = this.tryTechnique();
    if (technique) {
      return technique;
    }
    const special = this.self.moves.special;
    if (!special || this.attackCooldown > 0 || this.self.combat.attack || !this.canSpend(special.staminaCost, special, special.dash ? 'dash' : 'action')) {
      return null;
    }
    const kind = getSpecialKind(special);
    if (kind === SpecialKind.DASH || !this.isSpecialInRange(kind)) {
      return null;
    }
    if (this.random() >= this.profile.specialChance * this.difficulty.specialMultiplier) {
      return null;
    }
    this.plan.blockTime = 0;
    this.plan.pendingAction = PendingAction.SPECIAL;
    this.plan.chargeHoldTime = kind === SpecialKind.CHARGE ? this.profile.chargeHold : 0;
    this.attackCooldown = this.difficulty.attackCooldown;
    return AiDecision.SPECIAL;
  }

  isSpecialInRange(kind) {
    if (kind === SpecialKind.LEAP) {
      return getGap(this.self, this.opponent) < this.perception.leapGap;
    }
    if (kind === SpecialKind.COUNTER) {
      return !this.opponent.combat.attack && canReach(this.opponent, this.self, this.opponent.stats.attacks.light, -this.perception.threatMargin);
    }
    return this.canReachWith(AttackType.SPECIAL);
  }

  planRecoveryGuard() {
    const { self, plan } = this;
    if (!STUN_STATES.has(self.state) || plan.blockTime > 0) {
      return;
    }
    if (this.random() >= this.difficulty.recoveryGuardChance) {
      return;
    }
    plan.blockTime = getVulnerableTime(self) + this.perception.blockHoldTime;
    plan.punishAfterBlock = this.random() < this.difficulty.blockPunishChance;
  }

  tryDefend() {
    const projectileAnswer = this.tryDefendProjectile();
    if (projectileAnswer) return projectileAnswer;
    const powerAnswer = this.tryDefendPower();
    if (powerAnswer) {
      return powerAnswer;
    }
    if (!isThreatening(this.opponent, this.self, this.perception.threatMargin)) {
      this.plan.blockTime = 0;
      return null;
    }

    if (this.opponent.combat.attackType === AttackType.SHOVE) {
      return this.answerShove();
    }
    if (this.trySpecialAnswer()) {
      return AiDecision.SPECIAL;
    }
    if (this.tryParry()) {
      return AiDecision.PARRY;
    }
    if (this.powersEnabled && this.random() < this.perception.barrierVsSaberChance && this.tryBarrier(this.perception.blockHoldTime)) {
      return AiDecision.POWER;
    }
    if (this.tryWhiffBait()) {
      return AiDecision.BAIT;
    }

    const roll = this.random();
    if (this.tryEvade(roll)) return AiDecision.EVADE;
    const blockChance = this.profile.blockChance * this.difficulty.defenseMultiplier;
    const dodgeChance = this.profile.dodgeChance * this.difficulty.defenseMultiplier;

    if (roll < blockChance && this.allowsNewSpend(this.opponent.combat.attack.blockStaminaCost * this.self.stats.blockStaminaScale, 'block')) {
      this.plan.blockTime = this.perception.blockHoldTime;
      this.plan.punishAfterBlock = !isHeavyAttack(this.opponent.combat.attackType) && this.random() < this.difficulty.blockPunishChance;
      return AiDecision.BLOCK;
    }
    if (roll < blockChance + dodgeChance && this.canSpend(this.self.stats.dodge.staminaCost, null, 'dash')) {
      this.plan.pendingAction = PendingAction.DODGE;
      return AiDecision.DODGE;
    }
    return null;
  }

  getPowerInteraction(power) {
    return resolveInteraction(powersConfig.interactions[power.interaction], getFlowDifference(this.self, this.opponent));
  }

  getPowerScale(power) {
    return this.difficulty.powerAware ? this.getPowerInteraction(power).scale : 1;
  }

  isPowerBlocked(power) {
    if (power.fracture) return false;
    if (this.difficulty.powerAware && isStormShieldUp(this.opponent)) return true;
    if (power.markedRain) return false;
    if (this.difficulty.powerAware && isBarrierUp(this.opponent)) return true;
    if (power.effect === 'lightning' && this.difficulty.powerAware && this.opponent.combat.absorbTime > 0) return true;
    if (this.opponent.state !== FighterState.BLOCKING) {
      return false;
    }
    return !this.difficulty.powerAware || this.getPowerInteraction(power).blockable;
  }

  getPowerCost(power) {
    return power.sizes ? resolveLevelBand(this.self.flowLevel, projectilesConfig[power.sizes].sizes).cost : power.cost;
  }

  canUsePower(power) {
    const { self } = this;
    const reserve = power.channel ? (power.drainPerSecond ?? 0) * this.perception.powerChannelReserve : 0;
    return !self.combat.rainActive && self.flowLevel >= (power.minFlowLevel ?? 0) && self.combat.powerCooldown === 0 && self.flowMeter >= this.getPowerCost(power) + reserve;
  }

  wantsSelfPower(power) {
    if (power.effect === 'absorb') {
      const use = this.perception.powerUse.absorb;
      const incoming = this.opponent.combat.power;
      return isUsingPower(this.opponent) && !incoming.self && incoming.effect !== 'storm'
        && this.opponent.combat.powerEndTime === 0 && this.opponent.stateTime >= this.difficulty.reactionTime
        && isInPowerRange(this.opponent, this.self, this.opponent.combat.power)
        && getFlowDifference(this.self, this.opponent) >= use.minDifference;
    }
    const use = this.perception.selfPowerUse[power.effect];
    const { self } = this;
    if (power.effect === 'wrath') {
      return self.combat.wrathTime === 0 && getGap(self, this.opponent) >= use.minGap;
    }
    return Boolean(use) && self.combat[use.active] === 0 && getGap(self, this.opponent) >= use.minGap
      && (self[use.stat] / self.stats[use.max] < use.below || power.effect === 'heal' && this.rules.wounds && self.combat.wound !== null);
  }

  wantsPower(power) {
    const use = this.perception.powerUse[power.effect];
    const gap = getGap(this.self, this.opponent);
    return Boolean(use) && (use.minGapStrict ? gap > use.minGap : gap >= use.minGap) && gap <= use.maxGap && !this.isPowerBlocked(power)
      && (!use.requireGrounded || this.opponent.grounded)
      && (!use.requireVulnerable || isPunishable(this.opponent) || isPowerRecovering(this.opponent))
      && (use.targetMeterAbove === undefined || this.opponent.flowMeter > use.targetMeterAbove)
      && (!use.avoidPressure || !isThreatening(this.opponent, this.self, this.perception.threatMargin))
      && isInPowerRange(this.self, this.opponent, power) && this.getPowerScale(power) > 0;
  }

  tryJumpFracture() {
    const { self, opponent } = this;
    const wave = opponent.combat.fracture;
    if (!this.powersEnabled || !this.difficulty.powerAware || !wave || wave.hit || !self.grounded
      || !self.canMove && !(self.state === FighterState.BLOCKING && self.combat.blockstun === 0)) return null;
    for (const segment of wave.segments) {
      if (!segment.marked || segment.burst || wave.time < segment.markTime + this.difficulty.reactionTime
        || wave.time >= segment.impactTime || self.x < segment.left || self.x > segment.right) continue;
      this.plan.blockTime = 0;
      this.plan.moveX = 0;
      this.plan.pendingAction = PendingAction.JUMP;
      return AiDecision.JUMP;
    }
    return null;
  }

  trySupremeEscape() {
    const { self } = this;
    const use = this.perception.powerUse.supremePush;
    if (!this.powersEnabled || this.comboHits < use.comboHits || this.comboElapsed >= use.comboWindow) return null;
    for (const slot of POWER_SLOTS) {
      const power = self.stats.power.loadout?.[slot];
      if (power?.escape && getPowerMode(self, power) === 'escape' && this.canUsePower(power)) return this.startPower(slot, 0);
    }
    return null;
  }

  tryPower() {
    const { self } = this;
    const loadout = self.stats.power.loadout;
    if (!this.powersEnabled || !loadout || this.attackCooldown > 0 || !self.canAct) {
      return null;
    }
    const healWeight = this.rules.wounds && self.combat.wound !== null ? this.perception.consequences.woundedHealWeight : 1;
    const chance = (this.profile.powerChance ?? this.perception.powerChance) * this.difficulty.powerMultiplier * healWeight;
    if (this.random() >= chance) {
      return null;
    }
    for (const slot of POWER_SLOTS) {
      const power = loadout[slot];
      if (power && power.effect !== 'barrier' && this.canUsePower(power) && (power.self ? this.wantsSelfPower(power) : this.wantsPower(power))) {
        const [minHold, maxHold] = this.perception.lightningHold;
        const hold = power.channel && !power.automatic
          ? this.perception.powerUse[power.effect]?.holdToLimit ? power.startup + power.maxChannel : minHold + (maxHold - minHold) * this.random() : 0;
        return this.startPower(slot, hold);
      }
    }
    return null;
  }

  startPower(slot, holdTime) {
    const direction = getDirectionTo(this.self, this.opponent);
    this.plan.blockTime = 0;
    this.plan.moveX = slot === 'forward' ? direction : slot === 'back' ? -direction : 0;
    this.plan.pendingAction = PendingAction.POWER;
    this.plan.powerHoldTime = holdTime;
    this.attackCooldown = this.difficulty.attackCooldown;
    return AiDecision.POWER;
  }

  tryBarrier(holdTime) {
    if (!this.powersEnabled) return false;
    if (!this.self.canAct && !(this.self.state === FighterState.BLOCKING && this.self.combat.blockstun === 0)) {
      return false;
    }
    for (const slot of POWER_SLOTS) {
      const barrier = this.self.stats.power.loadout?.[slot];
      if (barrier?.effect === 'barrier' && this.canUsePower(barrier)) {
        this.startPower(slot, holdTime);
        return true;
      }
    }
    return false;
  }

  tryDefendProjectile() {
    if (!this.powersEnabled) return null;
    const projectile = findIncomingProjectile(this.self, this.projectiles, this.perception.projectileHorizon);
    if (!projectile) return null;
    if (this.plan.powerHoldTime > 0) return AiDecision.POWER;
    if (this.plan.blockTime > 0 && Math.sign(projectile.vx) === -this.self.facing && !this.self.combat.saberThrown) return AiDecision.BLOCK;
    if (this.random() >= this.profile.blockChance * this.difficulty.defenseMultiplier) return null;
    if (this.tryBarrier(this.perception.projectileHorizon)) return AiDecision.POWER;
    if (this.self.combat.saberThrown || Math.sign(projectile.vx) !== -this.self.facing) return this.dodgePower();
    this.plan.blockTime = this.perception.projectileHorizon;
    this.plan.punishAfterBlock = false;
    return AiDecision.BLOCK;
  }

  dodgePower() {
    if (!this.canSpend(this.self.stats.dodge.staminaCost, null, 'dash')) return null;
    this.plan.blockTime = 0;
    this.plan.moveX = -getDirectionTo(this.self, this.opponent);
    this.plan.pendingAction = PendingAction.DODGE;
    return AiDecision.DODGE;
  }

  tryDefendPower() {
    const { self, opponent } = this;
    if (!this.powersEnabled || !isUsingPower(opponent)) {
      return null;
    }
    if (opponent.combat.power.stormPhases) return this.tryEscapeStorm();
    for (const slot of POWER_SLOTS) {
      const reaction = self.stats.power.loadout?.[slot];
      if (reaction?.effect === 'absorb' && this.canUsePower(reaction) && this.wantsSelfPower(reaction)
        && (self.canAct || (self.state === FighterState.BLOCKING && self.combat.blockstun === 0))) {
        return this.startPower(slot, 0);
      }
    }
    const { power } = opponent.combat;
    if (power.effect === 'barrier' || power.self || opponent.combat.powerEndTime > 0 || !isInPowerRange(opponent, self, power)) {
      return null;
    }
    if (this.plan.powerHoldTime > 0) return AiDecision.POWER;
    if (this.plan.blockTime > 0) return AiDecision.BLOCK;
    if (this.random() >= this.profile.blockChance * this.difficulty.defenseMultiplier) {
      return null;
    }
    const remaining = Math.max(0, power.startup - opponent.stateTime) + (power.channel ? power.maxChannel : power.active) + this.getProjectileTravelTime(power);
    if (this.random() < this.perception.barrierPreference && this.tryBarrier(remaining)) {
      return AiDecision.POWER;
    }
    const interaction = resolveInteraction(powersConfig.interactions[power.interaction], getFlowDifference(opponent, self));
    if (self.combat.saberThrown || (this.difficulty.powerAware && !interaction.blockable)) return this.dodgePower();
    this.plan.blockTime = remaining + this.perception.blockHoldTime;
    this.plan.punishAfterBlock = false;
    return AiDecision.BLOCK;
  }

  tryEscapeStorm() {
    if (!this.powersEnabled || !this.self.canMove && this.self.state !== FighterState.BLOCKING) return null;
    const margin = this.perception.stormEscapeMargin;
    const mark = findStormThreat(this.self, this.opponent, this.difficulty.reactionTime, margin);
    if (!mark) return null;
    let direction = Math.sign(this.self.x - mark.x) || -getDirectionTo(this.self, this.opponent);
    const clearance = this.opponent.combat.power.strikeWidth / 2 + this.self.width / 2 + margin;
    if (this.arena && (direction < 0 && mark.x - clearance < this.arena.left + this.self.width / 2
      || direction > 0 && mark.x + clearance > this.arena.right - this.self.width / 2)) direction = -direction;
    const distance = clearance - Math.abs(this.self.x - mark.x);
    const time = mark.impactTime - this.opponent.stateTime;
    this.plan.blockTime = 0;
    this.plan.moveX = direction;
    if (distance > this.self.stats.movement.walkSpeed * time && this.canSpend(this.self.stats.dodge.staminaCost, null, 'dash')) {
      this.plan.pendingAction = PendingAction.DODGE;
      return AiDecision.DODGE;
    }
    return AiDecision.BACK_OFF;
  }

  getProjectileTravelTime(power) {
    if (!power.sizes) {
      return 0;
    }
    const { speed } = resolveLevelBand(this.opponent.flowLevel, projectilesConfig[power.sizes].sizes);
    return getGap(this.opponent, this.self) / speed;
  }

  tryEvade(roll) {
    const { self, opponent, difficulty } = this;
    const profile = self.stats.evade ?? evadeConfig.profile;
    const chance = (difficulty.evadeChance ?? 0) * (this.profile.evadeWeight ?? this.perception.evadeWeight);
    if (!evadeConfig.enabled || profile.enabled === false || roll >= chance || getTimeUntilAttackActive(opponent) !== 0) return false;
    if (!self.canAct && !(self.state === FighterState.BLOCKING && self.combat.blockstun === 0)) return false;
    this.plan.blockTime = 0;
    this.plan.punishAfterBlock = false;
    this.plan.evadeDelay = this.random() * difficulty.evadeTimingJitter;
    this.plan.evadeAttack = opponent.combat.attack;
    return true;
  }

  updateEvadeTiming(dt) {
    const { plan, self, opponent } = this;
    if (plan.evadeDelay < 0) return;
    if (!self.isAlive || !opponent.isAlive || opponent.combat.attack !== plan.evadeAttack || getTimeUntilAttackActive(opponent) !== 0 || (!self.canAct && self.state !== FighterState.BLOCKING)) {
      plan.evadeDelay = -1;
      plan.evadeAttack = null;
      return;
    }
    plan.evadeDelay -= dt;
    if (plan.evadeDelay <= 0) {
      plan.evadeDelay = -1;
      plan.evadeAttack = null;
      plan.pendingAction = PendingAction.EVADE;
    }
  }

  tryParry() {
    const { attack, attackType } = this.opponent.combat;
    if (!isHeavyAttack(attackType) || getAttackPhase(attack, this.opponent.stateTime) !== AttackPhase.STARTUP) {
      return false;
    }
    if (this.random() >= this.difficulty.parryChance + this.getHabitBonus(this.habits.heavyRatio, 'heavy')) {
      return false;
    }

    const { perfectWindow, window } = this.self.stats.parry;
    const aimsPerfect = this.random() < this.difficulty.perfectParryChance;
    const lead = aimsPerfect ? perfectWindow / 2 : (perfectWindow + window) / 2;
    const delay = attack.startup - this.opponent.stateTime - lead;
    if (delay < 0) {
      return false;
    }

    this.plan.blockTime = 0;
    this.plan.parryDelay = delay;
    return true;
  }

  getHabitBonus(ratio, habit) {
    const { thresholds, bonuses } = this.perception.habits;
    return ratio >= thresholds[habit] ? bonuses[habit] * this.difficulty.adaptation : 0;
  }

  trySpecialAnswer() {
    const special = this.self.moves.special;
    if (!special || !this.canSpend(special.staminaCost, special, special.dash ? 'dash' : 'action')) {
      return false;
    }
    const { attack, attackType } = this.opponent.combat;
    const opponentPhase = getAttackPhase(attack, this.opponent.stateTime);
    const answers =
      (special.counter && opponentPhase === AttackPhase.STARTUP) ||
      (special.armor && !isHeavyAttack(attackType)) ||
      (special.dash && isHeavyAttack(attackType) && opponentPhase === AttackPhase.STARTUP);
    if (!answers || this.random() >= this.profile.specialChance * this.difficulty.specialMultiplier) {
      return false;
    }
    this.plan.blockTime = 0;
    this.plan.pendingAction = PendingAction.SPECIAL;
    return true;
  }

  tryWhiffBait() {
    const { attack } = this.opponent.combat;
    if (getAttackPhase(attack, this.opponent.stateTime) !== AttackPhase.STARTUP) {
      return false;
    }
    if (this.random() >= this.difficulty.whiffBaitChance) {
      return false;
    }
    this.plan.blockTime = 0;
    this.plan.moveX = -getDirectionTo(this.self, this.opponent);
    return true;
  }

  answerShove() {
    if (this.canReachWith(AttackType.LIGHT) && this.random() < this.profile.blockChance * this.difficulty.defenseMultiplier) {
      return this.startAttack(false) ? AiDecision.COUNTER : null;
    }
    return null;
  }

  tryShove() {
    const barrier = this.powersEnabled && isBarrierUp(this.opponent);
    const focus = this.rules.focusEvade && this.opponent.combat.focusTime > 0 && isNeutralForFocus(this.opponent);
    if ((!barrier && !focus && this.opponent.state !== FighterState.BLOCKING) || this.attackCooldown > 0 || !this.canReachWith(AttackType.SHOVE)) {
      return null;
    }
    if (!this.canSpend(this.self.stats.attacks.shove.staminaCost)) {
      return null;
    }
    const focusWeight = focus ? this.perception.consequences.focusShoveWeight : 1;
    const shoveChance = (this.profile.shoveChance * this.difficulty.shoveMultiplier + this.getHabitBonus(this.habits.blockRatio, 'block')) * focusWeight;
    if (this.random() >= shoveChance) {
      return null;
    }

    this.plan.blockTime = 0;
    this.plan.pendingAction = PendingAction.SHOVE;
    this.attackCooldown = this.difficulty.attackCooldown;
    return AiDecision.SHOVE;
  }

  tryCounter() {
    const power = this.opponent.combat.power;
    if (this.powersEnabled && power?.self && !power.reaction && this.attackCooldown === 0) {
      if (this.canReachWith(AttackType.LIGHT)) return this.startAttack(false, true) ? AiDecision.COUNTER : null;
      this.plan.moveX = getDirectionTo(this.self, this.opponent);
      return AiDecision.APPROACH;
    }
    if (!isPunishable(this.opponent) || this.attackCooldown > 0 || !this.canReachWith(AttackType.LIGHT)) {
      return null;
    }
    if (this.random() >= this.profile.counterChance) {
      return null;
    }

    return this.startAttack(this.wantsHeavyPunish(), true) ? AiDecision.COUNTER : null;
  }

  wantsHeavyPunish() {
    if (this.wantsWound()) return true;
    if (this.opponent.state === FighterState.STUNNED) {
      return true;
    }
    if (!this.difficulty.smartPunish) {
      return false;
    }
    const heavy = this.self.stats.attacks.heavy;
    return getVulnerableTime(this.opponent) > heavy.startup + this.perception.punishMargin;
  }

  tryRecoverStamina() {
    const staminaRatio = this.self.stamina / this.self.stats.maxStamina;
    if (staminaRatio >= this.profile.retreatStaminaRatio) {
      return null;
    }

    const safeGap = this.profile.preferredGap + this.perception.safeGapExtra;
    if (getGap(this.self, this.opponent) < safeGap) {
      this.plan.moveX = -getDirectionTo(this.self, this.opponent);
      if (this.tryMovementJump()) return AiDecision.JUMP;
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

    const heavyChance = this.wantsWound() ? Math.max(this.profile.heavyChance, this.perception.consequences.exhaustionHeavyWeight) : this.profile.heavyChance;
    const wantsHeavy = this.random() < heavyChance;
    return this.startAttack(wantsHeavy) ? AiDecision.ATTACK : null;
  }

  tryGuard() {
    const opponentReach = this.opponent.stats.attacks.light;
    if (!canReach(this.opponent, this.self, opponentReach, -this.perception.threatMargin)) {
      return null;
    }
    if (!this.allowsNewSpend(opponentReach.blockStaminaCost * this.self.stats.blockStaminaScale, 'block')) return null;
    const guardChance = this.profile.guardChance * this.difficulty.defenseMultiplier + this.getHabitBonus(this.habits.lightRatio, 'light');
    if (this.random() >= guardChance) {
      return null;
    }

    this.plan.blockTime = this.perception.blockHoldTime;
    this.plan.punishAfterBlock = this.random() < this.difficulty.blockPunishChance;
    return AiDecision.GUARD;
  }

  position() {
    const gap = getGap(this.self, this.opponent);
    const direction = getDirectionTo(this.self, this.opponent);
    const { preferredGap } = this.profile;

    if (gap > preferredGap) {
      this.plan.moveX = direction;
      if (this.tryMovementJump()) return AiDecision.JUMP;
      return AiDecision.APPROACH;
    }
    if (gap < preferredGap * this.profile.closeGapRatio) {
      this.plan.moveX = -direction;
      if (this.tryCornerJump() || this.tryMovementJump()) return AiDecision.JUMP;
      return AiDecision.BACK_OFF;
    }
    return null;
  }

  tryMovementJump() {
    if (!this.self.canAct || this.self.stats.movement.maxJumps < 2 || !(this.difficulty.jumpChance > 0)) return false;
    if (this.random() >= this.difficulty.jumpChance * this.getAerialWeight()) return false;
    this.plan.blockTime = 0;
    this.plan.pendingAction = PendingAction.JUMP;
    return true;
  }

  getAerialWeight() {
    return this.profile.aerialWeight ?? 1;
  }

  isCornered() {
    const { self, opponent, arena } = this;
    if (!arena) return false;
    const wallGap = opponent.x > self.x ? self.left - arena.left : arena.right - self.right;
    return wallGap <= this.perception.cornerMargin;
  }

  tryCornerJump() {
    const chance = (this.difficulty.cornerJumpChance ?? 0) * this.getAerialWeight();
    if (!this.self.canAct || !(chance > 0) || !this.isCornered() || this.random() >= chance) return false;
    this.plan.moveX = getDirectionTo(this.self, this.opponent);
    this.plan.blockTime = 0;
    this.plan.pendingAction = PendingAction.JUMP;
    return true;
  }

  tryAirDash() {
    const { self, opponent } = this;
    const chance = (this.difficulty.airDashChance ?? 0) * this.getAerialWeight();
    if (!(chance > 0) || self.combat.airDashUsed || !this.canSpend(self.stats.airDash.staminaCost, null, 'dash')) return false;
    const above = opponent.y - self.y >= opponent.height * this.perception.airDashClearance;
    const crossing = above && getGap(self, opponent) <= this.perception.airDashCrossGap;
    if (!crossing && !this.isCornered()) return false;
    if (this.random() >= chance) return false;
    this.plan.moveX = getDirectionTo(self, opponent);
    this.plan.blockTime = 0;
    this.plan.pendingAction = PendingAction.DODGE;
    return true;
  }

  tryAirJump() {
    const { self, opponent } = this;
    if (getMaxJumps(self) < 2 || Math.max(1, self.combat.jumpsUsed) >= getMaxJumps(self) || self.vy < this.perception.airJumpFallSpeed) return false;
    if (this.random() >= (this.difficulty.airJumpChance ?? 0)) return false;
    const retreat = self.stamina / self.stats.maxStamina < this.profile.retreatStaminaRatio;
    this.plan.moveX = getDirectionTo(self, opponent) * (retreat ? -1 : 1);
    this.plan.blockTime = 0;
    this.plan.pendingAction = PendingAction.JUMP;
    return true;
  }

  canReachWith(attackType) {
    const attack = this.self.stats.attacks[attackType];
    return canReach(this.self, this.opponent, attack, this.perception.reachMargin);
  }

  startAttack(wantsHeavy, isPunish = false) {
    const { attacks } = this.self.stats;
    const useHeavy = wantsHeavy && this.canSpend(attacks.heavy.staminaCost, attacks.heavy) && this.canReachWith(AttackType.HEAVY);

    if (!useHeavy && !this.canSpend(attacks.light.staminaCost, attacks.light)) {
      return false;
    }

    const action = useHeavy ? PendingAction.HEAVY_ATTACK : PendingAction.LIGHT_ATTACK;
    if (useHeavy && this.wantsWound() && this.canUseForwardHeavy()) {
      this.plan.moveX = getDirectionTo(this.self, this.opponent);
    }
    this.plan.blockTime = 0;
    this.attackCooldown = this.difficulty.attackCooldown;
    if (useHeavy && !isPunish && this.self.stats.feint && this.random() < this.profile.feintChance) {
      this.plan.feintDelay = attacks.heavy.startup * this.perception.feintAt + this.difficulty.attackTell;
    }
    if (!isPunish && this.difficulty.attackTell > 0) {
      this.plan.delayedAction = action;
      this.plan.actionDelay = this.difficulty.attackTell;
      return true;
    }
    this.plan.pendingAction = action;
    return true;
  }
}

import { airDashConfig } from '../config/airDashConfig.js';
import { evadeConfig } from '../config/evadeConfig.js';
import { powersConfig } from '../config/powersConfig.js';
import { combatRulesConfig, resolveCombatRules } from '../config/combatRulesConfig.js';
import { FighterState } from '../entities/fighterStates.js';
import { canAfford, getStaminaCost, spendStamina } from '../systems/StaminaSystem.js';
import { CombatAction, clearActionBuffer, updateActionBuffer } from './actionBuffer.js';
import { clamp } from '../utils/math.js';
import { hashUnit } from '../utils/random.js';
import { ATTACK_STATES, AttackPhase, AttackType, getAttackDuration, getAttackPhase, getChargeLevel, isSaberAttack } from './attackPhases.js';
import { CombatEvent, createCombatEvent } from './combatEvents.js';
import { boxesOverlap, comesFromFront, createBox, getAttackHitbox, getHurtbox, hasActiveHitbox, hasHurtbox, isBladeInvulnerable, isGuardingAgainst, isInvulnerable } from './hitboxes.js';
import { PowerSystem, isBarrierUp, selectPower, selectTechnique } from './PowerSystem.js';
import { ProjectileSystem } from './ProjectileSystem.js';
import { StatusSystem } from './StatusSystem.js';
import { projectilesConfig } from '../config/projectilesConfig.js';
import { isStormShieldUp } from './StormSystem.js';

const PUNISHED_STATES = new Set([FighterState.STAGGERED, FighterState.STUNNED]);

function isInCounterStance(defender, attacker) {
  const { attack } = defender.combat;
  return Boolean(attack?.counter) && getAttackPhase(attack, defender.stateTime) === AttackPhase.STARTUP && comesFromFront(defender, attacker);
}

function hasArmor(fighter) {
  const { attack, armorHits } = fighter.combat;
  return Boolean(attack?.armor) && armorHits > 0 && getAttackPhase(attack, fighter.stateTime) !== AttackPhase.RECOVERY;
}

function isOpenToPunish(fighter) {
  const { attack } = fighter.combat;
  return PUNISHED_STATES.has(fighter.state) || (attack !== null && getAttackPhase(attack, fighter.stateTime) === AttackPhase.RECOVERY);
}

function getSweetSpotScale(attacker, defender, attack) {
  const { sweetSpot } = attack;
  if (!sweetSpot) {
    return 1;
  }
  const gap = Math.abs(defender.x - attacker.x) - (attacker.width + defender.width) / 2;
  const ratio = clamp(gap / attack.hitbox.reach, 0, 1);
  if (ratio >= sweetSpot.tipFrom) {
    return sweetSpot.tipScale;
  }
  return ratio < sweetSpot.innerTo ? sweetSpot.innerScale : 1;
}

function chooseFallDirection(fighter, arena, roomMargin) {
  const backwardX = -fighter.facing;
  const wallX = backwardX > 0 ? arena.right : arena.left;
  const roomBehind = Math.abs(wallX - fighter.x);
  return roomBehind >= fighter.height + roomMargin ? backwardX : -backwardX;
}

export class CombatSystem {
  constructor(arena, { inputBuffer, fallRoomMargin, clash }, { rules = {}, friction = 0 } = {}) {
    this.arena = arena;
    this.rules = resolveCombatRules(rules);
    this.inputBuffer = inputBuffer;
    this.fallRoomMargin = fallRoomMargin;
    this.clash = clash;
    this.otherHitbox = createBox();
    this.events = [];
    this.hitbox = createBox();
    this.hurtbox = createBox();
    this.contacts = [];
    this.powers = new PowerSystem(this, powersConfig, rules.powers === true, friction);
    this.projectiles = new ProjectileSystem(this, projectilesConfig);
    this.statuses = new StatusSystem(this);
  }

  update(fighters, dt) {
    this.events.length = 0;
    this.projectiles.fighters = fighters;

    for (const fighter of fighters) {
      if (fighter.state === FighterState.BLADE_LOCK) continue;
      this.updateTimers(fighter, dt);
      updateActionBuffer(fighter, dt, this.inputBuffer);
      this.startActions(fighter);
      this.applyActionMovement(fighter);
    }
    this.powers.resolve(fighters, dt);
  }

  spendStamina(fighter, amount, cause = 'spend') {
    const exhausted = fighter.combat.exhausted;
    spendStamina(fighter, amount, cause, this.rules);
    if (!exhausted && fighter.combat.exhausted) {
      this.emitAction(CombatEvent.EXHAUSTION, fighter, cause);
    }
  }

  updateTimers(fighter, dt) {
    const { combat, stats } = fighter;

    if (fighter.grounded) {
      combat.airAttackUsed = false;
      combat.airDashUsed = false;
    }
    this.updateParryTimers(fighter, dt);
    this.updateCharge(fighter, dt);
    combat.riposteTime = Math.max(0, combat.riposteTime - dt);

    switch (fighter.state) {
      case FighterState.ATTACKING:
      case FighterState.HEAVY_ATTACK:
        if (fighter.stateTime >= getAttackDuration(combat.attack)) {
          fighter.clearAttack();
          fighter.setState(FighterState.IDLE);
        }
        break;
      case FighterState.DODGING:
        if (fighter.stateTime >= combat.dodgeProfile.duration) {
          if (combat.evading) {
            combat.evadeStreak = 0;
          }
          combat.passThrough = false;
          combat.evading = false;
          fighter.setState(FighterState.IDLE);
        }
        break;
      case FighterState.HIT:
      case FighterState.STAGGERED:
      case FighterState.STUNNED:
        if (combat.chokeTime <= 0 && fighter.stateTime + (combat.chokeRelease > 0 && fighter.state === FighterState.STAGGERED ? Number.EPSILON : 0) >= combat.stunDuration) {
          combat.chokeRelease = 0;
          fighter.setState(FighterState.IDLE);
        }
        break;
      case FighterState.BLOCKING:
        combat.blockstun = Math.max(0, combat.blockstun - dt);
        if (combat.blockstun === 0 && !fighter.intent.block && !combat.parryArmed) {
          fighter.setState(FighterState.IDLE);
        }
        break;
      default:
        break;
    }
  }

  updateCharge(fighter, dt) {
    const { combat } = fighter;
    const { attack } = combat;
    if (!attack?.charge || !fighter.intent.specialHeld) {
      return;
    }
    const { charge } = attack;
    const maxChargeTime = charge.levelTime * (charge.levels - 1);
    if (combat.chargeTime >= maxChargeTime || fighter.stateTime < attack.startup * charge.holdAt) {
      return;
    }
    combat.chargeTime += dt;
    fighter.stateTime -= dt;
  }

  updateParryTimers(fighter, dt) {
    const { combat } = fighter;
    combat.parryLockout = Math.max(0, combat.parryLockout - dt);
    if (!combat.parryArmed) {
      return;
    }

    combat.parryTime += dt;
    if (combat.parryTime >= fighter.stats.parry.window || fighter.state !== FighterState.BLOCKING) {
      combat.parryArmed = false;
      combat.parryLockout = fighter.stats.parry.lockout;
    }
  }

  startActions(fighter) {
    if ([CombatAction.POWER, CombatAction.FOURTH_POWER].includes(fighter.combat.bufferedAction) && selectPower(fighter)?.escape
      && this.powers.canCast(fighter, selectPower(fighter)) && !fighter.canAct
      && this.tryBufferedAction(fighter, fighter.combat.bufferedAction)) return;
    if (this.tryFeint(fighter) || this.tryAttackChain(fighter)) {
      return;
    }
    this.releaseFreeRecovery(fighter);
    if (fighter.state === FighterState.BLOCKING && this.startActionFromBlock(fighter)) {
      return;
    }
    if (!fighter.canAct) {
      if (!this.tryAirDash(fighter)) {
        this.tryAirAttack(fighter);
      }
      return;
    }

    const action = fighter.combat.bufferedAction;
    const started = action !== null && this.tryBufferedAction(fighter, action);

    if (!started && fighter.intent.block && !fighter.combat.saberThrown) {
      fighter.combat.blockstun = 0;
      fighter.setState(FighterState.BLOCKING);
    }
  }

  releaseFreeRecovery(fighter) {
    const { combat } = fighter;
    if (!combat.freeRecovery || !combat.attack || getAttackPhase(combat.attack, fighter.stateTime) !== AttackPhase.RECOVERY) {
      return;
    }
    if (combat.bufferedAction === null && !fighter.intent.block) {
      return;
    }
    fighter.clearAttack();
    fighter.setState(FighterState.IDLE);
  }

  tryFeint(fighter) {
    const { combat, stats } = fighter;
    if (!stats.feint || combat.bufferedAction !== CombatAction.PARRY || combat.attack?.type !== AttackType.HEAVY) {
      return false;
    }
    if (getAttackPhase(combat.attack, fighter.stateTime) !== AttackPhase.STARTUP || !canAfford(fighter, getStaminaCost(fighter, stats.feint.staminaCost))) {
      return false;
    }
    clearActionBuffer(fighter);
    this.spendStamina(fighter, getStaminaCost(fighter, stats.feint.staminaCost));
    const { attackType } = combat;
    fighter.clearAttack();
    fighter.setState(FighterState.IDLE);
    this.emitAction(CombatEvent.FEINT, fighter, attackType);
    return true;
  }

  tryAirDash(fighter) {
    const { combat, stats } = fighter;
    if (combat.bufferedAction !== CombatAction.DODGE || fighter.grounded || fighter.state !== FighterState.JUMPING) {
      return false;
    }
    clearActionBuffer(fighter);
    const profile = stats.airDash;
    if (!airDashConfig.enabled || combat.airDashUsed || !canAfford(fighter, getStaminaCost(fighter, profile.staminaCost, 'dash'))) {
      this.emitAction(CombatEvent.ACTION_REJECTED, fighter, null);
      return true;
    }
    this.spendStamina(fighter, getStaminaCost(fighter, profile.staminaCost, 'dash'));
    combat.airDashUsed = true;
    const { moveX } = fighter.intent;
    this.startDodge(fighter, profile, moveX !== 0 ? Math.sign(moveX) : fighter.facing, profile.passThrough);
    fighter.vy = -profile.lift;
    return true;
  }

  tryAirAttack(fighter) {
    const { bufferedAction } = fighter.combat;
    if (fighter.grounded || fighter.state !== FighterState.JUMPING || fighter.combat.airAttackUsed) {
      return;
    }
    if (bufferedAction !== CombatAction.LIGHT_ATTACK && bufferedAction !== CombatAction.HEAVY_ATTACK) {
      return;
    }
    clearActionBuffer(fighter);
    const airType = bufferedAction === CombatAction.HEAVY_ATTACK && fighter.moves[AttackType.AIR_HEAVY] ? AttackType.AIR_HEAVY : AttackType.AIR;
    if (this.tryAttack(fighter, airType)) {
      fighter.combat.airAttackUsed = true;
    } else {
      this.emitAction(CombatEvent.ACTION_REJECTED, fighter, airType);
    }
  }

  tryAttackChain(fighter) {
    const { combat, moves } = fighter;
    if (!combat.attack || !combat.attackConnected || combat.bufferedAction !== CombatAction.LIGHT_ATTACK) {
      return false;
    }
    if (getAttackPhase(combat.attack, fighter.stateTime) !== AttackPhase.RECOVERY) {
      return false;
    }
    const next = combat.attack.cancelsInto?.find((id) => moves[id]?.type === AttackType.LIGHT);
    if (!next) {
      return false;
    }
    clearActionBuffer(fighter);
    if (this.tryAttack(fighter, next)) {
      return true;
    }
    this.emitAction(CombatEvent.ACTION_REJECTED, fighter, next);
    return false;
  }

  startActionFromBlock(fighter) {
    const { bufferedAction, blockstun } = fighter.combat;
    if (bufferedAction === CombatAction.PARRY) {
      clearActionBuffer(fighter);
      this.armParry(fighter);
      return false;
    }
    if ((bufferedAction === CombatAction.SHOVE || bufferedAction === CombatAction.EVADE || [CombatAction.POWER, CombatAction.FOURTH_POWER].includes(bufferedAction)) && blockstun === 0 && fighter.grounded) {
      return this.tryBufferedAction(fighter, bufferedAction);
    }
    return false;
  }

  tryBufferedAction(fighter, action) {
    const moveX = fighter.combat.bufferedMoveX;
    clearActionBuffer(fighter);
    if ([CombatAction.POWER, CombatAction.FOURTH_POWER].includes(action) && !this.powers.enabled) {
      return false;
    }
    const started = this.tryAction(fighter, action, moveX ?? fighter.intent.moveX);
    if (!started) {
      this.emitAction(CombatEvent.ACTION_REJECTED, fighter, [CombatAction.POWER, CombatAction.FOURTH_POWER].includes(action) ? CombatAction.POWER : null);
    }
    return started;
  }

  tryAction(fighter, action, moveX) {
    switch (action) {
      case CombatAction.EVADE:
        return this.tryEvade(fighter);
      case CombatAction.DODGE:
        return this.tryDodge(fighter);
      case CombatAction.SHOVE:
        return this.tryAttack(fighter, AttackType.SHOVE);
      case CombatAction.POWER:
        return this.powers.tryCast(fighter, false, moveX);
      case CombatAction.FOURTH_POWER:
        return this.powers.tryCast(fighter, true);
      case CombatAction.SPECIAL:
        return this.trySpecial(fighter, moveX);
      case CombatAction.HEAVY_ATTACK:
        return this.tryAttack(fighter, fighter.intent.moveX === fighter.facing ? AttackType.FORWARD_HEAVY : AttackType.HEAVY);
      case CombatAction.LIGHT_ATTACK:
        return this.tryAttack(fighter, fighter.combat.riposteTime > 0 ? AttackType.RIPOSTE : AttackType.LIGHT);
      case CombatAction.PARRY:
        return this.startParry(fighter);
      default:
        return false;
    }
  }

  trySpecial(fighter, moveX) {
    if (fighter.combat.rainActive) return false;
    const technique = this.powers.enabled ? selectTechnique(fighter, moveX) : null;
    if (technique) {
      return this.tryAttack(fighter, technique);
    }
    const move = fighter.moves[AttackType.SPECIAL];
    if (!move) {
      return false;
    }
    if (move.leap) {
      return this.tryLeap(fighter, move);
    }
    return move.dash ? this.tryDash(fighter, move) : this.tryAttack(fighter, AttackType.SPECIAL);
  }

  tryLeap(fighter, move) {
    if (!canAfford(fighter, getStaminaCost(fighter, move.staminaCost))) {
      return false;
    }
    this.spendStamina(fighter, getStaminaCost(fighter, move.staminaCost));
    fighter.vx = fighter.facing * move.leap.speedX;
    fighter.vy = -move.leap.speedY;
    fighter.grounded = false;
    fighter.combat.jumpsUsed = 1;
    fighter.combat.airAttackUsed = false;
    fighter.setState(FighterState.JUMPING);
    this.emitAction(CombatEvent.ATTACK_START, fighter, AttackType.SPECIAL);
    return true;
  }

  tryDash(fighter, move) {
    if (!canAfford(fighter, getStaminaCost(fighter, move.staminaCost, 'dash'))) {
      return false;
    }
    this.spendStamina(fighter, getStaminaCost(fighter, move.staminaCost, 'dash'));
    const { moveX } = fighter.intent;
    const direction = move.dash.followInput ? (moveX !== 0 ? Math.sign(moveX) : -fighter.facing) : fighter.facing;
    this.startDodge(fighter, move.dash, direction, move.dash.passThrough);
    this.emitAction(CombatEvent.ATTACK_START, fighter, AttackType.SPECIAL);
    return true;
  }

  startParry(fighter) {
    if (fighter.combat.saberThrown) {
      return false;
    }
    fighter.combat.blockstun = 0;
    fighter.setState(FighterState.BLOCKING);
    this.armParry(fighter);
    return true;
  }

  armParry(fighter) {
    const { combat } = fighter;
    if (combat.parryLockout > 0 || combat.parryArmed) {
      return;
    }
    combat.parryArmed = true;
    combat.parryTime = 0;
  }

  tryAttack(fighter, attackType) {
    if (fighter.combat.rainActive) return false;
    const attack = fighter.moves[attackType];
    if (fighter.combat.saberThrown && isSaberAttack(attackType) || !canAfford(fighter, getStaminaCost(fighter, attack.staminaCost))) {
      return false;
    }

    this.spendStamina(fighter, getStaminaCost(fighter, attack.staminaCost));
    fighter.combat.riposteTime = 0;
    fighter.combat.evadeStreak = 0;
    fighter.clearAttack();
    fighter.combat.attack = attack;
    fighter.combat.attackType = attackType;
    fighter.combat.armorHits = attack.armor ? attack.armor.hits : 0;
    fighter.combat.chargeTime = 0;
    fighter.restartState(ATTACK_STATES[attack.type ?? attackType]);
    this.emitAction(CombatEvent.ATTACK_START, fighter, attackType);
    return true;
  }

  tryEvade(fighter) {
    if (!evadeConfig.enabled) return false;
    const profile = fighter.stats.evade ?? evadeConfig.profile;
    if (profile.enabled === false) return false;
    this.startDodge(fighter, profile, -fighter.facing, false);
    fighter.combat.evading = true;
    return true;
  }

  tryDodge(fighter) {
    const { dodge } = fighter.stats;
    if (!canAfford(fighter, getStaminaCost(fighter, dodge.staminaCost, 'dash'))) {
      return false;
    }

    this.spendStamina(fighter, getStaminaCost(fighter, dodge.staminaCost, 'dash'));
    const { moveX } = fighter.intent;
    this.startDodge(fighter, dodge, moveX !== 0 ? Math.sign(moveX) : -fighter.facing, dodge.passThrough === true);
    return true;
  }

  startDodge(fighter, profile, direction, passThrough) {
    fighter.combat.evading = false;
    fighter.combat.evadeSucceeded = false;
    fighter.combat.dodgeProfile = profile;
    fighter.combat.dodgeDirection = direction;
    fighter.combat.passThrough = passThrough;
    fighter.restartState(FighterState.DODGING);
    this.emitAction(CombatEvent.DODGE, fighter, null);
  }

  applyActionMovement(fighter) {
    const { combat } = fighter;

    if (fighter.state === FighterState.DODGING) {
      const moving = !combat.evading || fighter.stateTime < combat.dodgeProfile.movementTime;
      fighter.vx = moving ? combat.dodgeDirection * combat.dodgeProfile.speed : 0;
      return;
    }

    if (combat.attack && !combat.lungeApplied && getAttackPhase(combat.attack, fighter.stateTime) === AttackPhase.ACTIVE) {
      if (combat.attack.projectile) {
        this.projectiles.spawnSaber(fighter, combat.attackType);
      }
      fighter.vx = fighter.facing * combat.attack.lunge;
      if (combat.attack.dive && !fighter.grounded) {
        fighter.vy = combat.attack.dive;
      }
      combat.lungeApplied = true;
    }
  }

  resolveHits(fighters) {
    this.resolveClashes(fighters);
    this.findContacts(fighters);

    for (const contact of this.contacts) {
      contact.attacker.combat.hasHit = true;
    }
    for (const contact of this.contacts) {
      this.resolveContact(contact);
    }
  }

  resolveClashes(fighters) {
    for (let i = 0; i < fighters.length; i += 1) {
      for (let j = i + 1; j < fighters.length; j += 1) {
        this.tryClash(fighters[i], fighters[j]);
      }
    }
  }

  tryClash(a, b) {
    if (!hasActiveHitbox(a) || !hasActiveHitbox(b)) {
      return;
    }
    if (!isSaberAttack(a.combat.attackType) || !isSaberAttack(b.combat.attackType)) {
      return;
    }

    const boxA = getAttackHitbox(a, a.combat.attack, this.hitbox);
    const boxB = getAttackHitbox(b, b.combat.attack, this.otherHitbox);
    if (!boxesOverlap(boxA, boxB)) {
      return;
    }

    if (this.bladeLocks?.tryStart(a, b)) return;

    const light = a.combat.attack.type === AttackType.LIGHT && b.combat.attack.type === AttackType.LIGHT;
    this.events.push(
      createCombatEvent(CombatEvent.CLASH, {
        attacker: a,
        defender: b,
        attackType: a.combat.attackType,
        light,
        x: (Math.max(boxA.left, boxB.left) + Math.min(boxA.right, boxB.right)) / 2,
        y: (Math.max(boxA.top, boxB.top) + Math.min(boxA.bottom, boxB.bottom)) / 2,
      }),
    );
    if (light) {
      this.deflect(a, b, this.clash.lightPushback);
      this.deflect(b, a, this.clash.lightPushback);
      return;
    }
    this.recoil(a, b);
    this.recoil(b, a);
  }

  deflect(fighter, opponent, pushback) {
    const { combat } = fighter;
    combat.hasHit = true;
    combat.attackConnected = true;
    combat.freeRecovery = true;
    combat.lungeApplied = true;
    fighter.vx = (Math.sign(fighter.x - opponent.x) || -fighter.facing) * pushback;
  }

  recoil(fighter, opponent) {
    const awayFromOpponent = Math.sign(fighter.x - opponent.x) || -fighter.facing;

    fighter.clearAttack();
    fighter.vx = awayFromOpponent * this.clash.pushback;
    fighter.combat.stunDuration = this.clash.recoil;
    fighter.restartState(FighterState.HIT);
  }

  findContacts(fighters) {
    this.contacts.length = 0;

    for (const attacker of fighters) {
      if (!hasActiveHitbox(attacker)) {
        continue;
      }
      const { attack, attackType } = attacker.combat;
      getAttackHitbox(attacker, attack, this.hitbox);

      for (const defender of fighters) {
        const evaded = defender.combat.evading && isInvulnerable(defender);
        if (defender === attacker || (!hasHurtbox(defender) && !(defender.isAlive && evaded))) {
          continue;
        }
        if (boxesOverlap(this.hitbox, getHurtbox(defender, this.hurtbox))) {
          this.contacts.push({
            attacker,
            defender,
            attack,
            attackType,
            evaded,
            x: (Math.max(this.hitbox.left, this.hurtbox.left) + Math.min(this.hitbox.right, this.hurtbox.right)) / 2,
            y: (Math.max(this.hitbox.top, this.hurtbox.top) + Math.min(this.hitbox.bottom, this.hurtbox.bottom)) / 2,
          });
          break;
        }
      }
    }
  }

  resolveContact(contact) {
    if (!contact.defender.isAlive || isSaberAttack(contact.attackType) && isBladeInvulnerable(contact.defender)) {
      return;
    }
    if (contact.evaded) {
      const { defender } = contact;
      defender.combat.evadeSucceeded = true;
      defender.combat.evadeStreak += 1;
      defender.combat.evading = false;
      defender.combat.passThrough = false;
      defender.vx = 0;
      defender.setState(FighterState.IDLE);
      this.emit(CombatEvent.EVADE_SUCCESS, contact);
      return;
    }
    if (isStormShieldUp(contact.defender)) {
      this.emit(CombatEvent.POWER_ABSORBED, contact);
      return;
    }
    if (this.statuses.tryAutoEvade(contact)) {
      this.emit(CombatEvent.EVADE_SUCCESS, contact);
      return;
    }
    if (contact.attackType === AttackType.SHOVE) {
      this.applyShove(contact);
    } else if (isBarrierUp(contact.defender)) {
      this.resolveBarrierBlock(contact);
    } else if (isInCounterStance(contact.defender, contact.attacker)) {
      this.resolveCounter(contact);
    } else if (!isGuardingAgainst(contact.defender, contact.attacker)) {
      this.applyHit(contact);
    } else if (contact.defender.combat.parryArmed) {
      this.resolveParry(contact);
    } else {
      this.resolveBlock(contact);
    }
  }

  applyShove(contact) {
    const { attacker, defender, attack } = contact;

    this.spendStamina(defender, attack.staminaDamage, 'drain');
    defender.clearAttack();
    defender.vx = attacker.facing * attack.knockback;
    defender.combat.parryArmed = false;
    defender.combat.blockstun = 0;
    defender.combat.bladeHitSequence += 1;
    defender.combat.stunDuration = attack.hitstun;
    defender.restartState(FighterState.STAGGERED);
    this.emit(CombatEvent.SHOVE, contact);
  }

  resolveBarrierBlock(contact) {
    const { attacker, defender, attack } = contact;
    attacker.combat.attackConnected = true;
    defender.vx = attacker.facing * attack.blockPushback * defender.combat.power.saberPushback;
    this.emit(CombatEvent.POWER_ABSORBED, contact);
  }

  resolveCounter(contact) {
    const { attacker, defender } = contact;
    const { counter } = defender.combat.attack;

    attacker.clearAttack();
    attacker.vx = -attacker.facing * defender.stats.parry.attackerRecoil;
    attacker.combat.stunDuration = counter.stagger;
    attacker.restartState(FighterState.STAGGERED);

    defender.vx = 0;
    this.emit(counter.event, contact);
    this.tryAttack(defender, counter.move);
  }

  resolveParry(contact) {
    const { attacker, defender, attack } = contact;
    const { parry } = defender.stats;
    const perfect = defender.combat.parryTime < parry.perfectWindow;
    const staggers = perfect && attack.type === AttackType.HEAVY;
    const staminaDamage = attack.blockStaminaCost * (perfect ? parry.perfectStaminaDamageMultiplier : 1);

    this.spendStamina(attacker, staminaDamage, 'drain');
    if (staggers) {
      attacker.clearAttack();
      attacker.vx = -attacker.facing * parry.attackerRecoil;
      attacker.combat.stunDuration = parry.perfectStagger;
      attacker.restartState(FighterState.STAGGERED);
    } else {
      this.deflect(attacker, defender, parry.attackerRecoil);
    }
    contact.staggered = staggers;

    defender.combat.parryArmed = false;
    defender.combat.blockstun = 0;
    defender.combat.riposteTime = staggers ? parry.perfectStagger : 0;
    defender.vx = 0;
    if (perfect) {
      defender.stamina = Math.min(defender.stats.maxStamina, defender.stamina + parry.perfectStaminaGain);
    }
    defender.setState(FighterState.IDLE);

    this.powers.onParry(defender);
    this.emit(perfect ? CombatEvent.PERFECT_PARRY : CombatEvent.PARRY, contact);
  }

  resolveBlock(contact) {
    const { attacker, defender, attack } = contact;
    const staminaCost = getStaminaCost(defender, attack.blockStaminaCost * defender.stats.blockStaminaScale, 'block');
    attacker.combat.attackConnected = true;
    defender.vx = attacker.facing * attack.blockPushback * defender.stats.blockPushbackScale;

    if (attack.breaksGuard || (attack.charge && getChargeLevel(attack, attacker.combat.chargeTime) >= attack.charge.guardBreakLevel)) {
      this.breakGuard(defender, contact);
      return;
    }
    if (canAfford(defender, staminaCost + (defender.stats.guardBreakThreshold ?? 0))) {
      this.spendStamina(defender, staminaCost, 'block');
      defender.combat.blockstun = attack.blockstun;
      this.powers.onBlock(defender);
      this.emit(CombatEvent.BLOCK, contact);
      return;
    }

    this.breakGuard(defender, contact);
  }

  breakGuard(defender, contact) {
    this.spendStamina(defender, defender.stamina, 'guardBreak');
    defender.combat.stunDuration = defender.stats.guardBreakStun;
    defender.restartState(FighterState.STUNNED);
    this.emit(CombatEvent.GUARD_BREAK, contact);
  }

  getHitDamage(attacker, defender, attack) {
    const punishScale = isOpenToPunish(defender) ? attacker.stats.punishDamageScale : 1;
    const chargeScale = attack.charge ? attack.charge.damageScales[getChargeLevel(attack, attacker.combat.chargeTime) - 1] : 1;
    return attack.damage * punishScale * chargeScale * getSweetSpotScale(attacker, defender, attack);
  }

  applyHit(contact) {
    if (isSaberAttack(contact.attackType) && isBladeInvulnerable(contact.defender)) return;
    const { attacker, defender, attack } = contact;
    const armored = hasArmor(defender);
    const damage = this.getHitDamage(attacker, defender, attack);
    contact.armored = armored;
    contact.wrathArmored = this.statuses.hasWrathArmor(contact);
    if (!this.applyDamage(contact, damage, 'blade', CombatEvent.HIT)) {
      return;
    }
    if (armored) {
      defender.combat.armorHits -= 1;
      return;
    }
    if (contact.wrathArmored) {
      this.statuses.consumeWrathArmor(contact);
      return;
    }

    defender.combat.stunDuration = attack.hitstun;
    defender.restartState(FighterState.HIT);
  }

  applyDamage(contact, amount, source, eventType = null) {
    const { attacker, defender } = contact;
    amount = this.getDamageAmount(contact, amount, source);
    amount = this.statuses.absorbShieldDamage(contact, amount);
    contact.damage = Math.min(defender.health, amount);
    if ((source === 'blade' || source === 'power') && attacker?.combat.wrathTime > 0) {
      const withoutWrath = Math.min(defender.health, amount / attacker.combat.wrathDamageDealtScale);
      attacker.combat.wrathExtraDamage += Math.max(0, contact.damage - withoutWrath);
    }
    defender.health = Math.max(0, defender.health - amount);
    if (contact.damage > 0) {
      defender.combat.evadeStreak = 0;
      this.statuses.onDamaged(defender);
    }
    if (source === 'blade') {
      this.onBladeDamage(contact);
    } else if (source === 'power' && contact.damage > 0) {
      this.powers.gain(defender, this.powers.config.meter.gain.hitTaken);
    }
    if (eventType !== null) {
      this.emit(eventType, contact);
    }
    if (defender.health === 0) {
      this.knockOut(defender, contact, source);
      return false;
    }
    return !contact.sanctuaryProtected;
  }

  getDamageAmount(contact, amount, source) {
    const { attacker, defender, attack, armored } = contact;
    if (source === 'blade') {
      if (this.rules.exhaustion && defender.combat.exhausted && attack.exhaustionBonus === true) {
        amount *= combatRulesConfig.exhaustion.damageScale;
      }
    }
    if (source === 'blade' || source === 'power') {
      if (attacker?.combat.wrathTime > 0) {
        amount *= attacker.combat.wrathDamageDealtScale;
      }
      if (defender.combat.wrathTime > 0) {
        amount *= defender.combat.wrathDamageTakenScale;
      }
    }
    if (source === 'blade' && armored) {
      amount *= defender.combat.attack.armor.damageScale;
    }
    return amount;
  }

  onBladeDamage(contact) {
    const { attacker, defender, attack, armored } = contact;
    attacker.combat.attackConnected = true;
    attacker.stamina = Math.min(attacker.stats.maxStamina, attacker.stamina + attacker.stats.staminaOnHit);
    this.powers.onHit(attacker, defender);
    this.applyWound(contact);
    if (!armored && !contact.wrathArmored && !contact.sanctuaryProtected) {
      defender.vx = attacker.facing * attack.knockback * attacker.stats.knockbackScale;
      defender.clearAttack();
    }
  }

  applyWound(contact) {
    const { defender, attack, damage } = contact;
    const { combat } = defender;
    if (!this.rules.wounds || !combat.exhausted || combat.woundUsed || damage <= 0 || defender.health === 0 || !['arm', 'leg'].includes(attack.wound)) {
      return;
    }
    combat.wound = attack.wound;
    combat.woundUsed = true;
    if (combat.wound === 'arm') {
      combat.woundArmCount += 1;
    } else {
      combat.woundLegCount += 1;
    }
    if (combat.wound === 'leg') {
      combat.jumpsUsed = Math.min(combat.jumpsUsed, combatRulesConfig.wounds.leg.maxJumps);
    }
    this.emit(CombatEvent.WOUND, contact);
  }

  knockOut(defender, contact, source = null) {
    this.statuses.onDeath(defender);
    defender.clearAttack();
    defender.combat.fallDirection = chooseFallDirection(defender, this.arena, this.fallRoomMargin);
    defender.restartState(FighterState.DEAD);
    contact.finisher = this.chooseFinisher(defender, contact, source);
    this.emit(CombatEvent.DEATH, contact);
  }

  chooseFinisher(defender, { attacker, attack, attackType }, source) {
    const melee = (source === 'blade' && attack) || source === 'bladeLock';
    const limb = combatRulesConfig.finishers.limbs[attackType];
    if (!this.rules.finishers || !melee || !limb || !attacker) return null;
    const { combat } = defender;
    const head = attacker.combat.matchPoint && hashUnit(defender.x, attacker.x, attacker.stateTime) < combatRulesConfig.finishers.headChance;
    combat.finisherLimb = head ? 'head' : limb;
    combat.finisherSide = head || comesFromFront(defender, attacker) ? 'front' : 'back';
    combat.finisherX = defender.x;
    combat.finisherY = defender.y;
    combat.finisherDirection = Math.sign(defender.x - attacker.x) || attacker.facing;
    return combat.finisherLimb;
  }

  dealPowerDamage(caster, target, power, damage, type) {
    const contact = this.createPowerContact(caster, target, power, 0);
    return this.applyDamage(contact, damage, 'power', type);
  }

  applyStatusDamage(fighter, source, amount) {
    const contact = this.createPowerContact(source, fighter, this.powers.config.powers.choke, 0);
    return this.applyDamage(contact, amount, 'periodic');
  }

  createPowerContact(caster, target, power, damage) {
    return {
      attacker: caster,
      defender: target,
      attackType: power.id,
      x: target.x,
      y: target.y - target.height * this.powers.config.impactHeight,
      damage,
    };
  }

  emitAction(type, fighter, attackType) {
    this.events.push(
      createCombatEvent(type, {
        attacker: fighter,
        defender: null,
        attackType,
        mode: fighter.combat.powerMode ?? undefined,
        x: fighter.x,
        y: fighter.y - fighter.height / 2,
      }),
    );
  }

  emit(type, contact) {
    this.events.push(createCombatEvent(type, contact));
  }
}

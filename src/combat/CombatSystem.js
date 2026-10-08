import { FighterState } from '../entities/fighterStates.js';
import { canAfford, spendStamina } from '../systems/StaminaSystem.js';
import { CombatAction, clearActionBuffer, updateActionBuffer } from './actionBuffer.js';
import { clamp } from '../utils/math.js';
import { ATTACK_STATES, AttackPhase, AttackType, getAttackDuration, getAttackPhase, getChargeLevel, isSaberAttack } from './attackPhases.js';
import { CombatEvent, createCombatEvent } from './combatEvents.js';
import { boxesOverlap, createBox, getAttackHitbox, getHurtbox, hasActiveHitbox, hasHurtbox } from './hitboxes.js';

const PUNISHED_STATES = new Set([FighterState.STAGGERED, FighterState.STUNNED]);

function comesFromFront(defender, attacker) {
  const attackerSide = Math.sign(attacker.x - defender.x);
  return attackerSide === 0 || attackerSide === defender.facing;
}

function isBlockingAttack(defender, attacker) {
  return defender.state === FighterState.BLOCKING && comesFromFront(defender, attacker);
}

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
  constructor(arena, { inputBuffer, fallRoomMargin, clash }) {
    this.arena = arena;
    this.inputBuffer = inputBuffer;
    this.fallRoomMargin = fallRoomMargin;
    this.clash = clash;
    this.otherHitbox = createBox();
    this.events = [];
    this.hitbox = createBox();
    this.hurtbox = createBox();
    this.contacts = [];
  }

  update(fighters, dt) {
    this.events.length = 0;

    for (const fighter of fighters) {
      this.updateTimers(fighter, dt);
      updateActionBuffer(fighter, dt, this.inputBuffer);
      this.startActions(fighter);
      this.applyActionMovement(fighter);
    }
  }

  updateTimers(fighter, dt) {
    const { combat, stats } = fighter;

    if (fighter.grounded) {
      combat.airAttackUsed = false;
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
          combat.passThrough = false;
          fighter.setState(FighterState.IDLE);
        }
        break;
      case FighterState.HIT:
      case FighterState.STAGGERED:
      case FighterState.STUNNED:
        if (fighter.stateTime >= combat.stunDuration) {
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
    if (this.tryAttackChain(fighter)) {
      return;
    }
    if (fighter.state === FighterState.BLOCKING && this.startActionFromBlock(fighter)) {
      return;
    }
    if (!fighter.canAct) {
      this.tryAirAttack(fighter);
      return;
    }

    const action = fighter.combat.bufferedAction;
    const started = action !== null && this.tryBufferedAction(fighter, action);

    if (!started && fighter.intent.block) {
      fighter.combat.blockstun = 0;
      fighter.setState(FighterState.BLOCKING);
    }
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
    if (this.tryAttack(fighter, AttackType.AIR)) {
      fighter.combat.airAttackUsed = true;
    } else {
      this.emitAction(CombatEvent.ACTION_REJECTED, fighter, AttackType.AIR);
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
    if (bufferedAction === CombatAction.SHOVE && blockstun === 0) {
      return this.tryBufferedAction(fighter, bufferedAction);
    }
    return false;
  }

  tryBufferedAction(fighter, action) {
    clearActionBuffer(fighter);
    const started = this.tryAction(fighter, action);
    if (!started) {
      this.emitAction(CombatEvent.ACTION_REJECTED, fighter, null);
    }
    return started;
  }

  tryAction(fighter, action) {
    switch (action) {
      case CombatAction.DODGE:
        return this.tryDodge(fighter);
      case CombatAction.SHOVE:
        return this.tryAttack(fighter, AttackType.SHOVE);
      case CombatAction.SPECIAL:
        return this.trySpecial(fighter);
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

  trySpecial(fighter) {
    const move = fighter.moves[AttackType.SPECIAL];
    if (!move) {
      return false;
    }
    return move.dash ? this.tryDash(fighter, move) : this.tryAttack(fighter, AttackType.SPECIAL);
  }

  tryDash(fighter, move) {
    if (!canAfford(fighter, move.staminaCost)) {
      return false;
    }
    spendStamina(fighter, move.staminaCost);
    this.startDodge(fighter, move.dash, fighter.facing, move.dash.passThrough);
    this.emitAction(CombatEvent.ATTACK_START, fighter, AttackType.SPECIAL);
    return true;
  }

  startParry(fighter) {
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
    const attack = fighter.moves[attackType];
    if (!canAfford(fighter, attack.staminaCost)) {
      return false;
    }

    spendStamina(fighter, attack.staminaCost);
    fighter.combat.riposteTime = 0;
    fighter.clearAttack();
    fighter.combat.attack = attack;
    fighter.combat.attackType = attackType;
    fighter.combat.armorHits = attack.armor ? attack.armor.hits : 0;
    fighter.combat.chargeTime = 0;
    fighter.restartState(ATTACK_STATES[attack.type ?? attackType]);
    this.emitAction(CombatEvent.ATTACK_START, fighter, attackType);
    return true;
  }

  tryDodge(fighter) {
    const { dodge } = fighter.stats;
    if (!canAfford(fighter, dodge.staminaCost)) {
      return false;
    }

    spendStamina(fighter, dodge.staminaCost);
    const { moveX } = fighter.intent;
    this.startDodge(fighter, dodge, moveX !== 0 ? Math.sign(moveX) : -fighter.facing, false);
    return true;
  }

  startDodge(fighter, profile, direction, passThrough) {
    fighter.combat.dodgeProfile = profile;
    fighter.combat.dodgeDirection = direction;
    fighter.combat.passThrough = passThrough;
    fighter.restartState(FighterState.DODGING);
    this.emitAction(CombatEvent.DODGE, fighter, null);
  }

  applyActionMovement(fighter) {
    const { combat } = fighter;

    if (fighter.state === FighterState.DODGING) {
      fighter.vx = combat.dodgeDirection * combat.dodgeProfile.speed;
      return;
    }

    if (combat.attack && !combat.lungeApplied && getAttackPhase(combat.attack, fighter.stateTime) === AttackPhase.ACTIVE) {
      fighter.vx = fighter.facing * combat.attack.lunge;
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

    this.events.push(
      createCombatEvent(CombatEvent.CLASH, {
        attacker: a,
        defender: b,
        attackType: a.combat.attackType,
        x: (Math.max(boxA.left, boxB.left) + Math.min(boxA.right, boxB.right)) / 2,
        y: (Math.max(boxA.top, boxB.top) + Math.min(boxA.bottom, boxB.bottom)) / 2,
      }),
    );
    this.recoil(a, b);
    this.recoil(b, a);
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
        if (defender === attacker || !hasHurtbox(defender)) {
          continue;
        }
        if (boxesOverlap(this.hitbox, getHurtbox(defender, this.hurtbox))) {
          this.contacts.push({
            attacker,
            defender,
            attack,
            attackType,
            x: (Math.max(this.hitbox.left, this.hurtbox.left) + Math.min(this.hitbox.right, this.hurtbox.right)) / 2,
            y: (Math.max(this.hitbox.top, this.hurtbox.top) + Math.min(this.hitbox.bottom, this.hurtbox.bottom)) / 2,
          });
          break;
        }
      }
    }
  }

  resolveContact(contact) {
    if (!contact.defender.isAlive) {
      return;
    }
    if (contact.attackType === AttackType.SHOVE) {
      this.applyShove(contact);
    } else if (isInCounterStance(contact.defender, contact.attacker)) {
      this.resolveCounter(contact);
    } else if (!isBlockingAttack(contact.defender, contact.attacker)) {
      this.applyHit(contact);
    } else if (contact.defender.combat.parryArmed) {
      this.resolveParry(contact);
    } else {
      this.resolveBlock(contact);
    }
  }

  applyShove(contact) {
    const { attacker, defender, attack } = contact;

    spendStamina(defender, attack.staminaDamage);
    defender.clearAttack();
    defender.vx = attacker.facing * attack.knockback;
    defender.combat.parryArmed = false;
    defender.combat.blockstun = 0;
    defender.combat.stunDuration = attack.hitstun;
    defender.restartState(FighterState.STAGGERED);
    this.emit(CombatEvent.SHOVE, contact);
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
    const stagger = perfect ? parry.perfectStagger : parry.stagger;
    const staminaDamage = attack.blockStaminaCost * (perfect ? parry.perfectStaminaDamageMultiplier : 1);

    spendStamina(attacker, staminaDamage);
    attacker.clearAttack();
    attacker.vx = -attacker.facing * parry.attackerRecoil;
    attacker.combat.stunDuration = stagger;
    attacker.restartState(FighterState.STAGGERED);

    defender.combat.parryArmed = false;
    defender.combat.blockstun = 0;
    defender.combat.riposteTime = stagger;
    defender.vx = 0;
    if (perfect) {
      defender.stamina = Math.min(defender.stats.maxStamina, defender.stamina + parry.perfectStaminaGain);
    }
    defender.setState(FighterState.IDLE);

    this.emit(perfect ? CombatEvent.PERFECT_PARRY : CombatEvent.PARRY, contact);
  }

  resolveBlock(contact) {
    const { attacker, defender, attack } = contact;
    const staminaCost = attack.blockStaminaCost * defender.stats.blockStaminaScale;
    attacker.combat.attackConnected = true;
    defender.vx = attacker.facing * attack.blockPushback * defender.stats.blockPushbackScale;

    if (attack.breaksGuard || (attack.charge && getChargeLevel(attack, attacker.combat.chargeTime) >= attack.charge.guardBreakLevel)) {
      this.breakGuard(defender, contact);
      return;
    }
    if (canAfford(defender, staminaCost)) {
      spendStamina(defender, staminaCost);
      defender.combat.blockstun = attack.blockstun;
      this.emit(CombatEvent.BLOCK, contact);
      return;
    }

    this.breakGuard(defender, contact);
  }

  breakGuard(defender, contact) {
    spendStamina(defender, defender.stamina);
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
    const { attacker, defender, attack } = contact;
    const armored = hasArmor(defender);
    const damage = this.getHitDamage(attacker, defender, attack) * (armored ? defender.combat.attack.armor.damageScale : 1);

    attacker.combat.attackConnected = true;
    attacker.stamina = Math.min(attacker.stats.maxStamina, attacker.stamina + attacker.stats.staminaOnHit);
    contact.damage = Math.min(defender.health, damage);
    defender.health = Math.max(0, defender.health - damage);
    contact.armored = armored;
    if (!armored) {
      defender.vx = attacker.facing * attack.knockback * attacker.stats.knockbackScale;
      defender.clearAttack();
    }
    this.emit(CombatEvent.HIT, contact);

    if (defender.health === 0) {
      defender.clearAttack();
      defender.combat.fallDirection = chooseFallDirection(defender, this.arena, this.fallRoomMargin);
      defender.restartState(FighterState.DEAD);
      this.emit(CombatEvent.DEATH, contact);
      return;
    }
    if (armored) {
      defender.combat.armorHits -= 1;
      return;
    }

    defender.combat.stunDuration = attack.hitstun;
    defender.restartState(FighterState.HIT);
  }

  emitAction(type, fighter, attackType) {
    this.events.push(
      createCombatEvent(type, {
        attacker: fighter,
        defender: null,
        attackType,
        x: fighter.x,
        y: fighter.y - fighter.height / 2,
      }),
    );
  }

  emit(type, contact) {
    this.events.push(createCombatEvent(type, contact));
  }
}

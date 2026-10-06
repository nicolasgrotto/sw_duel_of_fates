import { FighterState } from '../entities/fighterStates.js';
import { canAfford, spendStamina } from '../systems/StaminaSystem.js';
import { ATTACK_STATES, AttackPhase, AttackType, getAttackDuration, getAttackPhase } from './attackPhases.js';
import { CombatEvent, createCombatEvent } from './combatEvents.js';
import { boxesOverlap, createBox, getAttackHitbox, getHurtbox, hasActiveHitbox, hasHurtbox } from './hitboxes.js';

function isBlockingAttack(defender, attacker) {
  if (defender.state !== FighterState.BLOCKING) {
    return false;
  }
  const attackerSide = Math.sign(attacker.x - defender.x);
  return attackerSide === 0 || attackerSide === defender.facing;
}

export class CombatSystem {
  constructor() {
    this.events = [];
    this.hitbox = createBox();
    this.hurtbox = createBox();
    this.contacts = [];
  }

  update(fighters, dt) {
    this.events.length = 0;

    for (const fighter of fighters) {
      this.updateTimers(fighter, dt);
      this.startActions(fighter);
      this.applyActionMovement(fighter);
    }
  }

  updateTimers(fighter, dt) {
    const { combat, stats } = fighter;

    switch (fighter.state) {
      case FighterState.ATTACKING:
      case FighterState.HEAVY_ATTACK:
        if (fighter.stateTime >= getAttackDuration(combat.attack)) {
          fighter.clearAttack();
          fighter.setState(FighterState.IDLE);
        }
        break;
      case FighterState.DODGING:
        if (fighter.stateTime >= stats.dodge.duration) {
          fighter.setState(FighterState.IDLE);
        }
        break;
      case FighterState.HIT:
      case FighterState.STUNNED:
        if (fighter.stateTime >= combat.stunDuration) {
          fighter.setState(FighterState.IDLE);
        }
        break;
      case FighterState.BLOCKING:
        combat.blockstun = Math.max(0, combat.blockstun - dt);
        if (combat.blockstun === 0 && !fighter.intent.block) {
          fighter.setState(FighterState.IDLE);
        }
        break;
      default:
        break;
    }
  }

  startActions(fighter) {
    if (!fighter.canAct) {
      return;
    }

    const { intent } = fighter;
    const started =
      (intent.dodge && this.tryDodge(fighter)) ||
      (intent.heavyAttack && this.tryAttack(fighter, AttackType.HEAVY)) ||
      (intent.lightAttack && this.tryAttack(fighter, AttackType.LIGHT));

    if (!started && intent.block) {
      fighter.combat.blockstun = 0;
      fighter.setState(FighterState.BLOCKING);
    }
  }

  tryAttack(fighter, attackType) {
    const attack = fighter.stats.attacks[attackType];
    if (!canAfford(fighter, attack.staminaCost)) {
      return false;
    }

    spendStamina(fighter, attack.staminaCost);
    fighter.clearAttack();
    fighter.combat.attack = attack;
    fighter.combat.attackType = attackType;
    fighter.setState(ATTACK_STATES[attackType]);
    return true;
  }

  tryDodge(fighter) {
    const { dodge } = fighter.stats;
    if (!canAfford(fighter, dodge.staminaCost)) {
      return false;
    }

    spendStamina(fighter, dodge.staminaCost);
    const { moveX } = fighter.intent;
    fighter.combat.dodgeDirection = moveX !== 0 ? Math.sign(moveX) : -fighter.facing;
    fighter.setState(FighterState.DODGING);
    return true;
  }

  applyActionMovement(fighter) {
    const { combat } = fighter;

    if (fighter.state === FighterState.DODGING) {
      fighter.vx = combat.dodgeDirection * fighter.stats.dodge.speed;
      return;
    }

    if (combat.attack && !combat.lungeApplied && getAttackPhase(combat.attack, fighter.stateTime) === AttackPhase.ACTIVE) {
      fighter.vx = fighter.facing * combat.attack.lunge;
      combat.lungeApplied = true;
    }
  }

  resolveHits(fighters) {
    this.findContacts(fighters);

    for (const contact of this.contacts) {
      contact.attacker.combat.hasHit = true;
    }
    for (const contact of this.contacts) {
      this.resolveContact(contact);
    }
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
    if (isBlockingAttack(contact.defender, contact.attacker)) {
      this.resolveBlock(contact);
    } else {
      this.applyHit(contact);
    }
  }

  resolveBlock(contact) {
    const { attacker, defender, attack } = contact;
    defender.vx = attacker.facing * attack.blockPushback;

    if (canAfford(defender, attack.blockStaminaCost)) {
      spendStamina(defender, attack.blockStaminaCost);
      defender.combat.blockstun = attack.blockstun;
      this.emit(CombatEvent.BLOCK, contact);
      return;
    }

    spendStamina(defender, defender.stamina);
    defender.combat.stunDuration = defender.stats.guardBreakStun;
    defender.restartState(FighterState.STUNNED);
    this.emit(CombatEvent.GUARD_BREAK, contact);
  }

  applyHit(contact) {
    const { attacker, defender, attack } = contact;

    defender.health = Math.max(0, defender.health - attack.damage);
    defender.vx = attacker.facing * attack.knockback;
    defender.clearAttack();
    this.emit(CombatEvent.HIT, contact);

    if (defender.health === 0) {
      defender.restartState(FighterState.DEAD);
      this.emit(CombatEvent.DEATH, contact);
      return;
    }

    defender.combat.stunDuration = attack.hitstun;
    defender.restartState(FighterState.HIT);
  }

  emit(type, contact) {
    this.events.push(createCombatEvent(type, contact));
  }
}

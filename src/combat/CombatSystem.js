import { FighterState } from '../entities/fighterStates.js';
import { canAfford, spendStamina } from '../systems/StaminaSystem.js';
import { ATTACK_STATES, AttackPhase, AttackType, getAttackDuration, getAttackPhase } from './attackPhases.js';

export class CombatSystem {
  constructor() {
    this.events = [];
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
}

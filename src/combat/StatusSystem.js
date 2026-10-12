import { combatRulesConfig } from '../config/combatRulesConfig.js';
import { FighterState } from '../entities/fighterStates.js';
import { AttackType, isSaberAttack } from './attackPhases.js';
import { CombatEvent } from './combatEvents.js';

function findOpponent(fighter, fighters) {
  for (const other of fighters) {
    if (other !== fighter) {
      return other;
    }
  }
  return null;
}

export function isNeutralForFocus(fighter) {
  if (!fighter.grounded || fighter.state !== FighterState.IDLE) {
    return false;
  }
  for (const action in fighter.intent) {
    if (fighter.intent[action]) {
      return false;
    }
  }
  return true;
}

export function hasStatus(fighter) {
  const { combat } = fighter;
  return combat.chokeTime > 0 || combat.crushTime > 0 || combat.freezeTime > 0 || combat.focusTime > 0 || combat.healTime > 0 || combat.wrathTime > 0 || combat.confuseTime > 0 || combat.sanctuaryTime > 0;
}

export class StatusSystem {
  constructor(combat) {
    this.combat = combat;
  }

  update(fighters, dt) {
    for (const fighter of fighters) {
      const { combat } = fighter;
      if (!fighter.isAlive) {
        this.onDeath(fighter);
        continue;
      }
      this.advance(fighter, 'focus', dt);
      this.checkFocusResource(fighter);
      this.advance(fighter, 'wrath', dt);
      this.advance(fighter, 'sanctuary', dt);
      combat.freezeTime = Math.max(0, combat.freezeTime - dt);
      if (combat.confuseTime > 0) {
        combat.confuseElapsed += Math.min(dt, combat.confuseTime);
        combat.confuseTime = Math.max(0, combat.confuseTime - dt);
        if (combat.confuseTime === 0) combat.confuseElapsed = 0;
      }
      if (combat.chokeTime > 0) {
        this.choke(fighter, findOpponent(fighter, fighters), dt);
      }
      if (combat.crushTime > 0) this.crush(fighter, fighters, dt);
      if (combat.healTime > 0) {
        this.heal(fighter, dt);
      }
    }
  }

  checkFocusResource(fighter) {
    if (this.combat.rules.focusEvade && fighter.combat.focusTime > 0 && fighter.flowMeter < combatRulesConfig.focus.autoEvadeCost) {
      this.end(fighter, 'focus', 'depleted');
    }
  }

  tryAutoEvade(contact) {
    const { defender, attack, attackType } = contact;
    if (!this.combat.rules.focusEvade || defender.combat.focusTime <= 0 || !isNeutralForFocus(defender)
      || !isSaberAttack(attackType) || attackType === AttackType.SHOVE || attack.projectile) {
      return false;
    }
    const cost = combatRulesConfig.focus.autoEvadeCost;
    if (defender.flowMeter < cost) {
      this.end(defender, 'focus', 'depleted');
      return false;
    }
    defender.flowMeter -= cost;
    defender.combat.autoEvadeCount += 1;
    contact.auto = true;
    this.checkFocusResource(defender);
    return true;
  }

  start(fighter, effect, duration) {
    const { combat } = fighter;
    const replaced = combat[`${effect}Time`] > 0;
    if (replaced) {
      this.end(fighter, effect, 'replaced');
    }
    combat[`${effect}Time`] = duration;
    combat[`${effect}End`] = replaced ? 'replaced' : null;
  }

  end(fighter, effect, reason) {
    const { combat } = fighter;
    if (!(combat[`${effect}Time`] > 0)) {
      return;
    }
    combat[`${effect}Time`] = 0;
    combat[`${effect}End`] = reason;
    if (effect === 'sanctuary') {
      combat.sanctuaryShield = 0;
      if (reason === 'completed') this.combat.emitAction(CombatEvent.SANCTUARY_END, fighter, effect);
    } else if (effect === 'focus') {
      combat.focusScale = 1;
    } else if (effect === 'wrath') {
      combat.wrathArmorHits = 0;
      combat.wrathDamageDealtScale = 1;
      combat.wrathDamageTakenScale = 1;
    } else if (effect === 'heal') {
      combat.healRate = 0;
      if (reason === 'completed' && this.combat.rules.wounds && combat.wound) {
        this.combat.emitAction(CombatEvent.WOUND_HEALED, fighter, combat.wound);
        combat.wound = null;
      }
    }
  }

  advance(fighter, effect, dt) {
    const remaining = fighter.combat[`${effect}Time`];
    if (remaining > 0 && remaining <= dt) {
      this.end(fighter, effect, 'completed');
    } else if (remaining > 0) {
      fighter.combat[`${effect}Time`] = remaining - dt;
    }
  }

  heal(fighter, dt) {
    const { combat } = fighter;
    const step = Math.min(dt, combat.healTime);
    if (fighter.isAlive) {
      fighter.health = Math.min(combat.healCap, fighter.health + combat.healRate * step);
    }
    this.advance(fighter, 'heal', step);
  }

  choke(fighter, opponent, dt) {
    const { combat } = fighter;
    const source = this.combat.projectiles.fighters[combat.chokeSource];
    if (combat.chokeSource >= 0 && (!source?.isAlive || source.state !== FighterState.CHANNELING
      || source.combat.power?.effect !== 'choke' || source.combat.powerEndTime > 0
      || source.combat.chokeTarget !== this.combat.projectiles.fighters.indexOf(fighter))) {
      this.releaseChoke(fighter);
      return;
    }
    const step = Math.min(dt, combat.chokeTime);
    if (combat.chokeSource < 0) combat.chokeTime -= step;
    if (fighter.isAlive) {
      fighter.vx = 0;
      if (combat.chokeSource >= 0) {
        fighter.vy = 0;
        fighter.y = combat.chokeY;
      }
      this.combat.applyStatusDamage(fighter, source ?? opponent, combat.chokeDamageRate * step);
    }
  }

  crush(fighter, fighters, dt) {
    const { combat } = fighter;
    combat.crushTime = Math.max(0, combat.crushTime - dt);
    fighter.y = combat.crushY;
    fighter.vx = fighter.vy = 0;
    fighter.grounded = false;
    if (combat.crushTime > 0) {
      if (fighter.state !== FighterState.STUNNED) {
        fighter.clearAttack();
        fighter.restartState(FighterState.STUNNED);
      }
      return;
    }
    const source = fighters[combat.crushSource] ?? findOpponent(fighter, fighters);
    const alive = this.combat.dealPowerDamage(source, fighter, this.combat.powers.config.powers.crush, combat.crushDamage, CombatEvent.POWER_HIT);
    combat.crushDamage = 0;
    combat.crushSource = -1;
    if (alive) {
      fighter.clearAttack();
      combat.stunDuration = combat.crushStagger;
      fighter.restartState(FighterState.STAGGERED);
    }
  }

  absorbShieldDamage(contact, amount) {
    const { defender } = contact;
    const { combat } = defender;
    contact.sanctuaryProtected = false;
    if (combat.sanctuaryShield <= 0) return amount;
    const absorbed = Math.min(amount, combat.sanctuaryShield);
    combat.sanctuaryShield -= absorbed;
    contact.sanctuaryProtected = combat.sanctuaryShield > 0;
    if (combat.sanctuaryShield === 0) {
      this.end(defender, 'sanctuary', 'broken');
      this.combat.emit(CombatEvent.SANCTUARY_BREAK, contact);
    }
    return amount - absorbed;
  }

  blockShieldControl(caster, target, power) {
    if (!power.control || target.combat.sanctuaryShield <= 0) return false;
    const contact = this.combat.createPowerContact(caster, target, power, 0);
    this.absorbShieldDamage(contact, this.combat.powers.config.powers.sanctuary.controlCost);
    this.combat.emit(CombatEvent.POWER_ABSORBED, contact);
    return true;
  }

  hasWrathArmor(contact) {
    const { defender, attack, attackType, armored } = contact;
    return !armored && !attack.projectile && isSaberAttack(attackType)
      && defender.combat.wrathTime > 0 && defender.combat.wrathArmorHits > 0;
  }

  consumeWrathArmor(contact) {
    contact.defender.combat.wrathArmorHits -= 1;
    this.combat.emit(CombatEvent.WRATH_ARMOR, contact);
  }

  releaseChoke(fighter) {
    const { combat } = fighter;
    combat.chokeTime = 0;
    combat.chokeDamageRate = 0;
    combat.chokeSource = -1;
    if (!fighter.isAlive) return;
    fighter.clearAttack();
    combat.stunDuration = combat.chokeRelease;
    fighter.restartState(FighterState.STAGGERED);
  }

  onDamaged(fighter) {
    fighter.combat.freezeTime = 0;
    this.end(fighter, 'heal', fighter.health === 0 ? 'death' : 'interrupted');
  }

  onDeath(fighter) {
    fighter.combat.rainActive = false;
    fighter.combat.rain = null;
    fighter.combat.crushTime = 0;
    fighter.combat.crushDamage = 0;
    fighter.combat.crushSource = -1;
    fighter.combat.chokeTime = 0;
    fighter.combat.chokeSource = -1;
    fighter.combat.confuseTime = 0;
    fighter.combat.confuseElapsed = 0;
    this.end(fighter, 'heal', 'death');
    this.end(fighter, 'focus', 'death');
    this.end(fighter, 'wrath', 'death');
    this.end(fighter, 'sanctuary', 'death');
  }
}

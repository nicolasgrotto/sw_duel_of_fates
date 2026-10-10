import { combatRulesConfig } from '../config/combatRulesConfig.js';
import { FighterState } from '../entities/fighterStates.js';
import { AttackType, isSaberAttack } from './attackPhases.js';

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
  return combat.chokeTime > 0 || combat.freezeTime > 0 || combat.focusTime > 0 || combat.healTime > 0 || combat.wrathTime > 0;
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
      combat.freezeTime = Math.max(0, combat.freezeTime - dt);
      if (combat.chokeTime > 0) {
        this.choke(fighter, findOpponent(fighter, fighters), dt);
      }
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
    if (effect === 'focus') {
      combat.focusScale = 1;
    } else if (effect === 'wrath') {
      combat.wrathDamageDealtScale = 1;
      combat.wrathDamageTakenScale = 1;
    } else if (effect === 'heal') {
      combat.healRate = 0;
      if (reason === 'completed' && this.combat.rules.wounds) {
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
    const step = Math.min(dt, combat.chokeTime);
    combat.chokeTime -= step;
    if (fighter.isAlive) {
      fighter.vx = 0;
      this.combat.applyStatusDamage(fighter, opponent, combat.chokeDamageRate * step);
    }
  }

  onDamaged(fighter) {
    fighter.combat.freezeTime = 0;
    this.end(fighter, 'heal', fighter.health === 0 ? 'death' : 'interrupted');
  }

  onDeath(fighter) {
    this.end(fighter, 'heal', 'death');
    this.end(fighter, 'focus', 'death');
    this.end(fighter, 'wrath', 'death');
  }
}

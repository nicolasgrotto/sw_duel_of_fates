import { FighterState } from '../entities/fighterStates.js';
import { combatRulesConfig } from '../config/combatRulesConfig.js';

export function canAfford(fighter, cost) {
  return fighter.stamina >= cost;
}

export function getStaminaCost(fighter, cost, type = 'action') {
  const { combat } = fighter;
  if (combat.focusTime > 0) {
    cost *= combat.focusScale;
  }
  if (combat.wound === 'arm' && type === 'block') {
    cost *= combatRulesConfig.wounds.arm.blockCostScale;
  } else if (combat.wound === 'leg' && type === 'dash') {
    cost *= combatRulesConfig.wounds.leg.dashCostScale;
  }
  return cost;
}

export function spendStamina(fighter, amount, cause = 'spend', rules = {}) {
  fighter.stamina = Math.max(0, fighter.stamina - amount);
  fighter.combat.staminaRegenDelay = fighter.stats.stamina.regenDelay;
  if (rules.exhaustion && (amount > 0 || cause === 'guardBreak') && fighter.stamina <= fighter.stats.maxStamina * combatRulesConfig.exhaustion.enterRatio) {
    const { combat } = fighter;
    if (!combat.exhausted || cause === 'guardBreak') {
      combat.exhaustionTime = 0;
      combat.exhaustionCause = cause;
    }
    combat.exhausted = true;
  }
}

export class StaminaSystem {
  constructor(rules = {}, onRecovered = null) {
    this.rules = rules;
    this.onRecovered = onRecovered;
  }

  update(fighters, dt) {
    for (const fighter of fighters) {
      this.regenerate(fighter, dt);
    }
  }

  regenerate(fighter, dt) {
    const { combat, stats } = fighter;

    if (fighter.state === FighterState.DEAD) {
      return;
    }
    if (combat.exhausted) {
      combat.exhaustionTime += dt;
    }
    if (combat.staminaRegenDelay > 0) {
      combat.staminaRegenDelay = Math.max(0, combat.staminaRegenDelay - dt);
    } else {
      const multiplier = fighter.state === FighterState.BLOCKING ? stats.stamina.blockingRegenMultiplier : 1;
      fighter.stamina = Math.min(stats.maxStamina, fighter.stamina + stats.stamina.regenPerSecond * multiplier * dt);
    }
    const config = combatRulesConfig.exhaustion;
    const minimum = combat.exhaustionCause === 'guardBreak' ? config.guardBreakMinDuration : config.minDuration;
    if (this.rules.exhaustion && combat.exhausted && fighter.stamina >= stats.maxStamina * config.exitRatio && combat.exhaustionTime >= minimum) {
      combat.exhausted = false;
      this.onRecovered?.(fighter);
    }
  }
}

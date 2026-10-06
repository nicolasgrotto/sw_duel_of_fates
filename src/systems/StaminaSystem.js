import { FighterState } from '../entities/fighterStates.js';

export function canAfford(fighter, cost) {
  return fighter.stamina >= cost;
}

export function spendStamina(fighter, amount) {
  fighter.stamina = Math.max(0, fighter.stamina - amount);
  fighter.combat.staminaRegenDelay = fighter.stats.stamina.regenDelay;
}

export class StaminaSystem {
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
    if (combat.staminaRegenDelay > 0) {
      combat.staminaRegenDelay = Math.max(0, combat.staminaRegenDelay - dt);
      return;
    }

    const multiplier = fighter.state === FighterState.BLOCKING ? stats.stamina.blockingRegenMultiplier : 1;
    fighter.stamina = Math.min(stats.maxStamina, fighter.stamina + stats.stamina.regenPerSecond * multiplier * dt);
  }
}

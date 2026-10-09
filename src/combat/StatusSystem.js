function findOpponent(fighter, fighters) {
  for (const other of fighters) {
    if (other !== fighter) {
      return other;
    }
  }
  return null;
}

export function hasStatus(fighter) {
  const { combat } = fighter;
  return combat.chokeTime > 0 || combat.freezeTime > 0 || combat.focusTime > 0 || combat.healTime > 0;
}

export class StatusSystem {
  constructor(combat) {
    this.combat = combat;
  }

  update(fighters, dt) {
    for (const fighter of fighters) {
      const { combat } = fighter;
      combat.focusTime = Math.max(0, combat.focusTime - dt);
      combat.freezeTime = Math.max(0, combat.freezeTime - dt);
      if (combat.healTime > 0) {
        this.heal(fighter, dt);
      }
      if (combat.chokeTime > 0) {
        this.choke(fighter, findOpponent(fighter, fighters), dt);
      }
    }
  }

  heal(fighter, dt) {
    const { combat } = fighter;
    const step = Math.min(dt, combat.healTime);
    combat.healTime -= step;
    if (fighter.isAlive) {
      fighter.health = Math.min(combat.healCap, fighter.health + combat.healRate * step);
    }
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
    fighter.combat.healTime = 0;
  }
}

export class PowerSystem {
  constructor(combat, config, enabled) {
    this.combat = combat;
    this.config = config;
    this.enabled = enabled;
  }

  update(fighters, dt) {
    if (!this.enabled) {
      return;
    }
    for (const fighter of fighters) {
      if (fighter.isAlive) {
        this.gain(fighter, this.config.meter.regenPerSecond * dt);
      }
    }
  }

  gain(fighter, amount) {
    if (!this.enabled) {
      return;
    }
    const { power } = fighter.stats;
    fighter.powerMeter = Math.min(power.max, fighter.powerMeter + amount * power.gainScale);
  }

  onHit(attacker, defender) {
    this.gain(attacker, this.config.meter.gain.hitLanded);
    this.gain(defender, this.config.meter.gain.hitTaken);
  }

  onBlock(defender) {
    this.gain(defender, this.config.meter.gain.blocked);
  }

  onParry(defender) {
    this.gain(defender, this.config.meter.gain.parried);
  }
}

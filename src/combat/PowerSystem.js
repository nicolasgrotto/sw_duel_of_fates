import { PowerOutcome, powersConfig } from '../config/powersConfig.js';
import { FighterState } from '../entities/fighterStates.js';
import { CombatEvent } from './combatEvents.js';
import { isGuardingAgainst, isInvulnerable } from './hitboxes.js';
import { powerEffects } from './powerEffects.js';
import { getFlowDifference, resolveInteraction, resolveLevelBand } from './flowInteractions.js';
import { projectilesConfig } from '../config/projectilesConfig.js';
import { getMoveX } from '../entities/fighterIntent.js';
import { isStormShieldUp, StormSystem } from './StormSystem.js';

const POWER_STATES = new Set([FighterState.CASTING, FighterState.CHANNELING]);
const GROUNDED = Object.freeze({ scale: 1, duration: 1, stagger: 1 });

export function isUsingPower(fighter) {
  return POWER_STATES.has(fighter.state) && fighter.combat.power !== null;
}

export function isChannelOpen(fighter) {
  const { power, powerEndTime } = fighter.combat;
  return fighter.state === FighterState.CHANNELING && power !== null && fighter.stateTime >= power.startup && powerEndTime === 0;
}

export function isBarrierUp(fighter) {
  return isChannelOpen(fighter) && fighter.combat.power.effect === 'barrier';
}

export function getIntentSlot(fighter) {
  const direction = Math.sign(getMoveX(fighter)) * fighter.facing;
  return direction > 0 ? 'forward' : direction < 0 ? 'back' : 'neutral';
}

export function selectPower(fighter) {
  const { loadout } = fighter.stats.power;
  if (!loadout) {
    return null;
  }
  return loadout[getIntentSlot(fighter)] ?? loadout.neutral;
}

export function selectTechnique(fighter) {
  return fighter.stats.techniques?.[getIntentSlot(fighter)] ?? null;
}

export function getPowerRange(fighter, power) {
  return power.rangeByLevel ? resolveLevelBand(fighter.flowLevel, power.rangeByLevel).range : power.range;
}

export function isInPowerRange(caster, target, power, airReach = powersConfig.airReach) {
  const range = getPowerRange(caster, power);
  if (power.around) {
    return Math.hypot(target.x - caster.x, (target.y - target.height / 2) - (caster.y - caster.height / 2)) <= range;
  }
  const side = Math.sign(target.x - caster.x) || caster.facing;
  const gap = Math.abs(target.x - caster.x) - (caster.width + target.width) / 2;
  const verticalReach = caster.grounded && target.grounded ? caster.height : Math.max(caster.height, airReach);
  return side === caster.facing && gap <= range && Math.abs(target.y - caster.y) <= verticalReach;
}

export class PowerSystem {
  constructor(combat, config, enabled, friction = 0) {
    this.combat = combat;
    this.config = config;
    this.enabled = enabled;
    this.friction = friction;
    this.storms = new StormSystem(this);
    this.context = { system: this, combat, caster: null, target: null, power: null, interaction: null, air: GROUNDED, scale: 1, remainder: 1, guarded: false, projectile: null };
  }

  update(fighters, dt) {
    if (!this.enabled) {
      return;
    }
    for (const fighter of fighters) {
      fighter.combat.powerCooldown = Math.max(0, fighter.combat.powerCooldown - dt);
      fighter.combat.absorbTime = Math.max(0, fighter.combat.absorbTime - dt);
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
    fighter.flowMeter = Math.min(power.max, fighter.flowMeter + amount * power.gainScale);
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

  getVariant(fighter, power) {
    return power.sizes ? resolveLevelBand(fighter.flowLevel, projectilesConfig[power.sizes].sizes) : null;
  }

  getCost(fighter, power) {
    return this.getVariant(fighter, power)?.cost ?? power.cost;
  }

  canCast(fighter, power) {
    return this.enabled && power !== null && fighter.flowLevel >= (power.minFlowLevel ?? 0) && fighter.combat.powerCooldown === 0 && fighter.flowMeter >= this.getCost(fighter, power);
  }

  tryCast(fighter) {
    const power = selectPower(fighter);
    if (!this.canCast(fighter, power)) {
      return false;
    }
    fighter.flowMeter -= this.getCost(fighter, power);
    fighter.clearAttack();
    fighter.combat.power = power;
    fighter.restartState(power.channel ? FighterState.CHANNELING : FighterState.CASTING);
    if (power.stormPhases) this.storms.start(fighter);
    this.aim(fighter, null, power);
    this.combat.emitAction(CombatEvent.POWER_START, fighter, power.id);
    return true;
  }

  resolve(fighters, dt) {
    if (!this.enabled) {
      return;
    }
    for (const caster of fighters) {
      if (isUsingPower(caster) && caster.combat.power.reaction) {
        this.updateInstant(caster, null);
      }
    }
    for (const caster of fighters) {
      if (!isUsingPower(caster) || caster.combat.power.reaction) {
        continue;
      }
      const target = this.findOpponent(caster, fighters);
      if (caster.combat.power.stormPhases) {
        this.storms.update(caster, target, fighters);
      } else if (caster.combat.power.channel) {
        this.updateChannel(caster, target, dt);
      } else {
        this.updateInstant(caster, target);
      }
    }
  }

  findOpponent(caster, fighters) {
    for (const fighter of fighters) {
      if (fighter !== caster && fighter.isAlive) {
        return fighter;
      }
    }
    return null;
  }

  updateInstant(caster, target) {
    const { combat } = caster;
    const { power } = combat;
    if (!combat.powerTargeted && caster.stateTime >= power.startup) {
      combat.powerTargeted = true;
      if (power.self) {
        this.applySelf(caster, power);
      } else if (power.projectile) {
        this.aim(caster, null, power);
        this.combat.projectiles.spawnThrow(caster, power);
      } else {
        this.affect(caster, target, power, 'active');
      }
      this.combat.emitAction(CombatEvent.POWER_ACTIVE, caster, power.id);
    }
    if (caster.stateTime >= power.startup + power.active + power.recovery) {
      this.finish(caster);
    }
  }

  updateChannel(caster, target, dt) {
    const { combat } = caster;
    const { power } = combat;
    if (caster.stateTime < power.startup) {
      return;
    }
    if (combat.powerEndTime === 0) {
      const channelTime = caster.stateTime - power.startup;
      const holding = caster.intent.powerHeld && caster.flowMeter > 0 && channelTime < power.maxChannel;
      if (holding || !combat.powerTargeted && !power.requiresHold) {
        combat.powerTargeted = true;
        caster.flowMeter = Math.max(0, caster.flowMeter - power.drainPerSecond * dt);
        this.tick(caster, target, power, dt);
        return;
      }
      combat.powerEndTime = caster.stateTime;
    }
    if (caster.stateTime >= combat.powerEndTime + power.recovery) {
      this.finish(caster);
    }
  }

  tick(caster, target, power, dt) {
    if (!powerEffects[power.effect].tick) {
      return;
    }
    const { combat } = caster;
    combat.powerTick -= dt;
    if (combat.powerTick <= 0) {
      combat.powerTick += power.tickInterval;
      if (power.around) {
        this.combat.emitAction(CombatEvent.POWER_PULSE, caster, power.id);
      }
      if (power.breakOnRange && (target === null || !isInPowerRange(caster, target, power, this.config.airReach))) {
        combat.powerEndTime = caster.stateTime;
        return;
      }
      this.affect(caster, target, power, 'tick');
    }
  }

  affect(caster, target, power, phase) {
    const inRange = target !== null && isInPowerRange(caster, target, power, this.config.airReach);
    this.aim(caster, inRange ? target : null, power);
    if (inRange) {
      this.strike(caster, target, power, phase, null);
    }
  }

  strike(caster, target, power, phase, projectile) {
    if (isInvulnerable(target)) {
      return;
    }
    if (isStormShieldUp(target)) {
      this.combat.emit(CombatEvent.POWER_ABSORBED, this.combat.createPowerContact(caster, target, power, 0));
      return;
    }
    if (isBarrierUp(target)) {
      if (power.stormPhases) {
        target.flowMeter = Math.max(0, target.flowMeter - power.barrierDrainPerStrike);
        if (target.flowMeter === 0) target.combat.powerEndTime = target.stateTime;
      }
      this.barrierBlock(caster, target, power);
      return;
    }
    const remainder = target.combat.absorbTime > 0 && power.effect !== 'storm' ? this.absorb(caster, target, power) : 1;
    if (remainder === 0) return;
    const table = this.config.interactions[power.interaction];
    const interaction = resolveInteraction(table, getFlowDifference(caster, target));
    if (interaction.outcome === PowerOutcome.RESISTED) {
      this.combat.emit(CombatEvent.POWER_RESISTED, this.combat.createPowerContact(caster, target, power, 0));
      return;
    }
    const { context } = this;
    context.caster = caster;
    context.target = target;
    context.power = power;
    context.interaction = interaction;
    context.air = target.grounded ? GROUNDED : table.air;
    context.remainder = remainder;
    context.scale = interaction.scale * caster.stats.power.potency * context.air.scale * remainder;
    context.guarded = !power.stormPhases && interaction.blockable && isGuardingAgainst(target, caster);
    context.projectile = projectile;
    powerEffects[power.effect][phase](context);
  }

  applySelf(caster, power) {
    const { context } = this;
    this.aim(caster, caster, power);
    context.caster = caster;
    context.target = caster;
    context.power = power;
    context.interaction = null;
    context.air = GROUNDED;
    context.scale = caster.stats.power.potency;
    context.remainder = 1;
    context.guarded = false;
    context.projectile = null;
    powerEffects[power.effect].self(context);
  }

  absorb(caster, target, incoming) {
    const power = this.config.powers.absorb;
    const band = resolveInteraction(this.config.interactions.absorb, getFlowDifference(target, caster));
    if (band.absorb > 0) {
      this.combat.emit(CombatEvent.POWER_ABSORBED, this.combat.createPowerContact(caster, target, incoming, 0));
      target.flowMeter = Math.min(target.stats.power.max, target.flowMeter + power.absorbGain * this.getCost(caster, incoming) * band.gain);
    }
    return 1 - band.absorb;
  }

  barrierBlock(caster, target, power) {
    if (power.knockback) {
      target.vx = caster.facing * power.knockback * target.combat.power.pushSlide;
    }
    this.combat.emit(CombatEvent.POWER_ABSORBED, this.combat.createPowerContact(caster, target, power, 0));
  }

  aim(caster, target, power) {
    const { combat } = caster;
    if (target) {
      combat.powerTargetX = target.x;
      combat.powerTargetY = target.y - target.height * this.config.impactHeight;
      return;
    }
    combat.powerTargetX = caster.x + caster.facing * (caster.width / 2 + (getPowerRange(caster, power) ?? 0));
    combat.powerTargetY = caster.y - caster.height * this.config.castHeight;
  }

  finish(caster) {
    const variant = this.getVariant(caster, caster.combat.power);
    caster.clearPower();
    caster.combat.powerCooldown = variant?.cooldown ?? this.config.cooldown;
    caster.setState(FighterState.IDLE);
  }
}

import { PowerOutcome, powersConfig } from '../config/powersConfig.js';
import { FighterState } from '../entities/fighterStates.js';
import { CombatEvent } from './combatEvents.js';
import { isGuardingAgainst, isInvulnerable } from './hitboxes.js';
import { powerEffects } from './powerEffects.js';
import { getFlowDifference, resolveInteraction } from './flowInteractions.js';

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

export function selectPower(fighter) {
  const { loadout } = fighter.stats.power;
  if (!loadout) {
    return null;
  }
  const direction = Math.sign(fighter.intent.moveX) * fighter.facing;
  const slot = direction > 0 ? 'forward' : direction < 0 ? 'back' : 'neutral';
  return loadout[slot] ?? loadout.neutral;
}

export function isInPowerRange(caster, target, power, airReach = powersConfig.airReach) {
  const side = Math.sign(target.x - caster.x) || caster.facing;
  const gap = Math.abs(target.x - caster.x) - (caster.width + target.width) / 2;
  const verticalReach = caster.grounded && target.grounded ? caster.height : Math.max(caster.height, airReach);
  return side === caster.facing && gap <= power.range && Math.abs(target.y - caster.y) <= verticalReach;
}

export class PowerSystem {
  constructor(combat, config, enabled, friction = 0) {
    this.combat = combat;
    this.config = config;
    this.enabled = enabled;
    this.friction = friction;
    this.context = { system: this, combat, caster: null, target: null, power: null, interaction: null, air: GROUNDED, scale: 1, guarded: false };
  }

  update(fighters, dt) {
    if (!this.enabled) {
      return;
    }
    for (const fighter of fighters) {
      fighter.combat.powerCooldown = Math.max(0, fighter.combat.powerCooldown - dt);
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

  canCast(fighter, power) {
    return this.enabled && power !== null && fighter.combat.powerCooldown === 0 && fighter.flowMeter >= power.cost;
  }

  tryCast(fighter) {
    const power = selectPower(fighter);
    if (!this.canCast(fighter, power)) {
      return false;
    }
    fighter.flowMeter -= power.cost;
    fighter.clearAttack();
    fighter.combat.power = power;
    fighter.restartState(power.channel ? FighterState.CHANNELING : FighterState.CASTING);
    this.aim(fighter, null, power);
    this.combat.emitAction(CombatEvent.POWER_START, fighter, power.id);
    return true;
  }

  resolve(fighters, dt) {
    if (!this.enabled) {
      return;
    }
    for (const caster of fighters) {
      if (!isUsingPower(caster)) {
        continue;
      }
      const target = this.findOpponent(caster, fighters);
      if (caster.combat.power.channel) {
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
      this.affect(caster, target, power, 'active');
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
      if (holding || !combat.powerTargeted) {
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
      this.affect(caster, target, power, 'tick');
    }
  }

  affect(caster, target, power, phase) {
    const inRange = target !== null && isInPowerRange(caster, target, power, this.config.airReach);
    this.aim(caster, inRange ? target : null, power);
    if (!inRange || isInvulnerable(target)) {
      return;
    }
    if (isBarrierUp(target)) {
      this.absorb(caster, target, power);
      return;
    }
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
    context.scale = interaction.scale * caster.stats.power.potency * context.air.scale;
    context.guarded = interaction.blockable && isGuardingAgainst(target, caster);
    powerEffects[power.effect][phase](context);
  }

  absorb(caster, target, power) {
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
    combat.powerTargetX = caster.x + caster.facing * (caster.width / 2 + (power.range ?? 0));
    combat.powerTargetY = caster.y - caster.height * this.config.castHeight;
  }

  finish(caster) {
    caster.clearPower();
    caster.combat.powerCooldown = this.config.cooldown;
    caster.setState(FighterState.IDLE);
  }
}

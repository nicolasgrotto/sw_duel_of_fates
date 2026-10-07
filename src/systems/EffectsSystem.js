import { isStrongAttack } from '../combat/attackPhases.js';
import { CombatEvent } from '../combat/combatEvents.js';
import { degreesToRadians } from '../utils/math.js';
import { pick, randomInt, randomRange } from '../utils/random.js';
import { ParticlePool } from './ParticlePool.js';

export const EffectType = Object.freeze({
  HIT_SPARK: 'hitSpark',
  HEAVY_IMPACT: 'heavyImpact',
  BLOCK_SPARK: 'blockSpark',
  GUARD_BREAK: 'guardBreak',
  SABER_CLASH: 'saberClash',
  FINAL_BLOW: 'finalBlow',
  PARRY_SPARK: 'parrySpark',
  PERFECT_PARRY: 'perfectParry',
  SHOVE_IMPACT: 'shoveImpact',
});

function createLight() {
  return {
    active: false,
    x: 0,
    y: 0,
    color: '',
    radius: 0,
    peakAlpha: 0,
    alpha: 0,
    time: 0,
    duration: 0,
  };
}

function createRing() {
  return {
    active: false,
    x: 0,
    y: 0,
    color: '',
    startRadius: 0,
    maxRadius: 0,
    radius: 0,
    lineWidth: 0,
    alpha: 0,
    time: 0,
    duration: 0,
  };
}

export class EffectsSystem {
  constructor(config, camera, random, timeControl) {
    this.config = config;
    this.camera = camera;
    this.random = random;
    this.timeControl = timeControl;
    this.shakeScale = 1;
    this.flashScale = 1;
    this.punchScale = 1;
    this.hitFlashes = new Map();
    this.tremors = new Map();
    this.particles = new ParticlePool(config.maxParticles);
    this.lights = Array.from({ length: config.maxLights }, createLight);
    this.rings = Array.from({ length: config.maxRings }, createRing);
    this.saberFlares = new Map();
    this.desaturation = { amount: 0, peakAmount: 0, time: 0, duration: 0 };
    this.flash = {
      color: config.flashColor,
      peakAlpha: 0,
      alpha: 0,
      time: 0,
      duration: 0,
    };
  }

  setReduced(reduced) {
    this.punchScale = reduced ? this.config.reduced.punchScale : 1;
    if (reduced) {
      this.hitFlashes.clear();
    }
    this.shakeScale = reduced ? this.config.reduced.shakeScale : 1;
    this.flashScale = reduced ? this.config.reduced.flashScale : 1;
  }

  handleEvents(events) {
    for (const event of events) {
      this.handleEvent(event);
    }
  }

  handleEvent(event) {
    const { attacker, defender, x, y } = event;
    const params = {
      x,
      y,
      direction: attacker.facing,
      color: attacker.appearance.saberColor,
      secondaryColor: null,
    };

    switch (event.type) {
      case CombatEvent.HIT:
        if (this.flashScale > 0) {
          this.hitFlashes.set(defender, this.config.hitFlashDuration);
        }
        this.startTremor(defender);
        this.spawn(isStrongAttack(event.attackType) ? EffectType.HEAVY_IMPACT : EffectType.HIT_SPARK, params);
        break;
      case CombatEvent.BLOCK:
        this.spawn(EffectType.BLOCK_SPARK, params);
        break;
      case CombatEvent.GUARD_BREAK:
        this.spawn(EffectType.GUARD_BREAK, params);
        break;
      case CombatEvent.CLASH:
        params.secondaryColor = defender.appearance.saberColor;
        this.spawn(EffectType.SABER_CLASH, params);
        break;
      case CombatEvent.DEATH:
        this.spawn(EffectType.FINAL_BLOW, params);
        break;
      case CombatEvent.SHOVE:
        this.spawn(EffectType.SHOVE_IMPACT, params);
        break;
      case CombatEvent.COUNTER:
        this.spawnParry(EffectType.PARRY_SPARK, defender, params);
        break;
      case CombatEvent.PARRY:
        this.startTremor(attacker);
        this.spawnParry(EffectType.PARRY_SPARK, defender, params);
        break;
      case CombatEvent.PERFECT_PARRY:
        this.startTremor(attacker);
        this.spawnParry(EffectType.PERFECT_PARRY, defender, params);
        break;
      default:
        break;
    }
  }

  spawnParry(type, defender, params) {
    const recipe = this.config.recipes[type];
    params.color = defender.appearance.saberColor;
    params.direction = defender.facing;
    this.spawn(type, params);
    this.spawnRing(recipe.ring, params.x, params.y, params.color);
    if (recipe.saberFlare) {
      this.saberFlares.set(defender, this.config.saberFlare.duration);
    }
    if (recipe.desaturate) {
      this.startDesaturation(recipe.desaturate);
    }
  }

  startTremor(fighter) {
    this.tremors.set(fighter, { time: 0, offset: this.config.hitStopTremor.amplitude * this.shakeScale });
  }

  getTremor(fighter) {
    return this.tremors.get(fighter)?.offset ?? 0;
  }

  hasHitFlash(fighter) {
    return (this.hitFlashes.get(fighter) ?? 0) > 0;
  }

  updateTremors(dt) {
    if (!this.timeControl.isFrozen) {
      this.tremors.clear();
      return;
    }
    const { amplitude, interval } = this.config.hitStopTremor;
    for (const tremor of this.tremors.values()) {
      tremor.time += dt;
      const direction = Math.floor(tremor.time / interval) % 2 === 0 ? 1 : -1;
      tremor.offset = direction * amplitude * this.shakeScale;
    }
  }

  getSaberFlare(fighter) {
    const remaining = this.saberFlares.get(fighter) ?? 0;
    return remaining / this.config.saberFlare.duration;
  }

  spawn(type, { x, y, direction, color, secondaryColor }) {
    const recipe = this.config.recipes[type];

    this.spawnSparks(recipe, x, y, direction);
    if (recipe.light) {
      this.spawnLight(recipe.light, x, y, color);
      if (secondaryColor) {
        this.spawnLight(recipe.light, x, y, secondaryColor);
      }
    }
    if (recipe.shake && this.shakeScale > 0) {
      this.camera.shake(recipe.shake.amplitude * this.shakeScale, recipe.shake.duration);
    }
    if (recipe.punch && this.punchScale > 0) {
      this.camera.punch(recipe.punch.zoom * this.punchScale, recipe.punch.duration, x, y);
    }
    if (recipe.flash && this.flashScale > 0) {
      this.startFlash(recipe.flash.alpha * this.flashScale, recipe.flash.duration);
    }
    if (recipe.hitStop > 0) {
      this.timeControl.hitStop(recipe.hitStop);
    }
    if (recipe.slowMotion) {
      this.timeControl.slowMotion(recipe.slowMotion.duration, recipe.slowMotion.scale);
    }
  }

  spawnSparks(recipe, x, y, direction) {
    const count = randomInt(this.random, recipe.count);
    const upward = degreesToRadians(recipe.upwardDegrees);
    const baseAngle = direction >= 0 ? -upward : Math.PI + upward;
    const spread = degreesToRadians(recipe.spreadDegrees);

    for (let i = 0; i < count; i += 1) {
      const particle = this.particles.acquire();
      if (!particle) {
        return;
      }

      const angle = baseAngle + (this.random() - 0.5) * spread;
      const speed = randomRange(this.random, recipe.speed);
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.maxLife = randomRange(this.random, recipe.life);
      particle.life = particle.maxLife;
      particle.size = randomRange(this.random, recipe.size);
      particle.color = pick(this.random, this.config.sparkColors);
    }
  }

  spawnLight({ radius, alpha, duration }, x, y, color) {
    const light = this.findFreeLight();
    light.active = true;
    light.x = x;
    light.y = y;
    light.color = color;
    light.radius = radius;
    light.peakAlpha = alpha;
    light.alpha = alpha;
    light.time = 0;
    light.duration = duration;
  }

  spawnRing({ radius, lineWidth, alpha, duration }, x, y, color) {
    let ring = this.rings[0];
    for (const candidate of this.rings) {
      if (!candidate.active) {
        ring = candidate;
        break;
      }
      if (candidate.time > ring.time) {
        ring = candidate;
      }
    }
    ring.active = true;
    ring.x = x;
    ring.y = y;
    ring.color = color;
    ring.startRadius = this.config.ringStartRadius;
    ring.maxRadius = radius;
    ring.radius = ring.startRadius;
    ring.lineWidth = lineWidth;
    ring.alpha = alpha;
    ring.time = 0;
    ring.duration = duration;
  }

  startDesaturation({ amount, duration }) {
    const { desaturation } = this;
    desaturation.peakAmount = Math.min(amount, 1);
    desaturation.amount = desaturation.peakAmount;
    desaturation.time = 0;
    desaturation.duration = Math.min(duration, this.config.maxDesaturationDuration);
  }

  findFreeLight() {
    let oldest = this.lights[0];
    for (const light of this.lights) {
      if (!light.active) {
        return light;
      }
      if (light.time > oldest.time) {
        oldest = light;
      }
    }
    return oldest;
  }

  startFlash(alpha, duration) {
    const limitedAlpha = Math.min(alpha, this.config.maxFlashAlpha);
    if (limitedAlpha < this.flash.alpha) {
      return;
    }
    this.flash.peakAlpha = limitedAlpha;
    this.flash.alpha = limitedAlpha;
    this.flash.time = 0;
    this.flash.duration = duration;
  }

  update(dt) {
    this.particles.update(dt, this.config.particle);
    this.updateLights(dt);
    this.updateFlash(dt);
    this.updateRings(dt);
    this.updateTimers(this.saberFlares, dt);
    this.updateTimers(this.hitFlashes, dt);
    this.updateTremors(dt);
    this.updateDesaturation(dt);
  }

  updateRings(dt) {
    for (const ring of this.rings) {
      if (!ring.active) {
        continue;
      }
      ring.time += dt;
      if (ring.time >= ring.duration) {
        ring.active = false;
        continue;
      }
      const progress = ring.time / ring.duration;
      ring.radius = ring.startRadius + (ring.maxRadius - ring.startRadius) * (1 - (1 - progress) * (1 - progress));
    }
  }

  updateTimers(timers, dt) {
    for (const [fighter, remaining] of timers) {
      if (remaining <= dt) {
        timers.delete(fighter);
      } else {
        timers.set(fighter, remaining - dt);
      }
    }
  }

  updateDesaturation(dt) {
    const { desaturation } = this;
    if (desaturation.amount <= 0) {
      return;
    }
    desaturation.time += dt;
    desaturation.amount =
      desaturation.time >= desaturation.duration ? 0 : desaturation.peakAmount * (1 - desaturation.time / desaturation.duration);
  }

  updateLights(dt) {
    for (const light of this.lights) {
      if (!light.active) {
        continue;
      }
      light.time += dt;
      if (light.time >= light.duration) {
        light.active = false;
        light.alpha = 0;
        continue;
      }
      const remaining = 1 - light.time / light.duration;
      light.alpha = light.peakAlpha * remaining * remaining;
    }
  }

  updateFlash(dt) {
    const { flash } = this;
    if (flash.alpha <= 0) {
      return;
    }
    flash.time += dt;
    flash.alpha = flash.time >= flash.duration ? 0 : flash.peakAlpha * (1 - flash.time / flash.duration);
  }
}

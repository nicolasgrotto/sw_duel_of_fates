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

export class EffectsSystem {
  constructor(config, camera, random, timeControl) {
    this.config = config;
    this.camera = camera;
    this.random = random;
    this.timeControl = timeControl;
    this.shakeScale = 1;
    this.flashScale = 1;
    this.particles = new ParticlePool(config.maxParticles);
    this.lights = Array.from({ length: config.maxLights }, createLight);
    this.flash = {
      color: config.flashColor,
      peakAlpha: 0,
      alpha: 0,
      time: 0,
      duration: 0,
    };
  }

  setReduced(reduced) {
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
      default:
        break;
    }
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

import { finisherStyle } from '../config/fighterVisualConfig.js';
import { isStrongAttack } from '../combat/attackPhases.js';
import { CombatEvent } from '../combat/combatEvents.js';
import { getPowerTier } from '../combat/flowInteractions.js';
import { getPowerRange } from '../combat/PowerSystem.js';
import { combatRulesConfig } from '../config/combatRulesConfig.js';
import { powersConfig } from '../config/powersConfig.js';
import { colors } from '../config/themeConfig.js';
import { clamp, degreesToRadians } from '../utils/math.js';
import { pick, randomInt, randomRange } from '../utils/random.js';
import { FighterState } from '../entities/fighterStates.js';
import { ParticlePool } from './ParticlePool.js';

export const EffectType = Object.freeze({
  HIT_SPARK: 'hitSpark',
  HEAVY_IMPACT: 'heavyImpact',
  WOUND_SPARK: 'woundSpark',
  FINISHER_CUT: 'finisherCut',
  BLOCK_SPARK: 'blockSpark',
  GUARD_BREAK: 'guardBreak',
  SABER_CLASH: 'saberClash',
  FINAL_BLOW: 'finalBlow',
  PARRY_SPARK: 'parrySpark',
  PERFECT_PARRY: 'perfectParry',
  SHOVE_IMPACT: 'shoveImpact',
  BLADE_LOCK_START: 'bladeLockStart',
  BLADE_LOCK_GRIND: 'bladeLockGrind',
  BLADE_LOCK_PRESS: 'bladeLockPress',
  BLADE_LOCK_WIN: 'bladeLockWin',
  BLADE_LOCK_BREAK: 'bladeLockBreak',
  COUNTER_FLOURISH: 'counterFlourish',
  STORM_STRIKE: 'stormStrike',
  METEOR_IMPACT: 'meteorImpact',
  FRACTURE_SLAM: 'fractureSlam',
  FRACTURE_BURST: 'fractureBurst',
  SANCTUARY_SHATTER: 'sanctuaryShatter',
  STORM_CALL: 'stormCall',
  POWER_WAVE: 'powerWave',
  POWER_IMPACT: 'powerImpact',
  LIGHTNING_TICK: 'lightningTick',
  POWER_BLOCKED: 'powerBlocked',
  POWER_RESISTED: 'powerResisted',
  POWER_ABSORBED: 'powerAbsorbed',
});

function getTierColor(fighter) {
  return getPowerTier(fighter.flowLevel, powersConfig.tiers).color;
}

function createShockwave() {
  return { active: false, x: 0, y: 0, direction: 1, range: 0, scale: 1, color: '', time: 0 };
}

function createStormStrike(segments) {
  return { active: false, x: 0, floorY: 0, time: 0, color: '', width: 0, points: new Float32Array((segments + 1) * 2) };
}

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
    contract: false,
  };
}

const THROW_IMPACTS = new Set([CombatEvent.POWER_HIT, CombatEvent.POWER_BLOCKED, CombatEvent.POWER_RESISTED, CombatEvent.POWER_ABSORBED]);

export class EffectsSystem {
  constructor(config, camera, random, timeControl) {
    this.config = config;
    this.camera = camera;
    this.random = random;
    this.timeControl = timeControl;
    this.shakeScale = 1;
    this.evadeGlowScale = 1;
    this.flashScale = 1;
    this.punchScale = 1;
    this.reduced = false;
    this.showFinishers = true;
    this.eventParams = { x: 0, y: 0, direction: 1, color: '', secondaryColor: null, particleScale: 1 };
    this.evadeAfterimages = new Map();
    this.hitFlashes = new Map();
    this.tremors = new Map();
    this.spasms = new Map();
    this.particles = new ParticlePool(config.maxParticles);
    this.debris = new ParticlePool(config.maxDebris);
    this.stormStrikes = Array.from({ length: config.maxStormStrikes }, () => createStormStrike(config.stormStrike.segments));
    this.ringParams = { radius: 0, lineWidth: 0, alpha: 0, duration: 0 };
    this.lights = Array.from({ length: config.maxLights }, createLight);
    this.rings = Array.from({ length: config.maxRings }, createRing);
    this.shockwaves = Array.from({ length: config.maxShockwaves }, createShockwave);
    this.saberFlares = new Map();
    this.bladeLock = { active: false, first: null, second: null, advantage: 0, sparkTime: 0 };
    this.lockWinners = new Set();
    this.counterFlourishes = new Set();
    this.desaturation = { amount: 0, peakAmount: 0, time: 0, duration: 0 };
    this.flash = {
      color: config.flashColor,
      peakAlpha: 0,
      alpha: 0,
      time: 0,
      duration: 0,
    };
  }

  spawnFinisherCut(defender, params) {
    const { combat, height } = defender;
    params.x = combat.finisherX + combat.finisherDirection * height * finisherStyle.startOffset;
    params.y = combat.finisherY - height * finisherStyle.startHeight[combat.finisherLimb];
    params.direction = combat.finisherDirection;
    this.spawn(EffectType.FINISHER_CUT, params);
  }

  setReduced(reduced) {
    this.reduced = reduced;
    this.punchScale = reduced ? this.config.reduced.punchScale : 1;
    if (reduced) {
      this.hitFlashes.clear();
    }
    this.shakeScale = reduced ? this.config.reduced.shakeScale : 1;
    this.evadeGlowScale = reduced ? this.config.evadeGlow.reducedScale : 1;
    this.flashScale = reduced ? this.config.reduced.flashScale : 1;
  }

  handleEvents(events) {
    for (const event of events) {
      this.handleEvent(event);
    }
  }

  handleEvent(event) {
    const { attacker, defender, x, y } = event;
    if (event.attackType === 'throw' && THROW_IMPACTS.has(event.type)) {
      this.spawnDebris(x, y, attacker.facing);
    }
    if (event.type === CombatEvent.POWER_START && event.attackType === 'throw') {
      this.spawnThrowDust(attacker);
    }
    const params = this.eventParams;
    params.x = x;
    params.y = y;
    params.direction = attacker.facing;
    params.color = attacker.appearance.saberColor;
    params.secondaryColor = null;
    params.particleScale = 1;

    switch (event.type) {
      case CombatEvent.WOUND:
        this.spawn(EffectType.WOUND_SPARK, params);
        break;
      case CombatEvent.WOUND_HEALED:
        this.spawnLight(this.config.woundHealedLight, attacker.x, attacker.y - attacker.height / 2, getTierColor(attacker));
        break;
      case CombatEvent.EVADE_SUCCESS:
        this.evadeAfterimages.set(defender, this.config.evadeAfterimageDuration);
        this.spawnEvadeGlow(defender);
        break;
      case CombatEvent.HIT:
        if (this.flashScale > 0) {
          this.hitFlashes.set(defender, this.config.hitFlashDuration);
        }
        this.startTremor(defender);
        this.spawn(isStrongAttack(event.attackType) ? EffectType.HEAVY_IMPACT : EffectType.HIT_SPARK, params);
        if (defender.combat.sanctuaryShield > 0) {
          this.spawnRing(this.config.sanctuaryHitRing, x, y, getTierColor(defender));
        }
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
        if (event.finisher && this.showFinishers) this.spawnFinisherCut(defender, params);
        break;
      case CombatEvent.SHOVE:
        this.spawn(EffectType.SHOVE_IMPACT, params);
        break;
      case CombatEvent.BLADE_LOCK_START:
        this.startBladeLock(attacker, defender, params);
        break;
      case CombatEvent.BLADE_LOCK_PRESS:
        this.pressBladeLock(event, params);
        break;
      case CombatEvent.BLADE_LOCK_END:
        this.endBladeLock(event, params);
        break;
      case CombatEvent.COUNTER:
        this.spawnParry(EffectType.PARRY_SPARK, defender, params);
        if (defender.moves?.special?.counter?.flourish) {
          this.startCounterFlourish(defender, params);
        }
        break;
      case CombatEvent.PARRY:
        this.startTremor(attacker);
        this.spawnParry(EffectType.PARRY_SPARK, defender, params);
        break;
      case CombatEvent.PERFECT_PARRY:
        this.startTremor(attacker);
        this.spawnParry(EffectType.PERFECT_PARRY, defender, params);
        break;
      case CombatEvent.POWER_START:
        if (event.attackType === 'meteorRain' && this.camera) {
          const cinematic = this.config.meteorCinematic;
          this.camera.cinematic(cinematic.lift, cinematic.zoom, powersConfig.powers.meteorRain.startup + cinematic.extra);
        }
        break;
      case CombatEvent.FRACTURE_BURST:
        this.spawnFractureBurst(attacker, x, y, params);
        break;
      case CombatEvent.WAVE_REFLECT:
        this.spawnWaveReflect(attacker, x, y, params);
        break;
      case CombatEvent.ARSENAL_BLOCK:
        this.spawnArsenalBlock(defender ?? attacker, x, y, params);
        break;
      case CombatEvent.RAIN_CALL:
        this.spawnMeteorBreak(attacker, params);
        break;
      case CombatEvent.RAIN_STRIKE:
        this.spawnMeteorImpact(attacker, x, y, params);
        break;
      case CombatEvent.SANCTUARY_BREAK:
        this.spawnSanctuaryBreak(defender, params);
        break;
      case CombatEvent.WRATH_ARMOR:
        this.spawnWrathArmor(defender);
        break;
      case CombatEvent.STORM_STRIKE:
        this.spawnStormStrike(attacker, x, y, params);
        break;
      case CombatEvent.POWER_ACTIVE:
        if (event.attackType === 'storm') {
          this.spawnStormCall(attacker, params);
        } else if (event.attackType === 'push') {
          this.spawnShockwave(attacker);
        } else if (event.attackType === 'meteorRain') {
          break;
        } else if (event.attackType === 'fracture') {
          this.spawnFractureSlam(attacker, params);
        } else if (event.attackType === 'supremePush') {
          this.spawnSupremePush(attacker);
        } else {
          this.spawnPowerWave(attacker, event.attackType === 'pull', params);
        }
        break;
      case CombatEvent.POWER_HIT:
        if (event.attackType === 'drain') {
          break;
        }
        if (event.attackType === 'mindTwist') {
          this.spawnMindTwist(attacker, defender);
          break;
        }
        params.color = getTierColor(attacker);
        params.particleScale = getPowerTier(attacker.flowLevel, powersConfig.tiers).particleScale;
        if (this.flashScale > 0 && event.attackType !== 'storm') {
          this.hitFlashes.set(defender, this.config.hitFlashDuration);
        }
        if (event.attackType === 'storm') {
          this.spasms.set(defender, this.config.stormSpasm.duration);
          break;
        }
        this.spawn(event.attackType === 'lightning' ? EffectType.LIGHTNING_TICK : EffectType.POWER_IMPACT, params);
        break;
      case CombatEvent.POWER_BLOCKED:
        params.color = getTierColor(attacker);
        params.particleScale = getPowerTier(attacker.flowLevel, powersConfig.tiers).particleScale;
        this.spawn(EffectType.POWER_BLOCKED, params);
        break;
      case CombatEvent.POWER_RESISTED:
        this.spawnPowerRing(EffectType.POWER_RESISTED, defender, params);
        break;
      case CombatEvent.POWER_ABSORBED:
        if (defender.combat.absorbTime > 0 && event.attackType !== 'storm') {
          this.spawnAbsorb(defender);
          break;
        }
        this.spawnPowerRing(EffectType.POWER_ABSORBED, defender, params);
        break;
      default:
        break;
    }
  }

  startBladeLock(first, second, params) {
    const lock = this.bladeLock;
    lock.active = true;
    lock.first = first;
    lock.second = second;
    lock.advantage = 0;
    lock.sparkTime = this.config.bladeLock.sparkInterval;
    this.placeAtLockContact(params);
    params.secondaryColor = second.appearance.saberColor;
    this.spawn(EffectType.BLADE_LOCK_START, params);
  }

  pressBladeLock(event, params) {
    const lock = this.bladeLock;
    if (!lock.active) return;
    const presser = event.attacker;
    lock.advantage = presser === lock.first ? event.advantage : -event.advantage;
    this.placeAtLockContact(params);
    this.spawn(EffectType.BLADE_LOCK_PRESS, params);
    this.spawnLight(this.config.bladeLock.pressLight, params.x, params.y, presser.appearance.saberColor);
  }

  endBladeLock(event, params) {
    const lock = this.bladeLock;
    if (!lock.active) return;
    this.placeAtLockContact(params);
    lock.active = false;
    if (event.winner) {
      params.direction = event.winner.facing;
      params.color = event.winner.appearance.saberColor;
      if (this.flashScale > 0) {
        this.hitFlashes.set(event.loser, this.config.hitFlashDuration);
      }
      this.lockWinners.add(event.winner);
      this.spawn(EffectType.BLADE_LOCK_WIN, params);
    } else if (event.draw) {
      params.color = lock.first.appearance.saberColor;
      params.secondaryColor = lock.second.appearance.saberColor;
      this.spawn(EffectType.BLADE_LOCK_BREAK, params);
    }
  }

  placeAtLockContact(params) {
    const { first, second, advantage } = this.bladeLock;
    const side = Math.sign(second.x - first.x) || first.facing;
    const shift = clamp(advantage / combatRulesConfig.bladeLock.winMargin, -1, 1) * this.config.bladeLock.contactShift;
    params.x = (first.x + second.x) / 2 + side * shift;
    params.y = first.y - this.config.bladeLock.contactHeight;
    return params;
  }

  startCounterFlourish(defender, params) {
    this.counterFlourishes.add(defender);
    this.saberFlares.set(defender, this.config.saberFlare.duration);
    this.spawn(EffectType.COUNTER_FLOURISH, params);
  }

  isCounterFlourish(fighter) {
    return this.counterFlourishes.has(fighter);
  }

  updateCounterFlourishes() {
    for (const fighter of this.counterFlourishes) {
      const attacking = fighter.state === FighterState.ATTACKING || fighter.state === FighterState.HEAVY_ATTACK;
      if (!attacking || fighter.combat.attackType !== 'riposte') this.counterFlourishes.delete(fighter);
    }
  }

  isLockWinner(fighter) {
    return this.lockWinners.has(fighter);
  }

  updateBladeLock(dt) {
    for (const winner of this.lockWinners) {
      if (winner.state !== FighterState.HIT) this.lockWinners.delete(winner);
    }
    const lock = this.bladeLock;
    if (!lock.active) return;
    if (lock.first.state !== FighterState.BLADE_LOCK || lock.second.state !== FighterState.BLADE_LOCK) {
      lock.active = false;
      return;
    }
    lock.sparkTime -= dt;
    if (lock.sparkTime > 0) return;
    lock.sparkTime += this.config.bladeLock.sparkInterval;
    const params = this.placeAtLockContact(this.eventParams);
    const recipe = this.config.recipes[EffectType.BLADE_LOCK_GRIND];
    const direction = this.random() < 0.5 ? 1 : -1;
    this.spawnSparks(recipe, params.x, params.y, direction, null, this.reduced ? this.config.bladeLock.reducedSparkScale : 1);
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

  spawnShockwave(caster, direction = caster.facing, range = powersConfig.powers.push.range, scale = 1) {
    const style = this.config.shockwave;
    let wave = this.shockwaves[0];
    for (const candidate of this.shockwaves) {
      if (!candidate.active) {
        wave = candidate;
        break;
      }
      if (candidate.time > wave.time) {
        wave = candidate;
      }
    }
    wave.active = true;
    wave.x = caster.x + direction * (caster.width / 2 + powersConfig.render.waveOffset);
    wave.y = caster.y - caster.height * powersConfig.castHeight;
    wave.direction = direction;
    wave.range = range;
    const tier = getPowerTier(caster.flowLevel, powersConfig.tiers);
    wave.scale = tier.waveScale * scale;
    wave.color = tier.color;
    wave.time = 0;
    this.spawnLight(style.light, wave.x, wave.y, wave.color);
    this.spawnShockwaveDust(caster, wave, style.dust, tier.particleScale);
  }

  spawnShockwaveDust(caster, wave, dust, scale) {
    const count = Math.round((this.reduced ? dust.reducedCount : dust.count) * scale);
    for (let i = 0; i < count; i += 1) {
      const particle = this.particles.acquire();
      if (!particle) return;
      particle.x = wave.x + wave.direction * wave.range * this.random();
      particle.y = caster.y;
      particle.vx = wave.direction * randomRange(this.random, dust.speed);
      particle.vy = -randomRange(this.random, dust.lift);
      particle.life = randomRange(this.random, dust.life);
      particle.maxLife = particle.life;
      particle.size = randomRange(this.random, dust.size);
      particle.color = colors.shockwaveDust;
    }
  }

  spawnPowerWave(caster, contract, params) {
    const recipe = this.config.recipes[EffectType.POWER_WAVE];
    const tier = getPowerTier(caster.flowLevel, powersConfig.tiers);
    const handOffset = caster.width / 2 + powersConfig.render.waveOffset;
    params.color = tier.color;
    params.particleScale = tier.particleScale;
    params.x = caster.x + caster.facing * handOffset;
    params.y = caster.y - caster.height * powersConfig.castHeight;
    this.spawn(EffectType.POWER_WAVE, params);
    if (!contract) {
      this.spawnRing(recipe.ring, params.x, params.y, params.color);
      return;
    }
    const ring = this.ringParams;
    ring.radius = getPowerRange(caster, powersConfig.powers.pull) - handOffset;
    ring.lineWidth = recipe.ring.lineWidth * tier.waveScale;
    ring.alpha = recipe.ring.alpha;
    ring.duration = recipe.ring.duration;
    this.spawnRing(ring, params.x, params.y, params.color, true);
  }

  spawnStormCall(caster, params) {
    params.color = getTierColor(caster);
    params.x = caster.x;
    params.y = this.config.stormStrike.skyY;
    this.spawn(EffectType.STORM_CALL, params);
  }

  spawnStormStrike(caster, x, floorY, params) {
    const style = this.config.stormStrike;
    const tier = getPowerTier(caster.flowLevel, powersConfig.tiers);
    let strike = this.stormStrikes[0];
    for (const candidate of this.stormStrikes) {
      if (!candidate.active) {
        strike = candidate;
        break;
      }
      if (candidate.time > strike.time) strike = candidate;
    }
    strike.active = true;
    strike.x = x;
    strike.floorY = floorY;
    strike.time = 0;
    strike.color = tier.color;
    strike.width = tier.boltWidth * style.widthScale;
    const last = style.segments;
    for (let index = 0; index <= last; index += 1) {
      const t = index / last;
      const envelope = Math.sin(t * Math.PI);
      strike.points[index * 2] = x + (this.random() * 2 - 1) * style.jitter * envelope;
      strike.points[index * 2 + 1] = style.skyY + (floorY - style.skyY) * t;
    }
    params.x = x;
    params.y = floorY;
    params.direction = this.random() < 0.5 ? 1 : -1;
    params.color = tier.color;
    params.particleScale = tier.particleScale;
    this.spawn(EffectType.STORM_STRIKE, params);
  }

  updateStormStrikes(dt) {
    const { duration } = this.config.stormStrike;
    for (const strike of this.stormStrikes) {
      if (!strike.active) continue;
      strike.time += dt;
      if (strike.time >= duration) strike.active = false;
    }
  }

  spawnWaveReflect(reflector, x, y, params) {
    const style = this.config.waveReflect;
    params.x = x;
    params.y = y;
    params.direction = reflector.facing;
    params.color = reflector.appearance.saberColor;
    this.spawn(EffectType.PARRY_SPARK, params);
    this.spawnRing(style.ring, x, y, params.color);
    this.spawnLight(style.light, x, y, params.color);
    this.saberFlares.set(reflector, this.config.saberFlare.duration);
  }

  spawnArsenalBlock(owner, x, y, params) {
    const color = getTierColor(owner);
    this.spawnRing(this.config.arsenalBlock.ring, x, y, color);
    params.x = x;
    params.y = y;
    params.color = color;
    params.direction = owner.facing;
    this.spawn(EffectType.BLOCK_SPARK, params);
  }

  spawnFractureSlam(caster, params) {
    const dust = this.config.fractureSlam.dust;
    const x = caster.x + caster.facing * caster.width / 2;
    params.x = x;
    params.y = caster.y;
    params.color = getTierColor(caster);
    this.spawn(EffectType.FRACTURE_SLAM, params);
    const count = this.reduced ? dust.reducedCount : dust.count;
    for (let i = 0; i < count; i += 1) {
      const particle = this.particles.acquire();
      if (!particle) return;
      particle.x = x + (this.random() * 2 - 1) * dust.spread;
      particle.y = caster.y;
      particle.vx = (this.random() * 2 - 1) * randomRange(this.random, dust.speed);
      particle.vy = -randomRange(this.random, dust.lift);
      particle.life = randomRange(this.random, dust.life);
      particle.maxLife = particle.life;
      particle.size = randomRange(this.random, dust.size);
      particle.color = colors.shockwaveDust;
    }
  }

  spawnFractureBurst(caster, x, floorY, params) {
    const tier = getPowerTier(caster.flowLevel, powersConfig.tiers);
    params.x = x;
    params.y = floorY;
    params.direction = caster.facing;
    params.color = tier.color;
    params.particleScale = tier.particleScale;
    this.spawn(EffectType.FRACTURE_BURST, params);
    const piece = this.debris.acquire();
    if (!piece) return;
    piece.x = x;
    piece.y = floorY;
    piece.vx = (this.random() * 2 - 1) * 120;
    piece.vy = -randomRange(this.random, [180, 320]);
    piece.life = 0.5;
    piece.maxLife = 0.5;
    piece.size = randomRange(this.random, [3, 5]);
    piece.color = colors.floorEdge;
  }

  spawnMeteorBreak(caster, params) {
    const meteor = powersConfig.render.meteor;
    const color = getTierColor(caster);
    const x = caster.x + caster.facing * meteor.asteroidOffsetX;
    const y = meteor.asteroidToY;
    this.spawnLight(this.config.meteorBreak.light, x, y, color);
    this.spawnDebris(x, y, caster.facing);
    this.spawnDebris(x, y, -caster.facing);
    params.x = x;
    params.y = y;
  }

  spawnMeteorImpact(caster, x, floorY, params) {
    const tier = getPowerTier(caster.flowLevel, powersConfig.tiers);
    params.x = x;
    params.y = floorY;
    params.direction = caster.facing;
    params.color = tier.color;
    params.particleScale = tier.particleScale;
    this.spawn(EffectType.METEOR_IMPACT, params);
    this.spawnDebris(x, floorY, 1);
    this.spawnDebris(x, floorY, -1);
  }

  spawnSupremePush(caster) {
    const style = this.config.supremePush;
    const color = getTierColor(caster);
    const x = caster.x;
    const y = caster.y - caster.height / 2;
    if (caster.combat.powerMode === 'escape') {
      this.spawnRing(style.escapeRing, x, y, color);
      this.spawnLight(style.escapeLight, x, y, color);
      return;
    }
    const range = powersConfig.powers.supremePush.range;
    this.spawnShockwave(caster, 1, range, style.waveScale);
    this.spawnShockwave(caster, -1, range, style.waveScale);
    this.spawnRing(style.ring, x, y, color);
    this.spawnLight(style.light, x, y, color);
  }

  spawnSanctuaryBreak(fighter, params) {
    const style = this.config.sanctuaryBreak;
    const color = getTierColor(fighter);
    params.x = fighter.x;
    params.y = fighter.y - fighter.height / 2;
    params.color = color;
    params.particleScale = 1;
    this.spawn(EffectType.SANCTUARY_SHATTER, params);
    this.spawnRing(style.ring, params.x, params.y, color);
    this.spawnLight(style.light, params.x, params.y, color);
  }

  spawnWrathArmor(fighter) {
    const color = getPowerTier(fighter.combat.statusLevel, powersConfig.tiers).color;
    const x = fighter.x;
    const y = fighter.y - fighter.height / 2;
    this.spawnRing(this.config.wrathArmorRing, x, y, color);
    this.spawnLight(this.config.wrathArmorLight, x, y, color);
  }

  spawnMindTwist(caster, target) {
    const style = powersConfig.render.status;
    const color = getTierColor(caster);
    const x = target.x;
    const y = target.y - target.height * style.confuseHeight;
    this.spawnRing(this.config.mindTwistRing, x, y, color);
    this.spawnLight(this.config.mindTwistLight, x, y, color);
  }

  spawnAbsorb(defender) {
    const style = powersConfig.render.absorb;
    const tier = getPowerTier(defender.flowLevel, powersConfig.tiers);
    const x = defender.x + defender.facing * (defender.width / 2 + powersConfig.render.handOffset);
    const y = defender.y - defender.height * powersConfig.castHeight;
    const ring = this.ringParams;
    ring.radius = style.ringRadius;
    ring.lineWidth = this.config.recipes[EffectType.POWER_ABSORBED].ring.lineWidth;
    ring.alpha = this.config.recipes[EffectType.POWER_ABSORBED].ring.alpha;
    ring.duration = style.life;
    this.spawnRing(ring, x, y, tier.color, true);
    this.spawnLight(this.config.recipes[EffectType.POWER_ABSORBED].light, x, y, tier.color);
    const count = Math.round((this.reduced ? style.reducedParticles : style.particles) * tier.particleScale);
    for (let i = 0; i < count; i += 1) {
      const particle = this.particles.acquire();
      if (!particle) return;
      const angle = ((i + this.random()) / count) * Math.PI * 2;
      particle.x = x + Math.cos(angle) * style.radius;
      particle.y = y + Math.sin(angle) * style.radius;
      particle.vx = -Math.cos(angle) * (style.radius / style.life);
      particle.vy = -Math.sin(angle) * (style.radius / style.life);
      particle.life = style.life;
      particle.maxLife = style.life;
      particle.size = style.size;
      particle.color = tier.color;
    }
  }

  spawnThrowDust(caster) {
    const dust = this.config.throwDust;
    const count = Math.round(dust.count * (this.reduced ? dust.reducedScale : 1));
    const originX = caster.x + caster.facing * caster.width / 2;
    for (let i = 0; i < count; i += 1) {
      const particle = this.particles.acquire();
      if (!particle) return;
      particle.x = originX + (this.random() * 2 - 1) * dust.spread;
      particle.y = caster.y;
      particle.vx = (this.random() * 2 - 1) * randomRange(this.random, dust.speed);
      particle.vy = -randomRange(this.random, dust.lift);
      particle.life = randomRange(this.random, dust.life);
      particle.maxLife = particle.life;
      particle.size = randomRange(this.random, dust.size);
      particle.color = colors.shockwaveDust;
    }
  }

  spawnDebris(x, y, direction) {
    const recipe = this.config.throwDebris;
    const count = randomInt(this.random, recipe.count);
    const upward = degreesToRadians(recipe.upwardDegrees);
    const baseAngle = direction >= 0 ? -upward : Math.PI + upward;
    const spread = degreesToRadians(recipe.spreadDegrees);
    for (let i = 0; i < count; i += 1) {
      const piece = this.debris.acquire();
      if (!piece) return;
      const angle = baseAngle + (this.random() - 0.5) * spread;
      const speed = randomRange(this.random, recipe.speed);
      piece.x = x;
      piece.y = y;
      piece.vx = Math.cos(angle) * speed;
      piece.vy = Math.sin(angle) * speed;
      piece.life = randomRange(this.random, recipe.life);
      piece.maxLife = piece.life;
      piece.size = randomRange(this.random, recipe.size);
      piece.color = colors.floorEdge;
    }
  }

  spawnPowerRing(type, owner, params) {
    params.color = getTierColor(owner);
    params.particleScale = getPowerTier(owner.flowLevel, powersConfig.tiers).particleScale;
    params.direction = -params.direction;
    this.spawn(type, params);
    this.spawnRing(this.config.recipes[type].ring, params.x, params.y, params.color);
  }

  startTremor(fighter) {
    this.tremors.set(fighter, { time: 0, offset: this.config.hitStopTremor.amplitude * this.shakeScale });
  }

  getTremor(fighter) {
    return (this.tremors.get(fighter)?.offset ?? 0) + this.getSpasm(fighter);
  }

  getSpasm(fighter) {
    const remaining = this.spasms.get(fighter);
    if (!remaining) {
      return 0;
    }
    const { amplitude, interval } = this.config.stormSpasm;
    const direction = Math.floor(remaining / interval) % 2 === 0 ? 1 : -1;
    return direction * amplitude * this.shakeScale;
  }

  getPulseOutline(fighter) {
    if (this.flashScale <= 0) {
      return 0;
    }
    return (this.spasms.get(fighter) ?? 0) / this.config.stormSpasm.duration;
  }

  hasEvadeAfterimage(fighter) {
    return (this.evadeAfterimages.get(fighter) ?? 0) > 0;
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

  spawn(type, { x, y, direction, color, secondaryColor, particleScale = 1 }) {
    const recipe = this.config.recipes[type];

    this.spawnSparks(recipe, x, y, direction, recipe.tinted ? color : null, particleScale);
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

  spawnSparks(recipe, x, y, direction, tint = null, scale = 1) {
    const count = Math.round(randomInt(this.random, recipe.count) * scale);
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
      particle.color = tint && i % 2 === 0 ? tint : pick(this.random, this.config.sparkColors);
    }
  }

  spawnEvadeGlow(fighter) {
    const glow = this.config.evadeGlow;
    const light = this.spawnLight(glow, fighter.x, fighter.y - fighter.height * glow.height, fighter.appearance.saberColor);
    light.peakAlpha = glow.alpha * this.evadeGlowScale;
    light.alpha = light.peakAlpha;
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
    return light;
  }

  spawnRing({ radius, lineWidth, alpha, duration }, x, y, color, contract = false) {
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
    ring.contract = contract;
    ring.radius = contract ? radius : ring.startRadius;
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
    this.debris.update(dt, this.config.particle);
    this.updateLights(dt);
    this.updateFlash(dt);
    this.updateRings(dt);
    this.updateShockwaves(dt);
    this.updateStormStrikes(dt);
    this.updateTimers(this.saberFlares, dt);
    this.updateTimers(this.hitFlashes, dt);
    this.updateTimers(this.evadeAfterimages, dt);
    this.updateTimers(this.spasms, dt);
    this.updateTremors(dt);
    this.updateDesaturation(dt);
    this.updateBladeLock(dt);
    this.updateCounterFlourishes();
  }

  updateShockwaves(dt) {
    const { duration, arcs, arcDelay } = this.config.shockwave;
    const lifetime = duration + arcDelay * (arcs - 1);
    for (const wave of this.shockwaves) {
      if (!wave.active) continue;
      wave.time += dt;
      if (wave.time >= lifetime) wave.active = false;
    }
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
      const eased = 1 - (1 - progress) * (1 - progress);
      ring.radius = ring.contract
        ? ring.maxRadius - (ring.maxRadius - ring.startRadius) * eased
        : ring.startRadius + (ring.maxRadius - ring.startRadius) * eased;
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

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { effectsConfig } from '../src/config/effectsConfig.js';
import { Camera } from '../src/core/Camera.js';
import { EffectType, EffectsSystem } from '../src/systems/EffectsSystem.js';
import { ParticlePool } from '../src/systems/ParticlePool.js';
import { TimeControl } from '../src/systems/TimeControl.js';
import { createRandom, randomInt } from '../src/utils/random.js';
import { STEP, repeat, spawnFighter } from './helpers.js';

function createEffects() {
  const random = createRandom(42);
  const camera = new Camera(effectsConfig, random);
  const timeControl = new TimeControl();
  const effects = new EffectsSystem(effectsConfig, camera, random, timeControl);
  return { camera, effects, timeControl };
}

function createEvent(type, attackType = 'light') {
  const attacker = spawnFighter(500, 1);
  const defender = spawnFighter(560, -1, 'shadow');
  return { type, attacker, defender, attackType, x: 540, y: 500 };
}

function activeLights(effects) {
  return effects.lights.filter((light) => light.active);
}

describe('random', () => {
  it('repeats the same sequence for the same seed', () => {
    const a = createRandom(7);
    const b = createRandom(7);

    assert.deepEqual([a(), a(), a()], [b(), b(), b()]);
  });

  it('stays inside the requested range', () => {
    const random = createRandom(1);

    repeat(200, () => {
      const value = randomInt(random, [6, 10]);
      assert.ok(value >= 6 && value <= 10);
    });
  });
});

describe('ParticlePool', () => {
  it('never gives more particles than its capacity', () => {
    const pool = new ParticlePool(3);

    assert.ok(pool.acquire());
    assert.ok(pool.acquire());
    assert.ok(pool.acquire());
    assert.equal(pool.acquire(), null);
    assert.equal(pool.activeCount, 3);
  });

  it('frees particles when their life ends', () => {
    const pool = new ParticlePool(2);
    const particle = pool.acquire();
    particle.life = 0.05;

    pool.update(0.1, effectsConfig.particle);

    assert.equal(particle.active, false);
    assert.equal(pool.activeCount, 0);
    assert.ok(pool.acquire());
  });
});

describe('Camera', () => {
  it('limits the shake amplitude and duration', () => {
    const camera = new Camera(effectsConfig, createRandom(3));

    camera.shake(100, 10);

    assert.equal(camera.shakeAmplitude, effectsConfig.maxShakeAmplitude);
    assert.equal(camera.shakeDuration, effectsConfig.maxShakeDuration);
  });

  it('moves inside the shake strength and settles at zero', () => {
    const camera = new Camera(effectsConfig, createRandom(3));
    camera.shake(10, 0.2);

    camera.update(STEP);
    assert.ok(Math.abs(camera.offsetX) <= 10 && Math.abs(camera.offsetY) <= 10);

    repeat(30, () => camera.update(STEP));
    assert.equal(camera.offsetX, 0);
    assert.equal(camera.offsetY, 0);
  });

  it('keeps a stronger shake when a weaker one arrives', () => {
    const camera = new Camera(effectsConfig, createRandom(3));
    camera.shake(10, 0.3);

    camera.shake(2, 0.1);

    assert.equal(camera.shakeAmplitude, 10);
  });
});

describe('EffectsSystem', () => {
  it('creates sparks and a light in the attacker color on a hit', () => {
    const { effects, camera } = createEffects();
    const event = createEvent(CombatEvent.HIT);
    const [min, max] = effectsConfig.recipes.hitSpark.count;

    effects.handleEvents([event]);

    assert.ok(effects.particles.activeCount >= min && effects.particles.activeCount <= max);
    assert.equal(activeLights(effects)[0].color, event.attacker.appearance.saberColor);
    assert.equal(camera.shakeAmplitude, 0);
  });

  it('sends the sparks away from the attacker', () => {
    const { effects } = createEffects();

    effects.handleEvents([createEvent(CombatEvent.HIT)]);
    const sparks = effects.particles.particles.filter((particle) => particle.active);

    assert.ok(sparks.every((particle) => particle.vx > 0));
  });

  it('uses the heavy impact for heavy hits, with shake and flash', () => {
    const { effects, camera } = createEffects();

    effects.handleEvents([createEvent(CombatEvent.HIT, 'heavy')]);

    assert.equal(camera.shakeAmplitude, effectsConfig.recipes[EffectType.HEAVY_IMPACT].shake.amplitude);
    assert.ok(effects.flash.alpha > 0);
  });

  it('marks a parry with a ring and a brighter blade in the defender color', () => {
    const { effects, timeControl } = createEffects();
    const event = createEvent(CombatEvent.PARRY);

    effects.handleEvents([event]);

    const ring = effects.rings.find((candidate) => candidate.active);
    assert.equal(ring.color, event.defender.appearance.saberColor);
    assert.equal(activeLights(effects)[0].color, event.defender.appearance.saberColor);
    assert.equal(effects.getSaberFlare(event.defender), 1);
    assert.equal(effects.getSaberFlare(event.attacker), 0);
    assert.equal(effects.desaturation.amount, 0);
    assert.equal(timeControl.hitStopTime, effectsConfig.recipes[EffectType.PARRY_SPARK].hitStop);

    repeat(Math.ceil(effectsConfig.saberFlare.duration / STEP) + 1, () => effects.update(STEP));
    assert.equal(effects.getSaberFlare(event.defender), 0);

    repeat(Math.ceil(effectsConfig.recipes[EffectType.PARRY_SPARK].ring.duration / STEP), () => effects.update(STEP));
    assert.equal(effects.rings.some((candidate) => candidate.active), false);
  });

  it('desaturates the world and slows time on a perfect parry, then recovers', () => {
    const { effects, timeControl } = createEffects();

    effects.handleEvents([createEvent(CombatEvent.PERFECT_PARRY)]);

    assert.equal(effects.desaturation.amount, 1);
    assert.ok(effects.desaturation.duration <= effectsConfig.maxDesaturationDuration);
    assert.ok(timeControl.slowMotionTime > 0);

    repeat(Math.ceil(effectsConfig.maxDesaturationDuration / STEP) + 1, () => effects.update(STEP));
    assert.equal(effects.desaturation.amount, 0);
  });

  it('lights both saber colors on a clash', () => {
    const { effects } = createEffects();
    const event = createEvent(CombatEvent.CLASH);

    effects.handleEvents([event]);

    assert.deepEqual(
      activeLights(effects).map((light) => light.color),
      [event.attacker.appearance.saberColor, event.defender.appearance.saberColor],
    );
  });

  it('uses the strongest shake and flash for the final blow, inside the limits', () => {
    const { effects, camera } = createEffects();

    effects.handleEvents([createEvent(CombatEvent.HIT), createEvent(CombatEvent.DEATH)]);

    assert.equal(camera.shakeAmplitude, effectsConfig.maxShakeAmplitude);
    assert.equal(effects.flash.alpha, effectsConfig.maxFlashAlpha);
  });

  it('fades lights, flash and particles over time', () => {
    const { effects } = createEffects();
    effects.handleEvents([createEvent(CombatEvent.CLASH)]);

    repeat(60, () => effects.update(STEP));

    assert.equal(effects.particles.activeCount, 0);
    assert.equal(activeLights(effects).length, 0);
    assert.equal(effects.flash.alpha, 0);
  });

  it('asks for a hit stop on impacts and slow motion on the final blow', () => {
    const { effects, timeControl } = createEffects();

    effects.handleEvents([createEvent(CombatEvent.HIT, 'heavy')]);
    assert.equal(timeControl.hitStopTime, effectsConfig.recipes.heavyImpact.hitStop);

    effects.handleEvents([createEvent(CombatEvent.DEATH)]);
    assert.equal(timeControl.slowMotionScale, effectsConfig.recipes.finalBlow.slowMotion.scale);
  });

  it('reduces the shake and turns the flash off with reduced effects', () => {
    const { effects, camera } = createEffects();
    effects.setReduced(true);

    effects.handleEvents([createEvent(CombatEvent.DEATH)]);

    assert.equal(camera.shakeAmplitude, effectsConfig.recipes.finalBlow.shake.amplitude * effectsConfig.reduced.shakeScale);
    assert.equal(effects.flash.alpha, 0);
  });

  it('never goes over the particle limit', () => {
    const { effects } = createEffects();

    repeat(30, () => effects.handleEvents([createEvent(CombatEvent.CLASH)]));

    assert.equal(effects.particles.activeCount, effectsConfig.maxParticles);
  });
});

describe('impact feedback', () => {
  it('flashes only the hit fighter and expires in real time', () => {
    const { effects } = createEffects();
    const event = createEvent(CombatEvent.HIT);
    effects.handleEvents([event]);
    assert.equal(effects.hasHitFlash(event.defender), true);
    assert.equal(effects.hasHitFlash(event.attacker), false);
    effects.update(effectsConfig.hitFlashDuration);
    assert.equal(effects.hasHitFlash(event.defender), false);
  });

  it('trembles the hit fighter during hit stop without moving its body', () => {
    const { effects, timeControl } = createEffects();
    const event = createEvent(CombatEvent.HIT);
    const x = event.defender.x;
    effects.handleEvents([event]);
    const firstOffset = effects.getTremor(event.defender);
    effects.update(STEP);
    assert.equal(effects.getTremor(event.defender), -firstOffset);
    assert.equal(effects.getTremor(event.attacker), 0);
    assert.equal(event.defender.x, x);
    timeControl.scale(1);
    effects.update(STEP);
    assert.equal(effects.getTremor(event.defender), 0);
  });

  it('trembles the attacker whose attack was parried', () => {
    const { effects } = createEffects();
    const event = createEvent(CombatEvent.PERFECT_PARRY);
    effects.handleEvents([event]);
    assert.notEqual(effects.getTremor(event.attacker), 0);
    assert.equal(effects.getTremor(event.defender), 0);
  });

  it('focuses the punch on contact, limits it and returns to normal', () => {
    const { effects, camera } = createEffects();
    const event = createEvent(CombatEvent.HIT, 'heavy');
    effects.handleEvents([event]);
    assert.equal(camera.zoom, 1.03);
    assert.equal(camera.focusX, event.x);
    assert.equal(camera.focusY, event.y);
    effects.handleEvents([createEvent(CombatEvent.DEATH)]);
    assert.equal(camera.zoom, 1.06);
    camera.punch(0.01, 0.1, 10, 10);
    assert.equal(camera.focusX, event.x);
    camera.punch(10, 10, event.x, event.y);
    assert.equal(camera.zoom, 1 + effectsConfig.maxPunchZoom);
    assert.equal(camera.punchDuration, effectsConfig.maxPunchDuration);
    camera.update(STEP);
    assert.ok(camera.zoom < 1.06 && camera.zoom > 1);
    camera.update(1);
    assert.equal(camera.zoom, 1);
  });

  it('disables hit flash and reduces punch and tremor', () => {
    const { effects, camera, timeControl } = createEffects();
    effects.setReduced(true);
    const event = createEvent(CombatEvent.HIT, 'heavy');
    effects.handleEvents([event]);
    assert.equal(effects.hasHitFlash(event.defender), false);
    assert.equal(camera.zoom, 1 + 0.03 * effectsConfig.reduced.punchScale);
    assert.equal(effects.getTremor(event.defender), effectsConfig.hitStopTremor.amplitude * effectsConfig.reduced.shakeScale);
    assert.ok(timeControl.isFrozen);
  });
});

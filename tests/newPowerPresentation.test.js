import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DuelAudio } from '../src/audio/DuelAudio.js';
import { SoundName } from '../src/audio/soundNames.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { effectsConfig } from '../src/config/effectsConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { Camera } from '../src/core/Camera.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { PowerRenderer } from '../src/rendering/PowerRenderer.js';
import { EffectsSystem } from '../src/systems/EffectsSystem.js';
import { TimeControl } from '../src/systems/TimeControl.js';
import { createRandom } from '../src/utils/random.js';
import { spawnFighter } from './helpers.js';

function createEffects(reduced = false) {
  const random = createRandom(9);
  const effects = new EffectsSystem(effectsConfig, new Camera(effectsConfig, random), random, new TimeControl());
  effects.setReduced(reduced);
  return effects;
}

function recordingRenderer() {
  const calls = [];
  const record = (name) => (...args) => calls.push({ name, args });
  const names = ['save', 'restore', 'setBlendMode', 'setAlpha', 'drawGlow', 'polyline', 'strokeEllipse', 'fillPolygon', 'line', 'translate', 'scale', 'rotate', 'fillCircle', 'fillEllipse', 'fillRect', 'strokeCircle'];
  return { calls, ...Object.fromEntries(names.map((name) => [name, record(name)])) };
}

function channel(fighter, id, stateTime) {
  const power = powersConfig.powers[id];
  fighter.combat.power = power;
  fighter.combat.powerEndTime = 0;
  fighter.state = power.channel ? FighterState.CHANNELING : FighterState.CASTING;
  fighter.stateTime = stateTime;
  return power;
}

function event(type, attacker, defender, attackType) {
  return { type, attacker, defender, attackType, x: defender?.x ?? attacker.x, y: 480 };
}

function playedSounds(events) {
  const played = [];
  const audio = { play: (name) => played.push(name), duckMusic: () => {} };
  const duelAudio = new DuelAudio(audio, { arenaWidth: 1280, stereoWidth: 0.6, hum: {}, tension: { step: 0.1 }, heartbeat: { interval: 1 } });
  duelAudio.handleEvents(events);
  return played;
}

describe('absorb presentation', () => {
  it('closes a ring on the hand and pulls particles in, in the defender tier color', () => {
    const effects = createEffects();
    const caster = spawnFighter(400, 1, 'shadow');
    const defender = spawnFighter(700, -1, 'bastion');
    defender.combat.absorbTime = 0.2;
    effects.handleEvents([event(CombatEvent.POWER_ABSORBED, caster, defender, 'lightning')]);
    const ring = effects.rings.find((candidate) => candidate.active);
    assert.equal(ring.contract, true);
    assert.equal(ring.radius, powersConfig.render.absorb.ringRadius);
    const handX = defender.x + defender.facing * (defender.width / 2 + powersConfig.render.handOffset);
    assert.equal(ring.x, handX);
    const particles = effects.particles.particles.filter((particle) => particle.active);
    assert.ok(particles.length >= powersConfig.render.absorb.particles * 0.6);
    for (const particle of particles) {
      const before = Math.hypot(particle.x - ring.x, particle.y - ring.y);
      const after = Math.hypot(particle.x + particle.vx * 0.05 - ring.x, particle.y + particle.vy * 0.05 - ring.y);
      assert.ok(after < before);
    }
  });

  it('keeps the barrier absorption ring for a raised barrier', () => {
    const effects = createEffects();
    const caster = spawnFighter(400, 1, 'shadow');
    const defender = spawnFighter(700, -1, 'guardian');
    effects.handleEvents([event(CombatEvent.POWER_ABSORBED, caster, defender, 'push')]);
    assert.equal(effects.rings.find((candidate) => candidate.active).contract, false);
  });

  it('plays the absorb sound only for the absorb window', () => {
    const caster = spawnFighter(400, 1, 'shadow');
    const defender = spawnFighter(700, -1, 'bastion');
    defender.combat.absorbTime = 0.2;
    assert.deepEqual(playedSounds([event(CombatEvent.POWER_ABSORBED, caster, defender, 'push')]), [SoundName.ABSORB]);
    defender.combat.absorbTime = 0;
    assert.deepEqual(playedSounds([event(CombatEvent.POWER_ABSORBED, caster, defender, 'push')]), [SoundName.POWER_ABSORBED]);
  });
});

describe('drain presentation', () => {
  it('flows motes from the target to the caster hand and thins near the range limit', () => {
    const caster = spawnFighter(400, 1, 'sovereign');
    const power = channel(caster, 'drain', 0.6);
    const near = recordingRenderer();
    caster.combat.powerTargetX = caster.x + 150;
    caster.combat.powerTargetY = caster.y - 90;
    new PowerRenderer().draw(near, [caster]);
    const motes = near.calls.filter((call) => call.name === 'drawGlow');
    assert.equal(motes.length, powersConfig.render.drain.motes + 1);
    for (const call of motes.slice(0, -1)) {
      assert.ok(call.args[0] >= caster.x && call.args[0] <= caster.combat.powerTargetX + 10);
    }
    const far = recordingRenderer();
    caster.combat.powerTargetX = caster.x + caster.width / 2 + power.range;
    new PowerRenderer().draw(far, [caster]);
    const alpha = (calls) => calls.find((call) => call.name === 'drawGlow').args[4];
    assert.ok(alpha(far.calls) < alpha(near.calls));
  });

  it('draws no hit flash or impact per drain pulse and keeps the pulses silent', () => {
    const effects = createEffects();
    const caster = spawnFighter(400, 1, 'sovereign');
    const target = spawnFighter(650, -1, 'guardian');
    effects.handleEvents([event(CombatEvent.POWER_HIT, caster, target, 'drain')]);
    assert.equal(effects.hasHitFlash(target), false);
    assert.equal(effects.particles.particles.filter((particle) => particle.active).length, 0);
    assert.deepEqual(playedSounds([event(CombatEvent.POWER_HIT, caster, target, 'drain'), event(CombatEvent.POWER_START, caster, null, 'drain')]), [SoundName.DRAIN]);
  });
});

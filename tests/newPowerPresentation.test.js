import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DuelAudio } from '../src/audio/DuelAudio.js';
import { SoundName } from '../src/audio/soundNames.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { effectsConfig } from '../src/config/effectsConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { Camera } from '../src/core/Camera.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { computePose, createPose } from '../src/rendering/fighterPose.js';
import { PowerRenderer, getStormDarkness } from '../src/rendering/PowerRenderer.js';
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

describe('mind twist presentation', () => {
  it('ripples warped rings over the head in the caster tier color while confused', () => {
    const fighter = spawnFighter(500, 1, 'guardian');
    fighter.combat.confuseTime = 0.6;
    fighter.combat.statusLevel = 8;
    const renderer = recordingRenderer();
    new PowerRenderer().draw(renderer, [fighter]);
    const rings = renderer.calls.filter((call) => call.name === 'strokeEllipse');
    assert.equal(rings.length, powersConfig.render.status.confuseRings);
    for (const call of rings) {
      assert.equal(call.args[4], powersConfig.tiers[2].color);
      assert.ok(Math.abs(call.args[1] - (fighter.y - fighter.height * powersConfig.render.status.confuseHeight)) < 1e-9);
      assert.notEqual(call.args[2], call.args[3]);
    }
    fighter.combat.confuseTime = 0;
    const idle = recordingRenderer();
    new PowerRenderer().draw(idle, [fighter]);
    assert.equal(idle.calls.filter((call) => call.name === 'strokeEllipse').length, 0);
  });

  it('marks the hit with a ring at the head, no hit flash, and its own sound', () => {
    const effects = createEffects();
    const caster = spawnFighter(400, 1, 'mirror');
    const target = spawnFighter(650, -1, 'shadow');
    effects.handleEvents([event(CombatEvent.POWER_HIT, caster, target, 'mindTwist')]);
    const ring = effects.rings.find((candidate) => candidate.active);
    assert.equal(ring.x, target.x);
    assert.equal(effects.hasHitFlash(target), false);
    assert.deepEqual(playedSounds([event(CombatEvent.POWER_HIT, caster, target, 'mindTwist')]), [SoundName.MIND_TWIST]);
  });
});

describe('storm presentation', () => {
  const storm = powersConfig.powers.storm;
  const phases = storm.stormPhases;

  function caster(stateTime, level = 8) {
    const fighter = spawnFighter(400, 1, 'sovereign');
    fighter.stats.flowLevel = level;
    channel(fighter, 'storm', stateTime);
    return fighter;
  }

  it('darkens the arena during the invocation, holds it in the storm and fades in the recovery', () => {
    const dark = powersConfig.render.storm.darkAlpha;
    assert.equal(getStormDarkness([caster(0)]), 0);
    assert.ok(Math.abs(getStormDarkness([caster(phases.invocation / 2)]) - dark / 2) < 1e-9);
    assert.equal(getStormDarkness([caster(phases.invocation + 1)]), dark);
    const ending = caster(phases.invocation + phases.storm + phases.recovery / 2);
    ending.combat.powerEndTime = phases.invocation + phases.storm;
    assert.ok(Math.abs(getStormDarkness([ending]) - dark / 2) < 1e-9);
    assert.equal(getStormDarkness([spawnFighter(400)]), 0);
  });

  it('raises the free hand and calls a bolt to the sky during the invocation', () => {
    const fighter = caster(phases.invocation * 0.9);
    const pose = computePose(fighter, createPose());
    assert.equal(pose.offHand > 0.9, true);
    assert.ok(pose.freeHandY < pose.headY);
    const renderer = recordingRenderer();
    new PowerRenderer().draw(renderer, [fighter], new Map([[fighter, pose]]), fighter.y);
    const call = renderer.calls.find((entry) => entry.name === 'polyline' && entry.args[0].length === (powersConfig.render.storm.callSegments + 1) * 2);
    const points = call.args[0];
    assert.ok(points[1] > points.at(-1));
    assert.ok(points.at(-1) < powersConfig.render.storm.skyY / 2);
  });

  it('wraps the caster in shield arcs during the storm and draws the pending marks on the floor', () => {
    const fighter = caster(phases.invocation + 1);
    fighter.combat.stormMarks = [
      { active: true, marked: true, x: 700, markTime: phases.invocation + 0.8, impactTime: phases.invocation + 1.3 },
      { active: false, marked: false, x: 0, markTime: phases.invocation + 2, impactTime: phases.invocation + 2.5 },
    ];
    const renderer = recordingRenderer();
    new PowerRenderer().draw(renderer, [fighter], null, 600);
    const arcs = renderer.calls.filter((entry) => entry.name === 'polyline' && entry.args[0].length === (powersConfig.render.storm.arcSegments + 1) * 2);
    assert.equal(arcs.length, powersConfig.render.storm.shieldArcs * 2);
    const marks = renderer.calls.filter((entry) => entry.name === 'strokeEllipse');
    assert.equal(marks.length, 1);
    assert.equal(marks[0].args[0], 700);
    assert.equal(marks[0].args[1], 600);
    assert.ok(marks[0].args[2] < storm.strikeWidth * powersConfig.render.storm.markWidthScale[0]);
  });

  it('flashes the call and drops each strike from the sky to the floor', () => {
    const effects = createEffects();
    const fighter = caster(phases.invocation);
    const target = spawnFighter(700, -1, 'guardian');
    effects.handleEvents([{ type: CombatEvent.POWER_ACTIVE, attacker: fighter, defender: null, attackType: 'storm', x: 400, y: 500 }]);
    assert.ok(effects.flash.alpha > 0);
    assert.equal(effects.rings.some((ring) => ring.active), false);
    effects.handleEvents([{ type: CombatEvent.STORM_STRIKE, attacker: fighter, defender: target, attackType: 'storm', x: 700, y: 600, hit: true }]);
    const strike = effects.stormStrikes.find((candidate) => candidate.active);
    assert.equal(strike.points[1], effectsConfig.stormStrike.skyY);
    assert.equal(strike.points.at(-1), 600);
    assert.ok(effects.particles.particles.some((particle) => particle.active));
    effects.update(effectsConfig.stormStrike.duration + 0.01);
    assert.equal(strike.active, false);
    const reduced = createEffects(true);
    reduced.handleEvents([{ type: CombatEvent.STORM_STRIKE, attacker: fighter, defender: target, attackType: 'storm', x: 700, y: 600, hit: false }]);
    assert.equal(reduced.flash.alpha, 0);
  });

  it('leaves the strike visuals to the strike event and only shakes the hit target', () => {
    const effects = createEffects();
    const fighter = caster(phases.invocation + 1);
    const target = spawnFighter(700, -1, 'guardian');
    effects.handleEvents([event(CombatEvent.POWER_HIT, fighter, target, 'storm')]);
    assert.equal(effects.particles.particles.filter((particle) => particle.active).length, 0);
    assert.ok(effects.getTremor(target) !== 0);
  });

  it('plays invocation, call, mark and strike sounds', () => {
    const fighter = caster(0);
    const target = spawnFighter(700, -1, 'guardian');
    assert.deepEqual(playedSounds([
      event(CombatEvent.POWER_START, fighter, null, 'storm'),
      event(CombatEvent.POWER_ACTIVE, fighter, null, 'storm'),
      event(CombatEvent.STORM_MARK, fighter, target, 'storm'),
      event(CombatEvent.STORM_STRIKE, fighter, target, 'storm'),
      event(CombatEvent.POWER_HIT, fighter, target, 'storm'),
    ]), [SoundName.STORM_INVOKE, SoundName.STORM_CALL, SoundName.STORM_MARK, SoundName.STORM_STRIKE]);
  });
});

describe('storm invocation bolts', () => {
  it('calls one bolt in the base tier, two in the deep tier and three at the apex, fanning to the sky', () => {
    const counts = [];
    for (const [level, tierIndex] of [[6, 1], [9, 2], [10, 3]]) {
      const fighter = spawnFighter(400, 1, 'sovereign');
      fighter.stats.flowLevel = level;
      channel(fighter, 'storm', powersConfig.powers.storm.stormPhases.invocation * 0.95);
      const pose = computePose(fighter, createPose());
      const renderer = recordingRenderer();
      new PowerRenderer().draw(renderer, [fighter], new Map([[fighter, pose]]), fighter.y);
      const calls = renderer.calls.filter((entry) => entry.name === 'polyline' && entry.args[0].length === (powersConfig.render.storm.callSegments + 1) * 2);
      const ends = new Set(calls.map((entry) => Math.round(entry.args[0].at(-2))));
      counts.push(ends.size);
      const tier = powersConfig.tiers[tierIndex];
      assert.ok(calls.some((entry) => entry.args[2] === tier.boltWidth * powersConfig.render.storm.callWidthScale));
    }
    assert.deepEqual(counts, [1, 2, 3]);
  });
});

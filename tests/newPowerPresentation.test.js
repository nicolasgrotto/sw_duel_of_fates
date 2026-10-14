import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DuelAudio } from '../src/audio/DuelAudio.js';
import { SoundName } from '../src/audio/soundNames.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { effectsConfig } from '../src/config/effectsConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { projectilesConfig } from '../src/config/projectilesConfig.js';
import { colors } from '../src/config/themeConfig.js';
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
  const record = (name) => (...args) => calls.push({ name, args: args.map((value) => (value instanceof Float32Array ? Array.from(value) : value)) });
  const names = ['save', 'restore', 'setBlendMode', 'setAlpha', 'drawGlow', 'polyline', 'strokePolygon', 'strokeEllipse', 'fillPolygon', 'line', 'translate', 'scale', 'rotate', 'fillCircle', 'fillEllipse', 'fillRect', 'strokeCircle'];
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

describe('focus and wrath auras', () => {
  function auraCalls(setup) {
    const fighter = spawnFighter(500, 1, 'guardian');
    fighter.combat.statusLevel = 8;
    setup(fighter);
    const pose = computePose(fighter, createPose());
    const behind = recordingRenderer();
    const view = new PowerRenderer();
    view.drawAura(behind, fighter, pose, fighter.y);
    const front = recordingRenderer();
    view.draw(front, [fighter]);
    return { behind: behind.calls, front: front.calls };
  }

  it('outlines a focused fighter steadily and orbits two motes around the chest', () => {
    const { behind, front } = auraCalls((fighter) => { fighter.combat.focusTime = 2; });
    const torsos = behind.filter((call) => call.name === 'fillPolygon' && call.args[1] === powersConfig.tiers[2].color);
    assert.ok(torsos.length >= 4);
    const { offset } = powersConfig.render.status.focusOutline;
    const shifts = behind.filter((call) => call.name === 'translate').map((call) => `${call.args[0]},${call.args[1]}`);
    for (const expected of [`${offset},0`, `${-offset},0`, `0,${-offset}`, `0,${offset}`]) assert.ok(shifts.includes(expected), expected);
    assert.equal(front.filter((call) => call.name === 'drawGlow').length, 1 + powersConfig.render.status.focusMotes.count);
  });

  it('flickers a wider outline around a wrathful fighter and raises embers', () => {
    const { behind, front } = auraCalls((fighter) => { fighter.combat.wrathTime = 3; });
    assert.ok(behind.some((call) => call.name === 'fillPolygon' && call.args[1] === powersConfig.tiers[2].color));
    const embers = front.filter((call) => call.name === 'line');
    assert.equal(embers.length, powersConfig.render.status.wrathEmbers.count);
    assert.ok(embers.every((call) => call.args[3] > call.args[1]));
  });

  it('draws no aura without focus or wrath', () => {
    const { behind } = auraCalls(() => {});
    assert.equal(behind.length, 0);
  });
});

describe('choke caster and wrath armor', () => {
  it('reaches the free hand forward and trembles while choking', () => {
    const fighter = spawnFighter(400, 1, 'shadow');
    channel(fighter, 'choke', 0.6);
    const pose = computePose(fighter, createPose());
    assert.equal(pose.offHand, 1);
    assert.ok(pose.freeHandX > pose.shoulderX + fighter.height * 0.2);
  });

  it('rings and lights the wrathful fighter in the tier color when armor absorbs a blade', () => {
    const effects = createEffects();
    const attacker = spawnFighter(400, 1, 'guardian');
    const defender = spawnFighter(560, -1, 'shadow');
    defender.combat.statusLevel = 10;
    effects.handleEvents([event(CombatEvent.WRATH_ARMOR, attacker, defender, 'heavy')]);
    const ring = effects.rings.find((candidate) => candidate.active);
    assert.equal(ring.color, powersConfig.tiers[3].color);
    assert.equal(ring.x, defender.x);
    assert.deepEqual(playedSounds([event(CombatEvent.WRATH_ARMOR, attacker, defender, 'heavy')]), [SoundName.WRATH_ARMOR]);
  });
});

describe('supreme push and sanctuary presentation', () => {
  it('sends chevrons both ways with a full ring in attack mode and a short burst in escape mode', () => {
    const effects = createEffects();
    const caster = spawnFighter(500, 1, 'mirror');
    caster.combat.powerMode = 'attack';
    effects.handleEvents([event(CombatEvent.POWER_ACTIVE, caster, null, 'supremePush')]);
    const waves = effects.shockwaves.filter((wave) => wave.active);
    assert.deepEqual(waves.map((wave) => wave.direction).sort(), [-1, 1]);
    assert.ok(waves.every((wave) => wave.range === powersConfig.powers.supremePush.range));
    assert.ok(effects.rings.some((ring) => ring.active && ring.maxRadius === effectsConfig.supremePush.ring.radius));
    const escape = createEffects();
    caster.combat.powerMode = 'escape';
    escape.handleEvents([event(CombatEvent.POWER_ACTIVE, caster, null, 'supremePush')]);
    assert.equal(escape.shockwaves.filter((wave) => wave.active).length, 0);
    assert.ok(escape.rings.some((ring) => ring.active && ring.maxRadius === effectsConfig.supremePush.escapeRing.radius));
  });

  it('draws the sanctuary dome and cracks it as the shield wears down', () => {
    const counts = [];
    for (const fraction of [1, 0.5, 0.2]) {
      const fighter = spawnFighter(500, 1, 'guardian');
      fighter.combat.sanctuaryTime = 3;
      fighter.combat.sanctuaryShield = powersConfig.powers.sanctuary.shield * fighter.stats.power.potency * fraction;
      fighter.combat.statusLevel = 5;
      const renderer = recordingRenderer();
      new PowerRenderer().draw(renderer, [fighter]);
      assert.equal(renderer.calls.filter((call) => call.name === 'strokeEllipse').length, 1);
      counts.push(renderer.calls.filter((call) => call.name === 'line').length);
    }
    const cracks = powersConfig.render.status.sanctuaryCracks.length;
    assert.deepEqual(counts, [0, cracks, cracks * 2]);
  });

  it('shatters the sanctuary on break and marks protected hits', () => {
    const effects = createEffects();
    const attacker = spawnFighter(400, 1, 'shadow');
    const defender = spawnFighter(520, -1, 'guardian');
    effects.handleEvents([event(CombatEvent.SANCTUARY_BREAK, attacker, defender, 'heavy')]);
    assert.ok(effects.particles.particles.filter((particle) => particle.active).length >= effectsConfig.recipes.sanctuaryShatter.count[0]);
    assert.deepEqual(playedSounds([event(CombatEvent.SANCTUARY_BREAK, attacker, defender, 'heavy')]), [SoundName.SANCTUARY_BREAK]);
    const guarded = createEffects();
    defender.combat.sanctuaryShield = 10;
    guarded.handleEvents([event(CombatEvent.HIT, attacker, defender, 'light')]);
    assert.ok(guarded.rings.some((ring) => ring.active && ring.maxRadius === effectsConfig.sanctuaryHitRing.radius));
  });

});

describe('mass telekinesis presentation', () => {
  it('lifts and widens the camera in a short cinematic that eases in and out', () => {
    const camera = new Camera(effectsConfig, createRandom(1));
    camera.cinematic(70, 0.95, 1.2);
    assert.equal(camera.cinematicAmount, 0);
    camera.update(0.6);
    assert.equal(camera.cinematicAmount, 1);
    camera.update(0.55);
    assert.ok(camera.cinematicAmount > 0 && camera.cinematicAmount < 1);
    camera.update(0.1);
    assert.equal(camera.cinematicAmount, 0);
  });

  it('starts the cinematic on the call, pulls a single asteroid down and breaks it near the end', () => {
    const effects = createEffects();
    const caster = spawnFighter(400, 1, 'guardian');
    effects.handleEvents([event(CombatEvent.POWER_START, caster, null, 'meteorRain')]);
    assert.ok(effects.camera.cinematicDuration > powersConfig.powers.meteorRain.startup);
    const early = recordingRenderer();
    channel(caster, 'meteorRain', 0.1);
    new PowerRenderer().draw(early, [caster]);
    const late = recordingRenderer();
    caster.stateTime = powersConfig.powers.meteorRain.startup * 0.95;
    new PowerRenderer().draw(late, [caster]);
    const stones = (calls) => calls.filter((call) => call.name === 'fillPolygon').length;
    assert.equal(stones(early.calls), 1);
    assert.equal(stones(late.calls), 4);
  });

  it('drops a stone over each pending mark and bursts it on impact', () => {
    const caster = spawnFighter(400, 1, 'guardian');
    const power = powersConfig.powers.meteorRain;
    caster.combat.rain = { power, time: 1.2, marks: [
      { active: true, marked: true, x: 700, markTime: 1, impactTime: 1.6 },
      { active: false, marked: false, x: 0, markTime: 2, impactTime: 2.6 },
    ] };
    const renderer = recordingRenderer();
    new PowerRenderer().draw(renderer, [caster], null, 600);
    assert.equal(renderer.calls.filter((call) => call.name === 'strokeEllipse').length, 1);
    const stone = renderer.calls.find((call) => call.name === 'fillPolygon').args[0];
    const stoneY = stone.filter((_, index) => index % 2 === 1);
    assert.ok(Math.max(...stoneY) < 600);
    const effects = createEffects();
    effects.handleEvents([{ type: CombatEvent.RAIN_STRIKE, attacker: caster, defender: null, attackType: 'meteorRain', x: 700, y: 600, hit: false }]);
    assert.ok(effects.debris.particles.some((piece) => piece.active));
    assert.ok(effects.particles.particles.some((particle) => particle.active));
    assert.deepEqual(playedSounds([
      event(CombatEvent.POWER_START, caster, null, 'meteorRain'),
      event(CombatEvent.RAIN_CALL, caster, null, 'meteorRain'),
      event(CombatEvent.RAIN_MARK, caster, null, 'meteorRain'),
      event(CombatEvent.RAIN_STRIKE, caster, null, 'meteorRain'),
      event(CombatEvent.POWER_ACTIVE, caster, null, 'meteorRain'),
    ]), [SoundName.METEOR_CALL, SoundName.METEOR_BREAK, SoundName.METEOR_FALL, SoundName.METEOR_IMPACT]);
  });
});

describe('fracture presentation', () => {
  it('draws only the cracked segments that have not burst, brighter as the burst nears', () => {
    const caster = spawnFighter(300, 1, 'shadow');
    caster.combat.fracture = { power: powersConfig.powers.fracture, direction: 1, time: 0.3, target: 1, hit: false, segments: [
      { left: 330, right: 390, marked: true, burst: true, markTime: 0, impactTime: 0.25 },
      { left: 390, right: 450, marked: true, burst: false, markTime: 0.07, impactTime: 0.32 },
      { left: 450, right: 510, marked: true, burst: false, markTime: 0.13, impactTime: 0.38 },
      { left: 510, right: 570, marked: false, burst: false, markTime: 0.4, impactTime: 0.65 },
    ] };
    const renderer = recordingRenderer();
    new PowerRenderer().draw(renderer, [caster], null, 600);
    const cracks = renderer.calls.filter((call) => call.name === 'polyline');
    assert.equal(cracks.length, 6);
    const alphas = renderer.calls.filter((call) => call.name === 'setAlpha').map((call) => call.args[0]);
    assert.ok(alphas[1] > alphas[3]);
  });

  it('slams the floor with dust, pops each segment and sounds the run and the hit', () => {
    const effects = createEffects();
    const caster = spawnFighter(300, 1, 'shadow');
    const target = spawnFighter(700, -1, 'guardian');
    effects.handleEvents([event(CombatEvent.POWER_ACTIVE, caster, null, 'fracture')]);
    assert.ok(effects.particles.particles.some((particle) => particle.active && particle.color === colors.shockwaveDust));
    effects.handleEvents([{ type: CombatEvent.FRACTURE_BURST, attacker: caster, defender: target, attackType: 'fracture', x: 420, y: 600, hit: false }]);
    assert.ok(effects.debris.particles.some((piece) => piece.active));
    assert.deepEqual(playedSounds([
      event(CombatEvent.POWER_ACTIVE, caster, null, 'fracture'),
      { type: CombatEvent.FRACTURE_CRACK, attacker: caster, defender: target, attackType: 'fracture', x: 420, y: 600 },
      { type: CombatEvent.FRACTURE_BURST, attacker: caster, defender: target, attackType: 'fracture', x: 420, y: 600, hit: false },
      event(CombatEvent.POWER_HIT, caster, target, 'fracture'),
    ]), [SoundName.FRACTURE_RUN, SoundName.FRACTURE_HIT]);
  });

  it('crouches the caster with the free hand to the floor while striking the ground', () => {
    const fighter = spawnFighter(400, 1, 'shadow');
    channel(fighter, 'fracture', powersConfig.powers.fracture.startup);
    const pose = computePose(fighter, createPose());
    const idle = computePose(spawnFighter(400, 1, 'shadow'), createPose());
    assert.ok(pose.hipY > idle.hipY + 15);
    assert.ok(pose.freeHandY > pose.shoulderY + fighter.height * 0.25);
  });
});

describe('power names', () => {
  it('names every power of the catalog in both languages and keeps power ids out of the arena names', async () => {
    const { ptBR } = await import('../src/config/locales/ptBR.js');
    const { en } = await import('../src/config/locales/en.js');
    const { arenas } = await import('../src/arenas/arenaData.js');
    for (const locale of [ptBR, en]) {
      for (const id of Object.keys(powersConfig.powers)) {
        assert.equal(typeof locale.ui.powers[id], 'string', `${locale.id}/${id}`);
        if (!arenas[id]) assert.equal(locale.ui.arenas[id], undefined, `${locale.id}/${id}`);
      }
    }
  });
});

describe('sanctuary and barrier shapes', () => {
  it('keeps the sanctuary dome tighter than the smallest barrier', () => {
    const render = powersConfig.render;
    const smallest = Math.min(...powersConfig.tiers.map((tier) => tier.barrierScale));
    assert.ok(render.status.sanctuaryRadiusX < render.barrierRadiusX * smallest);
    assert.ok(render.status.sanctuaryRadiusY < render.barrierRadiusY * smallest);
  });
});

describe('stage 2.19 presentation', () => {
  it('draws every storm fracture wave with the fracture cracks', () => {
    const caster = spawnFighter(300, 1, 'sovereign');
    const segment = (left) => ({ left, right: left + 60, marked: true, burst: false, markTime: 0, impactTime: 0.2 });
    caster.combat.fractures = [
      { power: powersConfig.powers.storm.fractureByLevel, direction: 1, time: 0.1, target: 1, hit: false, group: 0, segments: [segment(500)] },
      { power: powersConfig.powers.storm.fractureByLevel, direction: -1, time: 0.1, target: 1, hit: false, group: 0, segments: [segment(440)] },
    ];
    const renderer = recordingRenderer();
    new PowerRenderer().draw(renderer, [caster], null, 600);
    assert.equal(renderer.calls.filter((call) => call.name === 'polyline').length, 6);
  });

  it('orbits the arsenal blades around the body, pointing out and longer in front than behind', () => {
    const caster = spawnFighter(400, 1, 'shadow');
    const power = powersConfig.powers.arsenal;
    caster.combat.arsenal = { power, angle: 0, time: power.orbit.period / 4, launchCooldown: 0, objects: [{ id: 0, offset: 0 }, { id: 1, offset: Math.PI }] };
    caster.stats.flowLevel = 10;
    const renderer = recordingRenderer();
    new PowerRenderer().draw(renderer, [caster]);
    const blades = renderer.calls.filter((call) => call.name === 'line' && call.args[5] === projectilesConfig.render.energyBlade.width && call.args[4] === powersConfig.tiers[3].color);
    assert.equal(blades.length, 2);
    const length = (call) => Math.hypot(call.args[2] - call.args[0], call.args[3] - call.args[1]);
    const [front, back] = blades[0].args[1] > blades[1].args[1] ? blades : [blades[1], blades[0]];
    assert.ok(length(front) > length(back));
  });


  it('draws the cleave wave as a crescent in the saber color of its current owner', async () => {
    const { ProjectileRenderer } = await import('../src/rendering/ProjectileRenderer.js');
    const { ProjectileKind } = await import('../src/config/projectilesConfig.js');
    const caster = spawnFighter(400, 1, 'guardian');
    const reflector = spawnFighter(700, -1, 'shadow');
    const projectile = { active: true, kind: ProjectileKind.WAVE, owner: 1, source: 'flowCleave', x: 600, y: 500, vx: -1000, radius: 28, age: 0.1 };
    const renderer = recordingRenderer();
    new ProjectileRenderer().draw(renderer, [projectile], [caster, reflector]);
    const lines = renderer.calls.filter((call) => call.name === 'polyline');
    assert.equal(lines.length, 3);
    assert.equal(lines[0].args[1], reflector.appearance.saberColor);
    const xs = lines[1].args[0].filter((_, index) => index % 2 === 0);
    assert.ok(Math.min(...xs) < projectile.x);
  });

  it('flashes the reflector blade on a wave reflect and sparks a blade on an arsenal block', () => {
    const effects = createEffects();
    const caster = spawnFighter(400, 1, 'guardian');
    const reflector = spawnFighter(700, -1, 'shadow');
    effects.handleEvents([{ type: CombatEvent.WAVE_REFLECT, attacker: reflector, defender: caster, attackType: 'flowCleave', x: 660, y: 500 }]);
    assert.ok(effects.getSaberFlare(reflector) > 0);
    assert.ok(effects.rings.some((ring) => ring.active && ring.color === reflector.appearance.saberColor));
    const blocks = createEffects();
    blocks.handleEvents([{ type: CombatEvent.ARSENAL_BLOCK, attacker: caster, defender: reflector, attackType: 'throw', x: 650, y: 500 }]);
    assert.ok(blocks.particles.particles.some((particle) => particle.active));
    assert.deepEqual(playedSounds([
      event(CombatEvent.POWER_START, reflector, null, 'arsenal'),
      event(CombatEvent.POWER_ACTIVE, caster, null, 'flowCleave'),
      { type: CombatEvent.WAVE_REFLECT, attacker: reflector, defender: caster, attackType: 'flowCleave', x: 660, y: 500 },
      { type: CombatEvent.ARSENAL_LAUNCH, attacker: reflector, defender: null, attackType: 'arsenal', x: 700, y: 500 },
      { type: CombatEvent.ARSENAL_BLOCK, attacker: caster, defender: reflector, attackType: 'throw', x: 650, y: 500 },
    ]), [SoundName.ARSENAL, SoundName.FLOW_CLEAVE, SoundName.WAVE_REFLECT, SoundName.ARSENAL_LAUNCH, SoundName.ARSENAL_BLOCK]);
  });
});

describe('held absorb presentation', () => {
  it('swirls motes into the hand while the absorb channel is held', () => {
    const fighter = spawnFighter(400, 1, 'bastion');
    channel(fighter, 'absorb', 0.5);
    fighter.combat.absorbTime = powersConfig.powers.absorb.window;
    const renderer = recordingRenderer();
    new PowerRenderer().draw(renderer, [fighter]);
    assert.equal(renderer.calls.filter((call) => call.name === 'drawGlow').length, 1 + powersConfig.render.absorbChannel.motes);
  });
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DuelAudio } from '../src/audio/DuelAudio.js';
import { SoundName } from '../src/audio/soundNames.js';
import { characters } from '../src/characters/characterData.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { keyBindings } from '../src/config/controlsConfig.js';
import { effectsConfig } from '../src/config/effectsConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { colors } from '../src/config/themeConfig.js';
import { texts } from '../src/config/uiConfig.js';
import { Camera } from '../src/core/Camera.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { computePose, createPose } from '../src/rendering/fighterPose.js';
import { PowerRenderer } from '../src/rendering/PowerRenderer.js';
import { EffectsSystem } from '../src/systems/EffectsSystem.js';
import { TimeControl } from '../src/systems/TimeControl.js';
import { buildMoveList } from '../src/ui/moveList.js';
import { createRandom } from '../src/utils/random.js';
import { spawnFighter } from './helpers.js';

function startPower(fighter, id, stateTime, endTime = 0) {
  const power = powersConfig.powers[id];
  fighter.combat.power = power;
  fighter.combat.powerEndTime = endTime;
  fighter.state = power.channel ? FighterState.CHANNELING : FighterState.CASTING;
  fighter.stateTime = stateTime;
  fighter.combat.powerTargetX = fighter.x + 200;
  fighter.combat.powerTargetY = fighter.y - 80;
  return power;
}

function recordingRenderer() {
  const calls = [];
  const record = (name) => (...args) => calls.push({ name, args });
  return {
    calls,
    save: record('save'),
    restore: record('restore'),
    setBlendMode: record('setBlendMode'),
    setAlpha: record('setAlpha'),
    drawGlow: record('drawGlow'),
    polyline: record('polyline'),
    strokeEllipse: record('strokeEllipse'),
  };
}

describe('PowerRenderer', () => {
  it('draws a growing charge glow in the tier color during the startup', () => {
    const fighter = spawnFighter(400, 1, 'mirror');
    startPower(fighter, 'push', 0.1);
    const renderer = recordingRenderer();
    new PowerRenderer().draw(renderer, [fighter]);
    const glow = renderer.calls.find((call) => call.name === 'drawGlow');
    assert.equal(glow.args[3], colors.powerTierSteady);
    assert.ok(glow.args[2] < powersConfig.tiers[1].glowRadius);
  });

  it('draws the lightning bolt toward the aimed point and the barrier as an ellipse', () => {
    const caster = spawnFighter(400, 1, 'shadow');
    const power = startPower(caster, 'lightning', 0.5);
    const holder = spawnFighter(800, -1, 'guardian');
    startPower(holder, 'barrier', 0.5);
    const renderer = recordingRenderer();
    new PowerRenderer().draw(renderer, [caster, holder]);
    const bolts = renderer.calls.filter((call) => call.name === 'polyline');
    assert.ok(bolts.length >= 3);
    const points = bolts[0].args[0];
    assert.equal(points.length, (powersConfig.render.boltSegments + 1) * 2);
    assert.equal(points[points.length - 2], caster.combat.powerTargetX);
    assert.ok(renderer.calls.some((call) => call.name === 'strokeEllipse'));
    assert.ok(power.channel);
  });

  it('draws nothing after the channel is released', () => {
    const caster = spawnFighter(400, 1, 'shadow');
    startPower(caster, 'lightning', 0.8, 0.6);
    const renderer = recordingRenderer();
    new PowerRenderer().draw(renderer, [caster]);
    assert.equal(renderer.calls.filter((call) => call.name === 'polyline').length, 0);
  });
});

describe('power poses', () => {
  it('pulls the blade back while casting and returns during the recovery', () => {
    const fighter = spawnFighter(400, 1, 'guardian');
    const idle = computePose(fighter, createPose()).bladeAngle;
    const power = startPower(fighter, 'push', powersConfig.powers.push.startup);
    const casting = computePose(fighter, createPose()).bladeAngle;
    fighter.stateTime = power.startup + power.active + power.recovery;
    const recovered = computePose(fighter, createPose()).bladeAngle;
    assert.notEqual(casting, idle);
    assert.ok(Math.abs(recovered - idle) < 1e-6);
  });
});

describe('power effects and sounds', () => {
  function createEffects() {
    const random = createRandom(3);
    return new EffectsSystem(effectsConfig, new Camera(effectsConfig, random), random, new TimeControl());
  }

  it('spawns a contracting ring for the pull wave and an expanding one for the push', () => {
    const effects = createEffects();
    const caster = spawnFighter(400, 1, 'shadow');
    effects.handleEvents([{ type: CombatEvent.POWER_ACTIVE, attacker: caster, defender: null, attackType: 'pull', x: 400, y: 500 }]);
    const ring = effects.rings.find((candidate) => candidate.active);
    assert.equal(ring.contract, true);
    assert.equal(ring.color, colors.powerTierSteady);
    const startRadius = ring.radius;
    effects.update(0.1);
    assert.ok(ring.radius < startRadius);
  });

  it('marks resisted powers with a ring in the target tier color', () => {
    const effects = createEffects();
    const caster = spawnFighter(400, 1, 'bastion');
    const target = spawnFighter(600, -1, 'mirror');
    effects.handleEvents([{ type: CombatEvent.POWER_RESISTED, attacker: caster, defender: target, attackType: 'push', x: 600, y: 500 }]);
    assert.ok(effects.rings.some((ring) => ring.active && ring.color === colors.powerTierSteady));
    assert.ok(effects.particles.particles.some((particle) => particle.active && particle.color === colors.powerTierSteady));
  });

  it('plays a sound for every power event', () => {
    const played = [];
    const audio = { play: (name) => played.push(name), duckMusic: () => {} };
    const duelAudio = new DuelAudio(audio, { arenaWidth: 1280, stereoWidth: 0.6, hum: {}, tension: { step: 0.1 }, heartbeat: { interval: 1 } });
    const fighter = spawnFighter(400);
    const event = (type, attackType) => ({ type, attacker: fighter, defender: null, attackType, x: 400, y: 500 });
    duelAudio.handleEvents([
      event(CombatEvent.POWER_START, 'push'),
      event(CombatEvent.POWER_START, 'barrier'),
      event(CombatEvent.POWER_ACTIVE, 'pull'),
      event(CombatEvent.POWER_HIT, 'lightning'),
      event(CombatEvent.POWER_RESISTED, 'push'),
      event(CombatEvent.POWER_ABSORBED, 'lightning'),
    ]);
    assert.deepEqual(played, [SoundName.POWER_CHARGE, SoundName.BARRIER, SoundName.POWER_PULL, SoundName.LIGHTNING, SoundName.POWER_RESISTED, SoundName.POWER_ABSORBED]);
  });
});

describe('move list powers', () => {
  it('lists the loadout powers and blade techniques only when powers are on', () => {
    const rows = buildMoveList(characters.guardian, keyBindings);
    const withPowers = buildMoveList(characters.guardian, keyBindings, true);
    assert.equal(withPowers.length, rows.length + 3);
    assert.ok(withPowers.some((row) => row.label.includes(texts.powers.push)));
    assert.ok(withPowers.some((row) => row.label.includes(texts.powers.barrier) && row.keys.includes('U')));
    assert.ok(withPowers.some((row) => row.label.includes(texts.powers.dashSlash) && row.keys.includes('I') && row.keys.includes('D')));
    assert.equal(buildMoveList(characters.echo, keyBindings, true).length, rows.length + 2);
  });
});

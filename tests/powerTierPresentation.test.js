import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { effectsConfig } from '../src/config/effectsConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { Camera } from '../src/core/Camera.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { computePose, createPose } from '../src/rendering/fighterPose.js';
import { PowerRenderer } from '../src/rendering/PowerRenderer.js';
import { EffectsSystem } from '../src/systems/EffectsSystem.js';
import { TimeControl } from '../src/systems/TimeControl.js';
import { createRandom } from '../src/utils/random.js';
import { spawnFighter } from './helpers.js';

const TIER_LEVELS = [1, 3, 8, 10];

function startPower(fighter, id, stateTime) {
  const power = powersConfig.powers[id];
  fighter.combat.power = power;
  fighter.combat.powerEndTime = 0;
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
    fillPolygon: record('fillPolygon'),
    line: record('line'),
    translate: record('translate'),
    scale: record('scale'),
    rotate: record('rotate'),
    fillCircle: record('fillCircle'),
    fillEllipse: record('fillEllipse'),
  };
}

function createEffects(reduced = false) {
  const random = createRandom(3);
  const effects = new EffectsSystem(effectsConfig, new Camera(effectsConfig, random), random, new TimeControl());
  effects.setReduced(reduced);
  return effects;
}

describe('lightning and storm by tier', () => {
  for (const [index, level] of TIER_LEVELS.entries()) {
    const tier = powersConfig.tiers[index];
    it(`${tier.id}: draws ${tier.bolts} bolt(s)${tier.branch ? ' with a branch' : ''} toward nearby target heights`, () => {
      const caster = spawnFighter(400, 1, 'shadow');
      caster.stats.flowLevel = level;
      startPower(caster, 'lightning', 0.5);
      const renderer = recordingRenderer();
      new PowerRenderer().draw(renderer, [caster]);
      const lines = renderer.calls.filter((call) => call.name === 'polyline');
      assert.equal(lines.length, tier.bolts * 3 + (tier.branch ? 1 : 0));
      const ends = new Set(lines.map((call) => call.args[0].at(-1)));
      assert.equal(ends.size, tier.bolts);
      for (const end of ends) {
        assert.ok(Math.abs(end - caster.combat.powerTargetY) <= 30);
      }
    });
  }

  it('runs short arcs over the body of the storm caster, more at the higher tiers', () => {
    const counts = [];
    for (const level of [6, 8]) {
      const caster = spawnFighter(400, 1, 'shadow');
      caster.stats.flowLevel = level;
      startPower(caster, 'storm', 0.6);
      const pose = computePose(caster, createPose());
      const renderer = recordingRenderer();
      new PowerRenderer().draw(renderer, [caster], new Map([[caster, pose]]));
      const arcs = renderer.calls.filter((call) => call.name === 'polyline' && call.args[0].length === (powersConfig.render.storm.arcSegments + 1) * 2);
      for (const call of arcs) {
        const xs = call.args[0].filter((_, i) => i % 2 === 0);
        assert.ok(Math.max(...xs.map((x) => Math.abs(x - caster.x))) < caster.height * 0.6);
      }
      counts.push(arcs.length / 3);
    }
    assert.deepEqual(counts, [2, 3]);
  });

  it('skips the body arcs when no pose is given', () => {
    const caster = spawnFighter(400, 1, 'shadow');
    caster.stats.flowLevel = 8;
    startPower(caster, 'storm', 0.6);
    const renderer = recordingRenderer();
    new PowerRenderer().draw(renderer, [caster]);
    assert.equal(renderer.calls.filter((call) => call.name === 'polyline').length, 0);
  });

  it('shakes the storm target for a moment and outlines it once per pulse', () => {
    const effects = createEffects();
    const caster = spawnFighter(400, 1, 'shadow');
    const target = spawnFighter(560, -1, 'guardian');
    effects.handleEvents([{ type: CombatEvent.POWER_HIT, attacker: caster, defender: target, attackType: 'storm', x: 560, y: 500 }]);
    const spasm = Math.abs(effects.getTremor(target));
    assert.ok(spasm >= 1 && spasm <= 2);
    assert.equal(effects.getPulseOutline(target), 1);
    assert.equal(effects.hasHitFlash(target), false);
    effects.update(effectsConfig.stormSpasm.duration + 0.01);
    assert.equal(effects.getTremor(target), 0);
    assert.equal(effects.getPulseOutline(target), 0);
  });

  it('keeps a reduced spasm and no outline with reduced effects', () => {
    const effects = createEffects(true);
    const caster = spawnFighter(400, 1, 'shadow');
    const target = spawnFighter(560, -1, 'guardian');
    effects.handleEvents([{ type: CombatEvent.POWER_HIT, attacker: caster, defender: target, attackType: 'storm', x: 560, y: 500 }]);
    assert.ok(Math.abs(effects.getTremor(target)) < effectsConfig.stormSpasm.amplitude);
    assert.equal(effects.getPulseOutline(target), 0);
  });
});

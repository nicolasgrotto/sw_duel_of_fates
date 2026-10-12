import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { effectsConfig } from '../src/config/effectsConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { projectilesConfig } from '../src/config/projectilesConfig.js';
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
    fillPolygon: (points, ...rest) => calls.push({ name: 'fillPolygon', args: [Array.from(points), ...rest] }),
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

  it('runs short arcs over the body of the storm caster during the invocation, more at the higher tiers', () => {
    const counts = [];
    for (const level of [6, 8]) {
      const caster = spawnFighter(400, 1, 'shadow');
      caster.stats.flowLevel = level;
      startPower(caster, 'storm', 0.3);
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
    startPower(caster, 'storm', 0.3);
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

describe('frozen and choked targets', () => {
  it('holds the pose of the instant while frozen and releases it after', () => {
    const fighter = spawnFighter(400, 1, 'guardian');
    const pose = createPose();
    const before = { ...computePose(fighter, pose) };
    fighter.restartState(FighterState.STUNNED);
    fighter.combat.freezeTime = 1;
    for (const time of [0.1, 0.4, 0.9]) {
      fighter.stateTime = time;
      fighter.animation.time += 0.3;
      computePose(fighter, pose);
      assert.equal(pose.bladeAngle, before.bladeAngle);
      assert.equal(pose.shoulderY, before.shoulderY);
    }
    fighter.combat.freezeTime = 0;
    computePose(fighter, pose);
    assert.notEqual(pose.bladeAngle, before.bladeAngle);
  });

  it('draws trembling silhouettes in the tier color of the caster around the frozen body', () => {
    const fighter = spawnFighter(400, 1, 'guardian');
    fighter.combat.freezeTime = 0.5;
    fighter.combat.statusLevel = 10;
    const renderer = recordingRenderer();
    const pose = computePose(fighter, createPose());
    const view = new PowerRenderer();
    view.drawFrozenEchoes(renderer, fighter, pose, fighter.y);
    const echoes = powersConfig.render.status.freezeEchoOffsets.length;
    const torsos = renderer.calls.filter((call) => call.name === 'fillPolygon');
    assert.equal(torsos.length, echoes);
    assert.ok(torsos.every((call) => call.args[1] === powersConfig.tiers[3].color));
    assert.ok(renderer.calls.some((call) => call.name === 'setAlpha' && call.args[0] === powersConfig.render.status.freezeEchoAlpha));
    const firstShift = renderer.calls.find((call) => call.name === 'translate').args[0];
    fighter.animation.time += powersConfig.render.status.freezeEchoInterval;
    const next = recordingRenderer();
    view.drawFrozenEchoes(next, fighter, pose, fighter.y);
    assert.equal(next.calls.find((call) => call.name === 'translate').args[0], -firstShift);
    fighter.combat.freezeTime = 0;
    const idle = recordingRenderer();
    view.drawFrozenEchoes(idle, fighter, pose, fighter.y);
    assert.equal(idle.calls.length, 0);
  });

  it('lifts the choked victim higher through the hold with the hands at the neck, feet together and the blade hanging', () => {
    const fighter = spawnFighter(400, 1, 'guardian');
    fighter.restartState(FighterState.STUNNED);
    fighter.combat.chokeTime = 0.5;
    fighter.stateTime = 0.3;
    const pose = computePose(fighter, createPose());
    assert.ok(pose.bodyLift > fighter.height * 0.1 && pose.bodyLift < fighter.height * 0.18);
    fighter.stateTime = 1.8;
    const held = computePose(fighter, createPose());
    assert.ok(Math.abs(held.bodyLift - fighter.height * 0.18) < 1e-9);
    fighter.stateTime = 0.3;
    assert.equal(pose.offHand, 1);
    assert.ok(Math.abs(pose.handY - pose.headY) < pose.headRadius * 2);
    assert.ok(Math.abs(pose.freeHandY - pose.headY) < pose.headRadius * 2);
    assert.ok(Math.abs(pose.frontFootX - pose.backFootX) < fighter.height * 0.06);
    assert.ok(pose.bladeAngle > Math.PI / 3);
    fighter.combat.chokeTime = 0;
    const stunned = computePose(fighter, createPose());
    assert.equal(stunned.bodyLift, 0);
    assert.equal(stunned.offHand, 0);
  });
});

describe('barrier, push, pull and throw by tier', () => {
  it('grows the barrier ellipse with the tier', () => {
    const radii = TIER_LEVELS.map((level) => {
      const holder = spawnFighter(400, 1, 'guardian');
      holder.stats.flowLevel = level;
      startPower(holder, 'barrier', 0.5);
      const renderer = recordingRenderer();
      new PowerRenderer().draw(renderer, [holder]);
      return renderer.calls.find((call) => call.name === 'strokeEllipse').args[3];
    });
    const base = radii[1];
    assert.deepEqual(radii.map((radius) => Number((radius / base).toFixed(2))), powersConfig.tiers.map((tier) => tier.barrierScale));
  });

  it('scales the push chevrons and dust with the tier but keeps the gameplay range', () => {
    const results = TIER_LEVELS.map((level) => {
      const effects = createEffects();
      const caster = spawnFighter(400, 1, 'mirror');
      caster.stats.flowLevel = level;
      effects.handleEvents([{ type: CombatEvent.POWER_ACTIVE, attacker: caster, defender: null, attackType: 'push', x: 400, y: 500 }]);
      const wave = effects.shockwaves.find((candidate) => candidate.active);
      const dust = effects.particles.particles.filter((particle) => particle.active).length;
      return { scale: wave.scale, range: wave.range, dust };
    });
    assert.deepEqual(results.map(({ scale }) => scale), powersConfig.tiers.map((tier) => tier.waveScale));
    assert.ok(results.every(({ range }) => range === powersConfig.powers.push.range));
    assert.ok(results[0].dust < results[1].dust && results[1].dust < results[3].dust);
  });

  it('starts the closing pull ring at the real pull range of the caster', () => {
    for (const [index, level] of TIER_LEVELS.entries()) {
      const effects = createEffects();
      const caster = spawnFighter(400, 1, 'shadow');
      caster.stats.flowLevel = level;
      effects.handleEvents([{ type: CombatEvent.POWER_ACTIVE, attacker: caster, defender: null, attackType: 'pull', x: 400, y: 500 }]);
      const ring = effects.rings.find((candidate) => candidate.active);
      const reach = Math.abs(ring.x - caster.x) + ring.radius;
      assert.equal(reach, powersConfig.powers.pull.rangeByLevel[index].range);
      assert.equal(ring.lineWidth, effectsConfig.recipes.powerWave.ring.lineWidth * powersConfig.tiers[index].waveScale);
      assert.equal(ring.contract, true);
    }
  });

  it('raises one to four separate stones from the floor during the throw startup', () => {
    for (const [level, stones] of [[1, 1], [4, 2], [6, 2], [9, 3], [10, 4]]) {
      const caster = spawnFighter(400, 1, 'shadow');
      caster.stats.flowLevel = level;
      const power = startPower(caster, 'throw', 0.01);
      const early = recordingRenderer();
      new PowerRenderer().draw(early, [caster]);
      assert.equal(early.calls.filter((call) => call.name === 'fillPolygon').length, stones);
      assert.equal(early.calls.filter((call) => call.name === 'drawGlow').length, 0);
      caster.stateTime = power.startup * 0.99;
      const late = recordingRenderer();
      new PowerRenderer().draw(late, [caster]);
      const lowest = (calls) => Math.max(...calls.filter((call) => call.name === 'fillPolygon').map((call) => Math.max(...call.args[0].filter((_, i) => i % 2 === 1))));
      assert.ok(lowest(late.calls) < lowest(early.calls));
    }
  });

  it('kicks dust on the throw startup, halved with reduced effects', () => {
    const counts = [false, true].map((reduced) => {
      const effects = createEffects(reduced);
      const caster = spawnFighter(400, 1, 'shadow');
      effects.handleEvents([{ type: CombatEvent.POWER_START, attacker: caster, defender: null, attackType: 'throw', x: 400, y: 500 }]);
      return effects.particles.particles.filter((particle) => particle.active).length;
    });
    assert.deepEqual(counts, [effectsConfig.throwDust.count, effectsConfig.throwDust.count / 2]);
  });

  it('drops four to six dark fragments with gravity when the stones hit', () => {
    const effects = createEffects();
    const caster = spawnFighter(400, 1, 'shadow');
    const target = spawnFighter(700, -1, 'guardian');
    effects.handleEvents([{ type: CombatEvent.POWER_HIT, attacker: caster, defender: target, attackType: 'throw', x: 700, y: 500 }]);
    const pieces = effects.debris.particles.filter((piece) => piece.active);
    assert.ok(pieces.length >= 4 && pieces.length <= 6);
    const vy = pieces[0].vy;
    effects.update(0.1);
    assert.ok(pieces[0].vy > vy);
    const quiet = createEffects();
    quiet.handleEvents([{ type: CombatEvent.POWER_HIT, attacker: caster, defender: target, attackType: 'push', x: 700, y: 500 }]);
    assert.equal(quiet.debris.particles.filter((piece) => piece.active).length, 0);
  });
});

describe('stone cluster', () => {
  it('keeps the stones of every layout apart and within 1.2 hitbox radii', () => {
    const { layouts } = projectilesConfig.render.rocks;
    const reach = Math.max(...projectilesConfig.render.fragmentPoints.map((value, index, all) => (index % 2 === 0 ? Math.hypot(value, all[index + 1]) : 0)));
    for (const layout of layouts) {
      const stones = [];
      for (let index = 0; index < layout.length; index += 3) stones.push(layout.slice(index, index + 3));
      for (const [x, y, size] of stones) assert.ok(Math.hypot(x, y) + size * reach <= 1.2 + 1e-9);
      for (let a = 0; a < stones.length; a += 1) {
        for (let b = a + 1; b < stones.length; b += 1) {
          const gap = Math.hypot(stones[a][0] - stones[b][0], stones[a][1] - stones[b][1]) - (stones[a][2] + stones[b][2]) * reach;
          assert.ok(gap > 0.1, `gap ${gap}`);
        }
      }
    }
  });
});

describe('stone size', () => {
  it('grows the single stones at every gallery tier, including deep over steady', async () => {
    const { galleryConfig } = await import('../src/config/galleryConfig.js');
    const { getRockLook } = await import('../src/rendering/rockCluster.js');
    const { getPowerTier, resolveLevelBand } = await import('../src/combat/flowInteractions.js');
    const { layouts } = projectilesConfig.render.rocks;
    const stones = galleryConfig.levels.map((level) => {
      const look = getRockLook(getPowerTier(level, powersConfig.tiers).id);
      const radius = resolveLevelBand(level, projectilesConfig.throw.sizes).radius * look.scale;
      return radius * Math.min(...layouts[look.count - 1].filter((_, index) => index % 3 === 2));
    });
    for (let index = 1; index < stones.length; index += 1) assert.ok(stones[index] > stones[index - 1], `${index}`);
  });

  it('keeps the look of the tier that threw the stone while it flies', async () => {
    const { ProjectileRenderer } = await import('../src/rendering/ProjectileRenderer.js');
    const { ProjectileKind } = await import('../src/config/projectilesConfig.js');
    const owner = spawnFighter(300, 1, 'shadow');
    owner.stats.flowLevel = 1;
    const stone = { active: true, kind: ProjectileKind.THROW, owner: 0, source: 'throw', x: 600, y: 500, vx: 500, radius: 38, age: 0.2, level: 10 };
    const renderer = recordingRenderer();
    new ProjectileRenderer().draw(renderer, [stone], [owner]);
    assert.equal(renderer.calls.filter((call) => call.name === 'fillPolygon').length, projectilesConfig.render.rocks.byTier.apex.count);
  });
});

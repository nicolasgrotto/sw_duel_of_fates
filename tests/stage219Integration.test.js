import { it } from 'node:test';
import assert from 'node:assert/strict';
import { powersConfig } from '../src/config/powersConfig.js';
import { galleryConfig } from '../src/config/galleryConfig.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { captureProjectiles, restoreProjectiles } from '../src/combat/ProjectileSystem.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { GalleryScene } from '../src/modes/GalleryScene.js';
import { GalleryDirector } from '../src/modes/GalleryDirector.js';
import { captureFighter, restoreFighter, ReplayBuffer } from '../src/simulation/ReplayBuffer.js';
import { DuelState } from '../src/states/DuelState.js';
import { getPowerDebugInfo } from '../src/states/powerDebugInfo.js';
import { STEP, spawnFighter, createSimulation } from './helpers.js';

function gallery(ability, target = 'idle', tier = galleryConfig.levels.length - 1) {
  return new GalleryScene(new GalleryDirector({ ...galleryConfig.defaults, ability, target, tier, repeat: false }),
    createSimulation([spawnFighter(400), spawnFighter(700, -1)], { powers: true }));
}
function gallerySteps(scene, frames) {
  const events = [];
  for (let i = 0; i < frames; i++) {
    scene.beforeStep();
    scene.controllers.forEach((controller, index) => controller.updateIntent(scene.fighters[index].intent, STEP));
    scene.simulation.step(STEP);
    events.push(...scene.simulation.events);
    scene.afterStep(STEP);
  }
  return events;
}

it('shows Flow Cleave with all tiers and aligns Absorb with the wave speed', () => {
  for (let tier = 0; tier < galleryConfig.levels.length; tier++) {
    const s = gallery('flowCleave', 'absorb', tier);
    assert.equal(s.range, powersConfig.powers.flowCleave.range);
    assert.equal(s.requestCast(), true);
    const events = gallerySteps(s, 180);
    assert.ok(events.some(event => event.type === CombatEvent.POWER_ABSORBED && event.attackType === 'flowCleave'));
    assert.equal(events.some(event => event.type === CombatEvent.POWER_HIT && event.attackType === 'flowCleave'), false);
  }
});

it('demonstrates Arsenal intercepting the attacking target Throw and waits for orbit expiry', () => {
  const s = gallery('arsenal', 'attacking');
  assert.equal(s.fighters[1].stats.power.loadout.neutral, powersConfig.powers[galleryConfig.arsenalAttackPower]);
  s.requestCast();
  const events = gallerySteps(s, 150);
  assert.ok(events.some(event => event.type === CombatEvent.ARSENAL_BLOCK && event.attackType === 'throw'));
  assert.equal(s.director.phase, 'active');
  assert.ok(s.fighters[0].combat.arsenal.objects.length);
  gallerySteps(s, Math.ceil(powersConfig.powers.arsenal.duration / STEP));
  assert.equal(s.fighters[0].combat.arsenal, null);
  assert.equal(s.director.phase, 'ready');
});

it('keeps all Storm tiers selectable and the approved minimum level enforced', () => {
  const s = gallery('storm');
  for (let tier = 0; tier < galleryConfig.levels.length; tier++) {
    s.changeSelection('tier', tier);
    assert.equal(s.requestCast(), galleryConfig.levels[tier] >= powersConfig.powers.storm.minFlowLevel);
  }
});

it('keeps the gallery active while additional Storm fractures finish', () => {
  const s = gallery('storm');
  s.fighters[0].combat.fractures.push({ time: 0 });
  assert.equal(s.hasEffects(), true);
  s.reset();
  assert.deepEqual(s.fighters[0].combat.fractures, []);
});

it('reports orbit objects, Storm waves, extra fractures and reflected waves in F3', () => {
  const s = gallery('arsenal');
  s.simulation.combat.powers.arsenals.start(s.fighters[0], powersConfig.powers.arsenal);
  assert.match(getPowerDebugInfo(s.fighters[0]), /arsenal [1-9]/);
  assert.match(getPowerDebugInfo(s.fighters[0]), /storm wave 0 fractures 0/);
  const wave = s.simulation.projectiles.spawnWave(s.fighters[0], powersConfig.powers.flowCleave);
  wave.reflected = true;
  const state = Object.create(DuelState.prototype);
  Object.assign(state, { gallery: s.director, galleryScene: s, participants: s.fighters.map(fighter => ({ fighter })), fighters: s.fighters, simulation: s.simulation });
  assert.match(state.getDebugInfo().join('\n'), /reflected waves: 1/);
});

function eventData(events, fighters) {
  return events.map(event => {
    const { attacker, defender, ...data } = event;
    return { ...data, attacker: fighters.indexOf(attacker), defender: fighters.indexOf(defender) };
  });
}

for (const ability of ['storm', 'flowCleave', 'arsenal']) {
  for (const reversed of [false, true]) {
    for (const start of [0, 90]) {
      it('replays ' + ability + ' from ' + start + ', reversed ' + reversed, () => {
        const caster = spawnFighter(400), target = spawnFighter(ability === 'flowCleave' ? 450 : 700, -1);
        const power = powersConfig.powers[ability];
        for (const f of [caster, target]) f.stats = { ...f.stats, flowLevel: powersConfig.tiers.at(-1).minLevel,
          power: { ...f.stats.power, loadout: { neutral: f === caster ? power : powersConfig.powers.throw } } };
        caster.flowMeter = caster.stats.power.max;
        target.flowMeter = target.stats.power.max;
        const fighters = reversed ? [target, caster] : [caster, target];
        const sim = createSimulation(fighters, { powers: true });
        sim.projectiles.fighters = fighters;
        if (ability === 'flowCleave') {
          sim.projectiles.spawnWave(caster, power);
          target.state = FighterState.BLOCKING;
          target.combat.parryArmed = true;
          target.combat.parryTime = 0;
        } else sim.combat.powers.tryCast(caster);
        const buffer = new ReplayBuffer({ frames: 500, snapshotInterval: 30 });
        const recorded = [], allEvents = [];
        for (let frame = 0; frame < 420; frame++) {
          caster.clearIntent();
          target.clearIntent();
          if (ability === 'flowCleave') target.intent.block = true;
          if (ability === 'storm') target.intent.moveX = frame % 120 < 60 ? -1 : 1;
          if (ability === 'arsenal') {
            target.intent.power = frame === 45;
            caster.intent.power = frame === 120 || frame === 160;
          }
          if (frame >= start) buffer.record(fighters, STEP, sim.projectiles);
          sim.step(STEP);
          allEvents.push(...eventData(sim.events, fighters));
          if (frame >= start) recorded.push(...eventData(sim.events, fighters));
        }
        const expected = fighters.map(captureFighter), projectiles = captureProjectiles(sim.projectiles);
        const playback = buffer.createPlayback();
        fighters.forEach((fighter, index) => restoreFighter(fighter, playback.snapshot.fighters[index]));
        const replay = createSimulation(fighters, { powers: true });
        replay.projectiles.fighters = fighters;
        restoreProjectiles(replay.projectiles, playback.snapshot.projectiles);
        const actual = [];
        for (let frame = playback.firstStep; frame < playback.lastStep; frame++) {
          replay.step(buffer.readStep(frame, fighters));
          actual.push(...eventData(replay.events, fighters));
        }
        assert.deepEqual(fighters.map(captureFighter), expected);
        assert.deepEqual(captureProjectiles(replay.projectiles), projectiles);
        assert.deepEqual(actual, recorded);
        const required = ability === 'storm' ? [CombatEvent.STORM_STRIKE, CombatEvent.FRACTURE_BURST]
          : ability === 'flowCleave' ? [CombatEvent.WAVE_REFLECT] : [CombatEvent.ARSENAL_LAUNCH, CombatEvent.ARSENAL_BLOCK];
        for (const type of required) assert.ok(allEvents.some(event => event.type === type), type);
      });
    }
  }
}

import { it } from 'node:test';
import assert from 'node:assert/strict';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { galleryConfig } from '../src/config/galleryConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { GalleryDirector } from '../src/modes/GalleryDirector.js';
import { GalleryScene } from '../src/modes/GalleryScene.js';
import { galleryCatalog } from '../src/modes/galleryCatalog.js';
import { captureFighter, restoreFighter, ReplayBuffer } from '../src/simulation/ReplayBuffer.js';
import { DuelState } from '../src/states/DuelState.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';

function eventData(events, fighters) {
  return events.filter(event => event.type === CombatEvent.STORM_MARK || event.type === CombatEvent.STORM_STRIKE).map(event => ({
    type: event.type, attacker: fighters.indexOf(event.attacker), defender: fighters.indexOf(event.defender),
    x: event.x, impactTime: event.impactTime, hit: event.hit,
  }));
}

for (const level of [6, 8, 10]) {
  for (const reversed of [false, true]) {
    for (const startFrame of [0, 45, 150, 335]) {
      it(`replays storm marks and strikes exactly from frame ${startFrame}, level ${level}, reversed ${reversed}`, () => {
        const caster = spawnFighter(450, 1, 'sovereign');
        const target = spawnFighter(850, -1);
        caster.stats = { ...caster.stats, flowLevel: level, power: { ...caster.stats.power, potency: 1, loadout: { neutral: powersConfig.powers.storm } } };
        target.stats = { ...target.stats, flowLevel: level };
        caster.flowMeter = 100;
        const fighters = reversed ? [target, caster] : [caster, target];
        const simulation = createSimulation(fighters, { powers: true });
        simulation.combat.powers.tryCast(caster);
        const buffer = new ReplayBuffer({ frames: 500, snapshotInterval: 30 });
        const recordedEvents = [];
        for (let frame = 0; frame < 420; frame++) {
          target.intent.moveX = frame % 120 < 60 ? -1 : 1;
          if (frame >= startFrame) buffer.record(fighters, STEP);
          simulation.step(STEP);
          if (frame >= startFrame) recordedEvents.push(...eventData(simulation.events, fighters));
        }
        const expected = fighters.map(captureFighter);
        const playback = buffer.createPlayback();
        fighters.forEach((fighter, index) => restoreFighter(fighter, playback.snapshot.fighters[index]));
        const replay = createSimulation(fighters, { powers: true });
        const replayedEvents = [];
        for (let frame = playback.firstStep; frame < playback.lastStep; frame++) {
          replay.step(buffer.readStep(frame, fighters));
          replayedEvents.push(...eventData(replay.events, fighters));
        }
        assert.deepEqual(fighters.map(captureFighter), expected);
        assert.deepEqual(replayedEvents, recordedEvents);
        if (startFrame === 0) {
          const count = powersConfig.powers.storm.strikesByTier.findLast(band => level >= band.minLevel).strikes
            * powersConfig.powers.storm.boltsByTier.findLast(band => level >= band.minLevel).bolts;
          assert.equal(recordedEvents.filter(event => event.type === CombatEvent.STORM_MARK).length, count);
          assert.equal(recordedEvents.filter(event => event.type === CombatEvent.STORM_STRIKE).length, count);
        }
      });
    }
  }
}

function scene(ability, target = 'idle', tier = 1) {
  const director = new GalleryDirector({ ...galleryConfig.defaults, ability, target, tier, repeat: false });
  return new GalleryScene(director, createSimulation([spawnFighter(400), spawnFighter(700, -1, 'shadow')], { powers: true }));
}

function stepGallery(scene, count) {
  const events = [];
  for (let frame = 0; frame < count; frame++) {
    scene.beforeStep();
    scene.controllers.forEach((controller, index) => controller.updateIntent(scene.fighters[index].intent, STEP));
    scene.simulation.step(STEP);
    events.push(...scene.simulation.events);
    scene.afterStep(STEP);
  }
  return events;
}

it('catalogs all four new powers and the Absorb target without old ids', () => {
  for (const id of ['absorb', 'drain', 'mindTwist', 'storm']) assert.ok(galleryCatalog.some(item => item.id === id));
  assert.ok(galleryConfig.targets.includes('absorb'));
});

it('aligns the gallery Absorb window with projectile arrival after the caster recovers', () => {
  for (const tier of [0, 1, 2, 3]) {
    const s = scene('throw', 'absorb', tier);
    s.requestCast();
    const events = stepGallery(s, 220);
    assert.ok(events.some(event => event.type === CombatEvent.POWER_ABSORBED && event.defender === s.fighters[1] && event.attackType === 'throw'), `tier ${tier}`);
    assert.equal(events.some(event => event.type === CombatEvent.POWER_HIT && event.defender === s.fighters[1]), false);
    s.reset();
    assert.equal(s.controllers[1].responseAt, null);
    assert.equal(s.controllers[1].elapsed, 0);
  }
});

it('gallery storm keeps its real marks, bypasses Absorb and blocking, then ends before reset', () => {
  for (const target of ['idle', 'blocking', 'absorb', 'airborne']) {
    const s = scene('storm', target, 3);
    s.requestCast();
    const events = stepGallery(s, 450);
    const count = powersConfig.powers.storm.strikesByTier.at(-1).strikes * powersConfig.powers.storm.boltsByTier.at(-1).bolts;
    assert.equal(events.filter(event => event.type === CombatEvent.STORM_MARK).length, count);
    assert.equal(events.filter(event => event.type === CombatEvent.STORM_STRIKE).length, count);
    assert.ok(events.some(event => event.type === CombatEvent.POWER_HIT), target);
    assert.equal(s.director.phase, 'ready');
    assert.equal(s.fighters[0].combat.stormPhase, null);
    assert.deepEqual(s.fighters[0].combat.stormMarks, []);
  }
});

it('F3 reads Absorb, confusion and pending storm marks in gallery and normal duel', () => {
  const s = scene('storm', 'absorb', 3);
  s.requestCast();
  stepGallery(s, 36);
  s.fighters[1].combat.confuseTime = 0.8;
  const view = Object.create(DuelState.prototype);
  view.gallery = s.director;
  view.galleryScene = s;
  view.participants = s.fighters.map(fighter => ({ fighter }));
  view.fighters = s.fighters;
  view.simulation = s.simulation;
  let lines = view.getDebugInfo();
  assert.ok(lines.some(line => line.includes('phase: storm')));
  assert.ok(lines.some(line => line.includes('confuse 0.80')));
  assert.ok(lines.some(line => line.includes('marks '+powersConfig.powers.storm.boltsByTier.at(-1).bolts)));
  view.gallery = null;
  view.game = { input: { lastInputKind: 'keyboard' }, settings: { difficulty: 'normal' } };
  view.rules = { powers: true };
  view.roundNumber = 1;
  view.roundWins = [0, 0];
  view.duelTime = 0;
  view.opponentController = { decision: 'wait' };
  lines = view.getDebugInfo();
  assert.ok(lines.some(line => line.includes('storm storm')));
  assert.ok(lines.some(line => line.includes('absorb')));
  assert.ok(lines.some(line => line.includes('confuse 0.80')));
});

import { it } from 'node:test';
import assert from 'node:assert/strict';
import { powersConfig } from '../src/config/powersConfig.js';
import { bladeTechniques } from '../src/config/movesConfig.js';
import { galleryConfig } from '../src/config/galleryConfig.js';
import { galleryCatalog, galleryCasters, sanitizeGallery } from '../src/modes/galleryCatalog.js';
import { GalleryDirector } from '../src/modes/GalleryDirector.js';
import { GalleryScene } from '../src/modes/GalleryScene.js';
import { loadSettings, saveSettings } from '../src/core/settingsStorage.js';
import { createDuelRules, DuelMode, hasRoundLimit } from '../src/states/duelModes.js';
import { DuelState } from '../src/states/DuelState.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';

function createScene(selection = {}) {
  const director = new GalleryDirector({ ...galleryConfig.defaults, repeat: false, ...selection });
  const simulation = createSimulation([spawnFighter(400), spawnFighter(700, -1, 'shadow')], createDuelRules(DuelMode.GALLERY, {}, powersConfig.modes));
  return new GalleryScene(director, simulation);
}

function step(scene, count = 1) {
  const events = [];
  for (let index = 0; index < count; index += 1) {
    scene.beforeStep();
    for (let side = 0; side < scene.controllers.length; side += 1) scene.controllers[side].updateIntent(scene.fighters[side].intent, STEP);
    scene.simulation.step(STEP);
    events.push(...scene.simulation.events);
    scene.afterStep(STEP);
  }
  return events;
}

it('generates every gallery power by category followed by every technique', () => {
  assert.deepEqual(galleryCatalog.filter((item) => item.kind === 'power').map((item) => item.id).sort(), Object.keys(powersConfig.powers).sort());
  assert.deepEqual(galleryCatalog.filter((item) => item.kind === 'technique').map((item) => item.id), Object.keys(bladeTechniques));
  assert.equal(new Set(galleryCatalog.map((item) => item.id)).size, galleryCatalog.length);
  const categories = Object.keys(powersConfig.categories);
  const indices = galleryCatalog.map((item) => categories.indexOf(item.category));
  assert.deepEqual(indices, [...indices].sort((a, b) => a - b));
});

it('forces gallery capabilities and has no rounds even with powers disabled in settings', () => {
  assert.deepEqual(createDuelRules(DuelMode.GALLERY, { powers: false }, []), {
    powers: true, focusEvade: true, exhaustion: false, wounds: false, bladeLock: false,
  });
  assert.equal(hasRoundLimit(DuelMode.GALLERY), false);
});

for (const item of galleryCatalog) {
  for (let tier = 0; tier < galleryConfig.levels.length; tier += 1) {
    const level = galleryConfig.levels[tier];
    it(`casts ${item.id} through real actions at tier ${tier} level ${level}`, () => {
      const scene = createScene({ ability: item.id, tier });
      const allowed = level >= (item.data.minFlowLevel ?? 0);
      assert.equal(scene.requestCast(), allowed);
      const events = step(scene, 450);
      const starts = events.filter((event) => event.type === (item.kind === 'power' ? 'powerStart' : 'attackStart') && event.attacker === scene.fighters[0]);
      assert.equal(starts.length, allowed ? 1 : 0);
      if (!allowed) {
        assert.equal(events.length, 0);
        return;
      }
      assert.equal(starts[0].attackType, item.id);
      if (item.kind === 'technique') assert.ok(events.some((event) => event.type === 'hit'), item.id);
      else if (item.data.channel) {
        if (item.id !== 'barrier') assert.ok(events.some((event) => event.type === 'powerHit'), item.id);
      } else assert.ok(events.some((event) => event.type === 'powerActive'), item.id);
      assert.equal(scene.director.phase, 'ready');
      assert.equal(scene.simulation.projectiles.activeCount, 0);
      assert.ok(scene.fighters.every((fighter) => fighter.isAlive));
    });
  }
}

it('keeps minimum flow validation inside the real power system', () => {
  const scene = createScene({ ability: 'storm', tier: 0 });
  scene.fighters[0].intent.power = true;
  scene.simulation.step(STEP);
  assert.equal(scene.fighters[0].combat.power, null);
  assert.equal(scene.simulation.events.some((event) => event.type === 'powerStart'), false);
});

for (const target of galleryConfig.targets) {
  it(`launches the catalog against the ${target} target without leaking reactions`, () => {
    for (const item of galleryCatalog) {
      for (let tier = 0; tier < galleryConfig.levels.length; tier += 1) {
        if (galleryConfig.levels[tier] < (item.data.minFlowLevel ?? 0)) continue;
        const scene = createScene({ ability: item.id, tier, target });
        scene.requestCast();
        const events = step(scene, 500);
        assert.ok(events.some((event) => event.attacker === scene.fighters[0] && event.type === (item.kind === 'power' ? 'powerStart' : 'attackStart')), item.id);
        assert.equal(scene.director.phase, 'ready', item.id);
        if (target === 'barrier' || target === 'redirect') {
          assert.equal(events.filter((event) => event.attacker === scene.fighters[1] && event.type === 'powerStart').length, 1, item.id);
        }
        scene.reset();
        assert.equal(scene.controllers[1].responded, false);
        assert.equal(scene.fighters[1].combat.redirectTime, 0);
      }
    }
  });
}

it('uses the real barrier, redirect, block and airborne interactions', () => {
  for (const [target, eventType] of [['idle', 'powerHit'], ['blocking', 'powerBlocked'], ['barrier', 'powerAbsorbed'], ['redirect', 'powerAbsorbed']]) {
    const scene = createScene({ ability: 'lightning', target, tier: 1 });
    scene.requestCast();
    const events = step(scene, 200);
    assert.ok(events.some((event) => event.type === eventType), target);
    if (target === 'redirect') assert.ok(events.some((event) => event.type === 'powerHit' && event.attacker === scene.fighters[1]));
  }
  const scene = createScene({ ability: 'push', target: 'airborne' });
  scene.requestCast();
  const events = step(scene, 20);
  assert.ok(events.some((event) => event.type === 'powerHit'));
  assert.equal(scene.fighters[1].grounded, false);
});

it('changes casters using character data without mutating roster loadouts or sharing fighter state', () => {
  const scene = createScene({ ability: 'wrath' });
  const prior = scene.fighters[0];
  for (const caster of galleryCasters) {
    const original = spawnFighter(400, 1, caster);
    scene.changeSelection('caster', caster);
    assert.equal(scene.fighters[0].id, caster);
    assert.equal(scene.fighters[0].appearance.motion, original.appearance.motion);
    assert.equal(scene.fighters[0].stats.maxHealth, original.stats.maxHealth);
    assert.notEqual(scene.fighters[0].combat, prior.combat);
    scene.requestCast();
    assert.ok(step(scene, 40).some((event) => event.type === 'powerActive' && event.attackType === 'wrath'));
    assert.deepEqual(spawnFighter(400, 1, caster).stats.power.loadout, original.stats.power.loadout);
  }
});

it('uses real reach and changes tiers without moving or resetting an active effect', () => {
  for (const item of galleryCatalog) {
    const scene = createScene({ ability: item.id });
    const [caster, target] = scene.fighters;
    const expected = item.kind === 'power' && !item.data.range ? galleryConfig.selfGap
      : Math.max(scene.range * galleryConfig.distanceRatio, item.data.around ? 0 : galleryConfig.minGap);
    const actual = item.data.around ? target.x - caster.x : target.left - caster.right;
    assert.ok(Math.abs(actual - expected) < 0.000001, item.id);
    scene.requestCast();
    step(scene, 1);
    const positions = scene.fighters.map(({ x, y }) => [x, y]);
    const time = caster.stateTime;
    const power = caster.combat.power;
    scene.changeSelection('tier', 3);
    assert.deepEqual(scene.fighters.map(({ x, y }) => [x, y]), positions);
    assert.equal(caster.stateTime, time);
    assert.equal(caster.combat.power, power);
    assert.equal(caster.flowLevel, 10);
    assert.equal(caster.stats.power.potency, 1.18);
  }
});

it('fully resets statuses, projectiles, buffers, movement and animation between cycles', () => {
  for (const item of galleryCatalog) {
    const scene = createScene({ ability: item.id });
    const baseline = scene.fighters.map((fighter) => structuredClone({ combat: fighter.combat, animation: fighter.animation, intent: fighter.intent }));
    scene.requestCast();
    step(scene, 35);
    for (const fighter of scene.fighters) {
      fighter.combat.focusTime = 5;
      fighter.combat.healTime = 4;
      fighter.combat.wrathTime = 3;
      fighter.combat.chokeTime = 2;
      fighter.combat.freezeTime = 1;
      fighter.combat.bufferedAction = 'heavyAttack';
      fighter.combat.saberThrown = true;
      fighter.health = 1;
      fighter.stamina = 1;
      fighter.vx = 123;
      fighter.vy = -123;
    }
    scene.reset();
    assert.equal(scene.simulation.projectiles.activeCount, 0);
    assert.equal(scene.simulation.events.length, 0);
    scene.fighters.forEach((fighter, index) => {
      assert.deepEqual({ combat: fighter.combat, animation: fighter.animation, intent: fighter.intent }, baseline[index]);
      assert.equal(fighter.health, fighter.stats.maxHealth);
      assert.equal(fighter.stamina, fighter.stats.maxStamina);
      assert.equal(fighter.flowMeter, fighter.stats.power.max);
      assert.equal(fighter.vx, 0);
      assert.equal(fighter.vy, 0);
      assert.equal(fighter.y, fighter.floorY);
    });
  }
});

it('waits for persistent effects and the configured delay before repeating', () => {
  const scene = createScene({ ability: 'wrath', repeat: true });
  let elapsed = 0;
  const starts = [];
  for (let index = 0; index < 430; index += 1) {
    elapsed += STEP;
    for (const event of step(scene)) if (event.type === 'powerStart') starts.push(elapsed);
  }
  assert.equal(starts.length, 2);
  assert.ok(starts[1] - starts[0] >= powersConfig.powers.wrath.startup + powersConfig.powers.wrath.duration + galleryConfig.cycleDelay);
});

it('validates and saves only gallery selection while preserving other settings and story', () => {
  let data = null;
  const storage = { getItem: () => data, setItem: (_, value) => { data = value; } };
  const story = { encounter: 'mine' };
  const defaults = { gallery: galleryConfig.defaults, sound: true, unlocks: {} };
  const director = new GalleryDirector(null, (selection) => saveSettings({ ...defaults, gallery: selection }, storage, 'test', story));
  director.select('ability', 'wrath');
  director.select('tier', 3);
  director.select('target', 'redirect');
  director.select('caster', 'wasp');
  director.select('repeat', false);
  assert.deepEqual(loadSettings(defaults, storage, 'test').gallery, director.selection);
  assert.deepEqual(JSON.parse(data).story, story);
  assert.deepEqual(JSON.parse(data).settings.unlocks, {});
  for (const invalid of [null, [], false, { ability: 'unknown', tier: -1, target: 'unknown', caster: 'unknown', repeat: 'yes' }, { tier: 1.5 }, { tier: 4 }]) {
    saveSettings({ ...defaults, gallery: invalid }, storage, 'test', story);
    assert.deepEqual(loadSettings(defaults, storage, 'test').gallery, galleryConfig.defaults);
  }
  assert.deepEqual(sanitizeGallery({ ability: 'wrath', caster: 'invalid' }), { ...galleryConfig.defaults, ability: 'wrath' });
});

it('runs repeated gallery cycles inside DuelState without results or leaking participant references', () => {
  const game = {
    settings: { powers: false, difficulty: 'normal', gallery: { ...galleryConfig.defaults, ability: 'lightning' } },
    input: { wasPressed: () => false, isDown: () => false, lastInputKind: 'keyboard' },
    audio: { isReady: false, play() {}, setMusicTension() {} },
    saveSettings() {},
    pushState() { assert.fail('gallery must not end a round'); },
  };
  const state = new DuelState(game, { mode: DuelMode.GALLERY });
  state.enter();
  for (let index = 0; index < 800; index += 1) state.update(STEP);
  assert.equal(state.outcome, null);
  assert.equal(state.roundNumber, 1);
  assert.equal(state.participants[0].fighter, state.fighters[0]);
  assert.equal(state.player, state.fighters[0]);
  assert.ok(state.fighters.every((fighter) => fighter.isAlive));
  state.exit();
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { computePose, createPose } from '../src/rendering/fighterPose.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';

const cleave = powersConfig.powers.flowCleave;

function setup(level) {
  const caster = spawnFighter(300, 1, 'guardian');
  const target = spawnFighter(1100, -1, 'shadow');
  caster.stats.flowLevel = level;
  caster.stats.power.loadout = { neutral: cleave };
  caster.flowMeter = 100;
  const simulation = createSimulation([caster, target], { powers: true });
  return { caster, target, simulation };
}

function run(s, frames) {
  const events = [];
  for (let frame = 0; frame < frames; frame += 1) {
    s.simulation.step(STEP);
    events.push(...s.simulation.events);
  }
  return events;
}

describe('flow cleave by tier', () => {
  it('raises the blade overhead in the startup and cuts down through the active', () => {
    const s = setup(6);
    assert.equal(s.simulation.combat.powers.tryCast(s.caster), true);
    s.caster.stateTime = cleave.startup;
    const raised = computePose(s.caster, createPose());
    assert.ok(Math.sin(raised.bladeAngle) < -0.3);
    s.caster.stateTime = cleave.startup + cleave.active;
    const cut = computePose(s.caster, createPose());
    assert.ok(Math.sin(cut.bladeAngle) > 0.5);
  });

  it('launches a larger wave at each tier', () => {
    const radii = [1, 3, 8, 10].map((level) => {
      const s = setup(level);
      s.simulation.combat.powers.tryCast(s.caster);
      run(s, Math.ceil(cleave.startup / STEP) + 1);
      return s.simulation.projectiles.pool.find((projectile) => projectile.active).radius;
    });
    for (let index = 1; index < radii.length; index += 1) assert.ok(radii[index] > radii[index - 1]);
  });

  it('cuts twice at the apex, down then up, with a wave each', () => {
    const s = setup(10);
    s.simulation.combat.powers.tryCast(s.caster);
    assert.equal(s.caster.combat.power.pose, 'cleaveDouble');
    const events = run(s, Math.ceil((cleave.startup + cleave.apex.active) / STEP) + 2);
    assert.equal(events.filter((event) => event.type === CombatEvent.POWER_ACTIVE && event.attacker === s.caster).length, 2);
    assert.equal(s.simulation.projectiles.pool.filter((projectile) => projectile.active).length, 2);
    s.caster.stateTime = cleave.startup + cleave.apex.active;
    assert.ok(Math.sin(computePose(s.caster, createPose()).bladeAngle) < -0.5);
  });

  it('cuts once below the apex', () => {
    const s = setup(8);
    s.simulation.combat.powers.tryCast(s.caster);
    const events = run(s, Math.ceil((cleave.startup + cleave.active + cleave.recovery) / STEP) + 2);
    assert.equal(events.filter((event) => event.type === CombatEvent.POWER_ACTIVE && event.attacker === s.caster).length, 1);
  });
});

describe('gallery descriptions', () => {
  it('describes every gallery item in both languages', async () => {
    const { galleryCatalog } = await import('../src/modes/galleryCatalog.js');
    const { ptBR } = await import('../src/config/locales/ptBR.js');
    const { en } = await import('../src/config/locales/en.js');
    for (const locale of [ptBR, en]) {
      for (const item of galleryCatalog) {
        const text = locale.ui.gallery.descriptions[item.id];
        assert.equal(typeof text, 'string', `${locale.id}/${item.id}`);
        assert.ok(text.length > 20 && text.length <= 100, `${locale.id}/${item.id}`);
      }
    }
  });
});

describe('wardrobe secret sound', () => {
  it('gives each secret reward its own unlock sound', async () => {
    const { secretsConfig } = await import('../src/config/secretsConfig.js');
    const { SoundName } = await import('../src/audio/soundNames.js');
    const { audioConfig } = await import('../src/config/audioConfig.js');
    const { balance, wardrobe } = secretsConfig.rewards;
    assert.equal(balance.sound, SoundName.SECRET);
    assert.equal(wardrobe.sound, SoundName.SECRET_WARDROBE);
    assert.notEqual(balance.sound, wardrobe.sound);
    assert.ok(audioConfig.sounds[wardrobe.sound].length > 0);
  });
});

describe('gallery sides', () => {
  it('labels every gallery category in both languages', async () => {
    const { galleryCatalog } = await import('../src/modes/galleryCatalog.js');
    const { ptBR } = await import('../src/config/locales/ptBR.js');
    const { en } = await import('../src/config/locales/en.js');
    const categories = new Set(galleryCatalog.map((item) => item.category));
    assert.deepEqual([...categories].sort(), ['aurora', 'blade', 'eclipse', 'flow']);
    for (const locale of [ptBR, en]) {
      for (const category of categories) assert.equal(typeof locale.ui.gallery.categories[category], 'string', `${locale.id}/${category}`);
    }
  });
});

describe('choke tremble', () => {
  it('shakes the choked victim and keeps the choking caster steady', async () => {
    const { FighterState } = await import('../src/entities/fighterStates.js');
    const victim = spawnFighter(600, -1, 'guardian');
    victim.restartState(FighterState.STUNNED);
    victim.combat.chokeTime = 1;
    victim.stateTime = 0.5;
    const leans = [0, 0.02, 0.04].map((time) => {
      victim.animation.time = time;
      return computePose(victim, createPose()).shoulderX;
    });
    assert.ok(new Set(leans.map((value) => value.toFixed(3))).size > 1);
    const caster = spawnFighter(300, 1, 'shadow');
    caster.combat.power = powersConfig.powers.choke;
    caster.combat.powerEndTime = 0;
    caster.state = FighterState.CHANNELING;
    caster.stateTime = 0.8;
    const steady = [0, 0.02, 0.04].map((time) => {
      caster.stateTime = 0.8 + time;
      return computePose(caster, createPose()).shoulderX.toFixed(4);
    });
    assert.equal(new Set(steady).size, 1);
  });
});

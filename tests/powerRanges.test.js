import { it } from 'node:test';
import assert from 'node:assert/strict';
import { characters } from '../src/characters/characterData.js';
import { createFighterFromCharacter } from '../src/characters/characterFactory.js';
import { createProtagonistCharacter } from '../src/characters/protagonist.js';
import { getPowerRange, isInPowerRange } from '../src/combat/PowerSystem.js';
import { EnemyAI, AiDecision } from '../src/ai/EnemyAI.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { attributesConfig } from '../src/config/attributesConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { projectilesConfig } from '../src/config/projectilesConfig.js';
import { storyConfig } from '../src/config/storyConfig.js';
import { galleryConfig } from '../src/config/galleryConfig.js';
import { GalleryDirector } from '../src/modes/GalleryDirector.js';
import { GalleryScene } from '../src/modes/GalleryScene.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';

function ratedFighter(blade, facing = 1) {
  return createFighterFromCharacter({ ...characters.guardian, potential: 3,
    attributes: { ...characters.guardian.attributes, blade } }, { x: facing === 1 ? 200 : 1080, y: 600, facing });
}

function createAI(self, opponent) {
  return new EnemyAI({ self, opponent, rules: { powers: true }, random: () => 0,
    profile: { ...aiConfig.profiles.balanced, techniqueChance: 1, powerChance: 1 },
    difficulty: { ...aiConfig.difficulties.hard, specialMultiplier: 1, powerMultiplier: 1 },
    perception: aiConfig.perception });
}

it('derives saber throw range for all ratings, clamps at both limits and preserves base data', () => {
  const before = structuredClone(characters.guardian);
  assert.deepEqual(attributesConfig.saberThrow, { baseRange: 380, rangePerRating: 20, minRange: 320, maxRange: 460 });
  assert.deepEqual(Array.from({ length: 10 }, (_, index) => ratedFighter(index + 1).moves.saberThrow.throwRange),
    [320, 340, 360, 380, 400, 420, 440, 460, 460, 460]);
  assert.deepEqual(characters.guardian, before);
  assert.equal('range' in projectilesConfig.saber, false);
  assert.equal('reach' in ratedFighter(4).moves.saberThrow.hitbox, false);
  assert.equal('throwRange' in ratedFighter(4).moves.heavy, false);
});

it('derives the same range for the Story protagonist at every campaign blade rating', () => {
  for (let blade = 1; blade <= 7; blade += 1) {
    const profile = { name: 'Pilot', style: 'technique', alignment: 'dark', attributes: { ...storyConfig.startAttributes, blade } };
    const fighter = createFighterFromCharacter(createProtagonistCharacter(profile, storyConfig), { x: 200, y: 600, facing: 1 });
    assert.equal(fighter.moves.saberThrow.throwRange, ratedFighter(blade).moves.saberThrow.throwRange);
  }
});

for (const blade of [1, 4, 7, 10]) {
  for (const facing of [-1, 1]) {
    it(`travels to the derived range and returns to the owner at blade ${blade}, facing ${facing}`, () => {
      const owner = ratedFighter(blade, facing);
      const simulation = createSimulation([owner], { powers: true });
      const system = simulation.projectiles;
      system.fighters = simulation.fighters;
      system.spawnSaber(owner, 'saberThrow');
      const projectile = system.pool.find((entry) => entry.active);
      const range = owner.moves.saberThrow.throwRange;
      let farthest = 0;
      let returned = false;
      for (let step = 0; step < 120 && projectile.active; step += 1) {
        const distance = Math.abs(projectile.x - projectile.originX);
        farthest = Math.max(farthest, distance);
        system.update(simulation.fighters, STEP);
        if (!returned && projectile.returning) {
          assert.ok(distance >= range && distance < range + projectilesConfig.saber.speed * STEP);
          returned = true;
        }
      }
      assert.ok(returned);
      assert.ok(farthest >= range && farthest < range + projectilesConfig.saber.speed * STEP);
      assert.equal(projectile.active, false);
      assert.equal(owner.combat.saberThrown, false);
    });
  }
}

it('requests a saber throw inside the extended range and rejects the AI safety boundary', () => {
  for (const blade of [1, 4, 7, 10]) {
    const self = ratedFighter(blade);
    self.stats.techniques = { back: 'saberThrow' };
    const opponent = spawnFighter(800, -1, 'shadow');
    const ai = createAI(self, opponent);
    const gap = self.moves.saberThrow.throwRange - aiConfig.perception.reachMargin;
    opponent.x = self.x + (self.width + opponent.width) / 2 + gap;
    assert.equal(ai.tryTechnique(), null);
    opponent.x -= 1;
    assert.equal(ai.tryTechnique(), AiDecision.TECHNIQUE);
    ai.writeIntent(self.intent);
    assert.equal(self.intent.special, true);
  }
});

for (const [level, range] of [[1, 330], [2, 330], [3, 380], [4, 380], [5, 380], [6, 380], [7, 380], [8, 430], [9, 430], [10, 480]]) {
  it(`uses pull range ${range} at level ${level} for detection, aim and AI`, () => {
    const caster = spawnFighter(200);
    const target = spawnFighter(800, -1, 'shadow');
    caster.stats.flowLevel = target.stats.flowLevel = level;
    caster.stats.power.loadout = { neutral: powersConfig.powers.pull };
    caster.flowMeter = 100;
    const simulation = createSimulation([caster, target], { powers: true });
    const power = powersConfig.powers.pull;
    assert.equal(getPowerRange(caster, power), range);
    target.x = caster.x + (caster.width + target.width) / 2 + range;
    assert.equal(isInPowerRange(caster, target, power), true);
    target.x += 0.01;
    assert.equal(isInPowerRange(caster, target, power), false);
    const ai = createAI(caster, target);
    assert.equal(ai.tryPower(), null);
    target.x -= 0.01;
    assert.equal(ai.tryPower(), AiDecision.POWER);
    caster.stats.power.potency = 1;
    simulation.combat.powers.affect(caster, target, power, 'active');
    assert.equal(target.vx, -Math.min(1100, Math.sqrt(2 * simulation.combat.powers.friction * (range - 30))));
    assert.equal(target.health, target.stats.maxHealth - power.damage);
    assert.equal(power.endGap, 30);
    assert.equal(power.maxSpeed, 1100);
    target.x += 0.01;
    const health = target.health;
    simulation.combat.powers.affect(caster, target, power, 'active');
    assert.equal(target.health, health);
    assert.equal(caster.combat.powerTargetX, caster.x + caster.width / 2 + range);
    for (const facing of [-1, 1]) {
      caster.facing = facing;
      simulation.combat.powers.aim(caster, null, power);
      assert.equal(caster.combat.powerTargetX, caster.x + facing * (caster.width / 2 + range));
    }
  });
}

it('preserves constant power ranges, radial detection and powers without a range', () => {
  const caster = spawnFighter(200);
  const target = spawnFighter(440, -1, 'shadow');
  target.y += (target.height - caster.height) / 2;
  for (const power of Object.values(powersConfig.powers)) {
    if (power.id !== 'pull') assert.equal(getPowerRange(caster, power), power.range);
  }
  assert.equal(isInPowerRange(caster, target, powersConfig.powers.storm), true);
  target.x += 0.01;
  assert.equal(isInPowerRange(caster, target, powersConfig.powers.storm), false);
});

it('shows and places gallery demonstrations using the real tier and caster ranges', () => {
  for (const ability of ['pull', 'saberThrow']) {
    for (const caster of ['guardian', 'forge']) {
      const director = new GalleryDirector({ ...galleryConfig.defaults, ability, caster, repeat: false });
      const simulation = createSimulation([spawnFighter(400), spawnFighter(700, -1, 'shadow')], { powers: true });
      const scene = new GalleryScene(director, simulation);
      for (let tier = 0; tier < galleryConfig.levels.length; tier += 1) {
        scene.changeSelection('tier', tier);
        const expected = ability === 'pull' ? [330, 380, 430, 480][tier] : 380 + (characters[caster].attributes.blade - 4) * 20;
        assert.equal(scene.range, expected);
        assert.equal(scene.gap, expected * galleryConfig.distanceRatio);
        scene.reset();
        const [left, right] = scene.fighters;
        assert.ok(Math.abs(right.x - left.x - (left.width + right.width) / 2 - scene.gap) < 1e-8);
      }
    }
  }
});

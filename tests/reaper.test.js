import { it } from 'node:test';
import assert from 'node:assert/strict';
import { characters } from '../src/characters/characterData.js';
import { fighterArchetypes } from '../src/config/fightersConfig.js';
import { movesByCharacter } from '../src/config/movesConfig.js';
import { colors } from '../src/config/themeConfig.js';
import { ptBR } from '../src/config/locales/ptBR.js';
import { en } from '../src/config/locales/en.js';
import { getAttackHitbox, createBox } from '../src/combat/hitboxes.js';
import { createFighter } from '../src/characters/characterFactory.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';

it('creates the common Eclipse reaper from the heron archetype and the specified loadout', () => {
  const data = characters.reaper;
  const fighter = spawnFighter(500, 1, 'reaper');
  assert.deepEqual(fighterArchetypes.reaper, fighterArchetypes.heron);
  assert.notEqual(fighterArchetypes.reaper, fighterArchetypes.heron);
  assert.deepEqual(data.attributes, { health: 5, stamina: 6, blade: 6, defense: 3, agility: 6, flow: 4 });
  assert.equal(data.selectable, true);
  assert.equal(data.secret, undefined);
  assert.equal(data.alignment, 'dark');
  assert.equal(data.powerSlots, 3);
  assert.equal(data.aiProfile, 'reaper');
  assert.deepEqual(data.loadout, { powers: { neutral: 'push', forward: 'pull', back: 'wrath' }, techniques: { forward: 'dashSlash' } });
  assert.deepEqual(Object.keys(fighter.stats.power.loadout).sort(), ['back', 'forward', 'neutral']);
  assert.equal(fighter.moves.spin, undefined);
  assert.equal(fighter.stats.movement.maxJumps, 2);
  assert.equal(fighter.stats.dodge.passThrough, true);
  assert.ok(fighter.stats.wallJump);
  assert.equal(data.sound.humFrequency, 66);
});

it('keeps the heron moves except the three light poses, finisher and Twin Wheel', () => {
  const expected = structuredClone(movesByCharacter.heron);
  expected.light2.pose = 'light';
  Object.assign(expected.light3, { knockback: 320, hitstun: 0.4 });
  expected.special = { attack: 'heavy', type: 'heavy', pose: 'twinWheel', cancelsInto: [], damage: 14,
    staminaCost: 24, startup: 0.24, active: 0.16, recovery: 0.44, lunge: 60, knockback: 280,
    hitbox: { reach: 66, top: 0.85, bottom: 0.3, around: true } };
  assert.deepEqual(movesByCharacter.reaper, expected);
  assert.equal(spawnFighter(500, 1, 'reaper').moves.special.damage, 16.24);
});

it('uses the existing palette and twin blade data and keeps skins cosmetic', () => {
  const fighter = spawnFighter(500, 1, 'reaper');
  assert.equal(fighter.appearance.motion, 'reaper');
  assert.equal(fighter.appearance.saberColor, colors.reaperSaber);
  assert.equal(fighter.appearance.cloakColor, colors.reaperCloak);
  assert.equal(fighter.appearance.bodyColor, colors.reaperBody);
  assert.equal(fighter.appearance.trimColor, colors.reaperTrim);
  assert.deepEqual(fighter.appearance.dualBlade, { angleOffsetDegrees: 180, lengthScale: 1, offsetX: 0, offsetY: 0 });
  assert.equal(fighter.appearance.bladeLength, 70);
  for (const skin of ['skin-arcade', 'skin-story']) {
    const dressed = createFighter('reaper', { x: 500, y: 600, facing: 1 }, { skin });
    assert.deepEqual(dressed.stats, fighter.stats);
    assert.deepEqual(dressed.moves, fighter.moves);
    assert.deepEqual(dressed.appearance.dualBlade, fighter.appearance.dualBlade);
  }
  assert.deepEqual(characters.reaper.altSaberColors.map(({ color, challenge }) => ({ color, challenge })), [
    { color: colors.reaperSaberArcade, challenge: null },
    { color: colors.reaperSaberChallenge, challenge: { stat: 'longestChain', target: 5, text: 'vença com uma sequência de 5 acertos' } },
  ]);
  assert.equal(ptBR.characters.reaper.name, 'Ceifador');
  assert.equal(en.characters.reaper.name, 'Reaper');
  assert.equal(ptBR.characters.reaper.info.ability, 'Roda Dupla: gira a lâmina dupla e acerta à frente e atrás');
  assert.equal(en.characters.reaper.info.ability, 'Twin Wheel: spins the twin blade and hits front and back');
});

for (const facing of [-1, 1]) {
  for (const side of [-1, 1]) {
    for (const dualBlade of [true, false]) {
      it(`Twin Wheel hits once on side ${side}, facing ${facing}, drawn twin blade ${dualBlade}`, () => {
        const attacker = spawnFighter(500, facing, 'reaper');
        const target = spawnFighter(500 + side * 75, -side);
        if (!dualBlade) attacker.appearance.dualBlade = null;
        const simulation = createSimulation([attacker, target]);
        assert.ok(simulation.combat.tryAttack(attacker, 'special'));
        attacker.stateTime = attacker.moves.special.startup;
        const health = target.health;
        simulation.combat.resolveHits([attacker, target]);
        assert.equal(target.health, health - attacker.moves.special.damage);
        simulation.combat.resolveHits([attacker, target]);
        assert.equal(target.health, health - attacker.moves.special.damage);
      });
    }
  }
  it(`the second rendered blade adds no rear hitbox to normal attacks, facing ${facing}`, () => {
    const attacker = spawnFighter(500, facing, 'reaper');
    const target = spawnFighter(500 - facing * 75, facing);
    const simulation = createSimulation([attacker, target]);
    const dualBlade = attacker.appearance.dualBlade;
    for (const id of ['light', 'light2', 'light3', 'heavy']) {
      attacker.appearance.dualBlade = dualBlade;
      attacker.stamina = attacker.stats.maxStamina;
      simulation.combat.tryAttack(attacker, id);
      attacker.stateTime = attacker.moves[id].startup;
      const health = target.health;
      simulation.combat.resolveHits([attacker, target]);
      assert.equal(target.health, health);
      const box = getAttackHitbox(attacker, attacker.moves[id], createBox());
      attacker.appearance.dualBlade = null;
      assert.deepEqual(getAttackHitbox(attacker, attacker.moves[id], createBox()), box);
    }
  });
}

it('starts Twin Wheel from the ability action without directional technique routing', () => {
  const attacker = spawnFighter(500, 1, 'reaper');
  const simulation = createSimulation([attacker, spawnFighter(1000, -1)], { powers: true });
  attacker.intent.special = true;
  simulation.step(STEP);
  assert.equal(attacker.combat.attackType, 'special');
  assert.equal(attacker.combat.attack.pose, 'twinWheel');
});

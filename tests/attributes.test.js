import { it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { attributesConfig } from '../src/config/attributesConfig.js';
import { fighterArchetypes } from '../src/config/fightersConfig.js';
import { characters } from '../src/characters/characterData.js';
import { createFighter } from '../src/characters/characterFactory.js';
import { applyAttributes } from '../src/characters/attributes.js';
import { convertLegacyPoints, convertLegacyRating, convertLegacyRatings } from '../src/utils/legacyRatings.js';
import { evadeConfig } from '../src/config/evadeConfig.js';
import { CombatSystem } from '../src/combat/CombatSystem.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { arena, combatConfig } from './helpers.js';

const spawn = { x: 400, y: 600, facing: 1 };
const legacy = JSON.parse(readFileSync(new URL('./fixtures/stats-v1.3.json', import.meta.url), 'utf8'));

function base(id = 'guardian') {
  const fighter = createFighter(id, spawn);
  const scalars = attributesConfig.bases[id];
  const stats = fighterArchetypes[id];
  return { ...stats, ...scalars, movement: { ...stats.movement, ...scalars.movement }, stamina: { ...stats.stamina, ...scalars.stamina }, dodge: { ...stats.dodge, ...scalars.dodge }, parry: { ...stats.parry, ...scalars.parry }, evade: evadeConfig.profile, attacks: fighter.moves };
}

it('preserves every legacy scalar, move damage and reserved flow without changing current combat', () => {
  for (const [id, expected] of Object.entries(legacy)) {
    const fighter = createFighter(id, spawn);
    const stats = fighter.stats;
    for (const [key, value] of Object.entries(expected)) {
      if (key === 'movement') {
        const { maxJumps, airJumpVelocityScale, ...scalars } = stats.movement;
        const { maxJumps: legacyJumps, airJumpVelocityScale: legacyScale, ...legacyScalars } = value;
        assert.deepEqual(scalars, legacyScalars, `${id}.movement`);
      } else if (key !== 'damage') assert.deepEqual(stats[key], value, `${id}.${key}`);
    }
    for (const [move, damage] of Object.entries(expected.damage)) assert.equal(fighter.moves[move].damage, damage, `${id}.${move}`);
    assert.equal(stats.evade.invulnerableTime, evadeConfig.profile.invulnerableTime);
    assert.equal(stats.guardBreakThreshold, 0);
    assert.equal(fighter.flowLevel, characters[id].attributes.flow);
    assert.equal('maxHealth' in fighterArchetypes[id], false);
    assert.equal('damage' in fighterArchetypes[id].attacks.light, false);
  }
});

it('applies the rating table at every level and changes only the relevant attribute stats', () => {
  const original = base();
  const defaults = attributesConfig.defaults;
  const normal = applyAttributes(original, defaults, attributesConfig);
  for (let rating = 1; rating <= 10; rating++) {
    const multiplier = attributesConfig.multipliers[rating];
    const rated = applyAttributes(original, { ...defaults, health: rating, stamina: rating, blade: rating, defense: rating, agility: rating, flow: rating }, attributesConfig, { potential: Math.max(0, rating - attributesConfig.maxRating) });
    assert.ok(Math.abs(rated.maxHealth - normal.maxHealth * multiplier) < 1e-8);
    assert.ok(Math.abs(rated.stamina.regenPerSecond - normal.stamina.regenPerSecond * multiplier) < 1e-8);
    assert.ok(Math.abs(rated.attacks.heavy.damage - normal.attacks.heavy.damage * multiplier) < 1e-8);
    assert.ok(Math.abs(rated.movement.walkSpeed - normal.movement.walkSpeed * multiplier) < 1e-8);
    assert.ok(Math.abs(rated.dodge.speed - normal.dodge.speed * multiplier) < 1e-8);
    assert.ok(Math.abs(rated.evade.invulnerableTime - normal.evade.invulnerableTime * multiplier) < 1e-8);
    assert.ok(Math.abs(rated.blockStaminaScale - normal.blockStaminaScale / multiplier) < 1e-8);
    assert.equal(rated.flowLevel, rating);
    assert.equal(rated.attacks.heavy.startup, normal.attacks.heavy.startup);
  }
});

it('rejects invalid ratings including eight without potential and leaves base and ratings untouched', () => {
  const original = base();
  const before = structuredClone(original);
  const ratings = { ...attributesConfig.defaults };
  applyAttributes(original, ratings, attributesConfig);
  assert.deepEqual(original, before);
  assert.deepEqual(ratings, attributesConfig.defaults);
  for (const rating of [0, 8, 2.5, NaN, '5']) assert.throws(() => applyAttributes(original, { health: rating }, attributesConfig), RangeError);
  assert.equal(applyAttributes(original, {}, attributesConfig).attributes.health, attributesConfig.baseRating);
});

it('defense affects guard reserve and pushback while damage received remains unchanged', () => {
  const attacker = createFighter('guardian', spawn);
  const defender = createFighter('guardian', { ...spawn, x: 470, facing: -1 });
  const combat = new CombatSystem(arena, combatConfig);
  const contact = { attacker, defender, attack: attacker.moves.heavy, attackType: 'heavy', x: 450, y: 500 };
  defender.stats = applyAttributes(base(), { ...characters.guardian.attributes, defense: 1 }, attributesConfig);
  const cost = contact.attack.blockStaminaCost * defender.stats.blockStaminaScale;
  defender.stamina = cost + defender.stats.guardBreakThreshold - 0.1;
  defender.setState(FighterState.BLOCKING);
  combat.resolveBlock(contact);
  assert.equal(defender.state, FighterState.STUNNED);
  const health = defender.health;
  combat.applyHit(contact);
  assert.equal(defender.health, health - contact.attack.damage);
  const strong = applyAttributes(base(), { ...characters.guardian.attributes, defense: 7 }, attributesConfig);
  assert.ok(strong.blockPushbackScale < defender.stats.blockPushbackScale);
});

it('changing flow alone has no combat effects and agility scales special movement', () => {
  const original = base('heron');
  const ratings = characters.heron.attributes;
  const normal = applyAttributes(original, ratings, attributesConfig);
  const flow = applyAttributes(original, { ...ratings, flow: 1 }, attributesConfig);
  const { flowLevel, attributes, ...physical } = flow;
  const { flowLevel: oldLevel, attributes: oldRatings, ...expected } = normal;
  assert.deepEqual(physical, expected);
  const slow = applyAttributes(original, { ...ratings, agility: 1 }, attributesConfig);
  assert.ok(slow.attacks.special.leap.speedY < normal.attacks.special.leap.speedY);
  assert.ok(slow.wallJump.speed < normal.wallJump.speed);
});

it('converts legacy 1-9 ratings with one rule that keeps every flow difference of the roster', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 8, 9].map((rating) => convertLegacyRating('health', rating, attributesConfig)), [1, 2, 3, 3, 4, 5, 6, 6, 7]);
  assert.deepEqual([1, 3, 4, 5, 6, 7, 8].map((rating) => convertLegacyRating('flow', rating, attributesConfig)), [1, 2, 3, 4, 5, 6, 7]);
  assert.deepEqual(convertLegacyRatings({ health: 9, flow: 8 }, attributesConfig, 5), { health: 5, flow: 5 });
  assert.deepEqual([0, 1, 2, 3, 4].map((points) => convertLegacyPoints(points, attributesConfig)), [0, 1, 2, 2, 3]);
  for (const character of Object.values(characters).filter((entry) => !entry.secret)) {
    assert.ok(Object.values(character.attributes).every((value) => value >= attributesConfig.minRating && value <= attributesConfig.maxRating), character.id);
  }
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AiDecision, EnemyAI } from '../src/ai/EnemyAI.js';
import { characters } from '../src/characters/characterData.js';
import { createFighter, createFighterFromCharacter } from '../src/characters/characterFactory.js';
import { findLoadoutProblems, getAbilityCategory } from '../src/characters/powers.js';
import { createProtagonistCharacter } from '../src/characters/protagonist.js';
import { selectTechnique } from '../src/combat/PowerSystem.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { attributesConfig } from '../src/config/attributesConfig.js';
import { bladeTechniques } from '../src/config/movesConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { storyConfig } from '../src/config/storyConfig.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { STEP, createSimulation, repeat, spawnFighter } from './helpers.js';

function special(simulation, fighter, moveX = 0) {
  fighter.intent.moveX = moveX;
  fighter.intent.special = true;
  simulation.step(STEP);
  fighter.intent.special = false;
  fighter.intent.moveX = 0;
  return simulation.events.map((event) => event);
}

describe('ability catalog', () => {
  it('puts every ability in exactly one category opened by alignment', () => {
    const ids = Object.values(powersConfig.categories).flatMap((category) => category.abilities);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of Object.keys(powersConfig.powers)) assert.ok(getAbilityCategory(id, powersConfig), id);
    for (const id of Object.keys(bladeTechniques)) assert.equal(getAbilityCategory(id, powersConfig), 'blade');
    assert.deepEqual(powersConfig.categories.aurora.alignments, ['light']);
    assert.deepEqual(powersConfig.categories.eclipse.alignments, ['dark']);
  });

  it('gives every character a loadout its alignment allows', () => {
    for (const character of Object.values(characters)) {
      assert.deepEqual(findLoadoutProblems(character.loadout, character.alignment, powersConfig, bladeTechniques), [], character.id);
      assert.ok(character.loadout.powers.neutral, character.id);
    }
    assert.deepEqual(findLoadoutProblems({ powers: { neutral: 'lightning' } }, 'light', powersConfig, bladeTechniques), ['powers.neutral: lightning needs another alignment']);
    assert.deepEqual(findLoadoutProblems({ techniques: { back: 'unknown' } }, 'dark', powersConfig, bladeTechniques), ['techniques.back: unknown unknown']);
  });

  it('builds the protagonist loadout from the path and the style', () => {
    const profile = { name: 'Kael', alignment: 'dark', style: 'fury', saberColor: '#7fe4ff', attributes: storyConfig.startAttributes };
    const character = createProtagonistCharacter(profile, storyConfig, ['neutral']);
    assert.deepEqual(character.loadout.powers, storyConfig.protagonist.loadouts.dark);
    assert.deepEqual(character.loadout.techniques, characters.shadow.loadout.techniques);
    const fighter = createFighterFromCharacter(character, { x: 0, y: 0, facing: 1 });
    assert.deepEqual(Object.keys(fighter.stats.power.loadout), ['neutral']);
    assert.ok(fighter.moves.dashSlash);
  });
});

describe('blade techniques', () => {
  it('pick the technique by direction and keep the own ability on neutral or an empty slot', () => {
    const fighter = spawnFighter(400, 1, 'guardian');
    assert.equal(selectTechnique(fighter), null);
    fighter.intent.moveX = 1;
    assert.equal(selectTechnique(fighter), 'dashSlash');
    fighter.intent.moveX = -1;
    assert.equal(selectTechnique(fighter), 'saberThrow');
    const bastion = spawnFighter(400, 1, 'bastion');
    bastion.intent.moveX = 1;
    assert.equal(selectTechnique(bastion), null);
  });

  it('scale damage with the blade rating', () => {
    const base = bladeTechniques.dashSlash.damage;
    const fighter = createFighter('guardian', { x: 0, y: 0, facing: 1 });
    assert.ok(Math.abs(fighter.moves.dashSlash.damage - base * attributesConfig.multipliers[characters.guardian.attributes.blade]) < 1e-9);
    const strong = createFighterFromCharacter({ ...characters.guardian, attributes: { ...characters.guardian.attributes, blade: 7 } }, { x: 0, y: 0, facing: 1 });
    assert.ok(strong.moves.dashSlash.damage > fighter.moves.dashSlash.damage);
  });

  it('only work with the power rules; the classic rules keep the own ability', () => {
    for (const rules of [{}, { powers: true }]) {
      const fighter = spawnFighter(400, 1, 'guardian');
      const opponent = spawnFighter(900, -1, 'shadow');
      const simulation = createSimulation([fighter, opponent], rules);
      const events = special(simulation, fighter, 1);
      const start = events.find((event) => event.type === CombatEvent.ATTACK_START);
      assert.equal(start.attackType, rules.powers ? 'dashSlash' : 'special');
    }
  });

  it('dash and slash rushes forward and hits', () => {
    const fighter = spawnFighter(400, 1, 'guardian');
    const opponent = spawnFighter(640, -1, 'bastion');
    const simulation = createSimulation([fighter, opponent], { powers: true });
    special(simulation, fighter, 1);
    assert.equal(fighter.state, FighterState.HEAVY_ATTACK);
    let hit = false;
    repeat(40, () => {
      simulation.step(STEP);
      hit ||= simulation.events.some((event) => event.type === CombatEvent.HIT && event.attackType === 'dashSlash');
    });
    assert.ok(hit);
  });

  it('spin hits an opponent behind', () => {
    const fighter = spawnFighter(600, 1, 'shadow');
    const opponent = spawnFighter(540, 1, 'bastion');
    const simulation = createSimulation([fighter, opponent], { powers: true });
    special(simulation, fighter, -1);
    let hit = false;
    repeat(40, () => {
      simulation.step(STEP);
      hit ||= simulation.events.some((event) => event.type === CombatEvent.HIT && event.attackType === 'spin');
    });
    assert.ok(hit);
  });

  it('are used by the AI with the power rules only', () => {
    const self = spawnFighter(600, -1, 'guardian');
    const opponent = spawnFighter(470, 1, 'shadow');
    const make = (rules) => new EnemyAI({ self, opponent, profile: { ...aiConfig.profiles.guardian, techniqueChance: 10, priorities: ['special'] }, difficulty: { ...aiConfig.difficulties.hard, mistakeChance: 0 }, perception: aiConfig.perception, random: () => 0, rules });
    const ai = make({ powers: true });
    ai.think();
    assert.equal(ai.decision, AiDecision.TECHNIQUE);
    ai.writeIntent(self.intent);
    assert.equal(self.intent.special, true);
    assert.equal(Math.sign(self.intent.moveX), -1);
    const classic = make({});
    classic.think();
    assert.notEqual(classic.decision, AiDecision.TECHNIQUE);
  });
});

describe('technique names', () => {
  it('names every blade technique in the training frame data', async () => {
    const { texts } = await import('../src/config/uiConfig.js');
    for (const id of Object.keys(bladeTechniques)) {
      assert.equal(typeof texts.training.attacks[id], 'string', id);
      assert.equal(typeof texts.powers[id], 'string', id);
    }
  });
});

import { it } from 'node:test';
import assert from 'node:assert/strict';
import { characters } from '../src/characters/characterData.js';
import { createFighterFromCharacter } from '../src/characters/characterFactory.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { createSimulation, spawnFighter, arena } from './helpers.js';

function setup(rules = { bladeLock: true }) {
  const fighters = [spawnFighter(500, 1), spawnFighter(580, -1)];
  const simulation = createSimulation(fighters, rules);
  fighters.forEach((fighter) => {
    fighter.combat.attack = fighter.moves.heavy;
    fighter.combat.attackType = 'heavy';
    fighter.restartState(FighterState.HEAVY_ATTACK);
    fighter.stateTime = fighter.moves.heavy.startup;
  });
  return { fighters, simulation };
}

it('resolves blade lock eligibility in move data without inheriting it into techniques', () => {
  for (const character of Object.values(characters)) {
    const fighter = createFighterFromCharacter(character, { x: 500, y: arena.floorY, facing: 1 });
    for (const [id, move] of Object.entries(fighter.moves)) {
      assert.equal(move.bladeLock === true, ['heavy', 'forwardHeavy'].includes(id), `${character.id}/${id}`);
    }
  }
  const character = { ...characters.guardian, moves: { ...characters.guardian.moves,
    heavy: { ...characters.guardian.moves.heavy, bladeLock: false },
    special: { ...characters.guardian.moves.special, bladeLock: true } } };
  const fighter = createFighterFromCharacter(character, { x: 500, y: arena.floorY, facing: 1 });
  assert.equal(fighter.moves.heavy.bladeLock, false);
  assert.equal(fighter.moves.special.bladeLock, true);
});

it('enters symmetrically only on overlapping active eligible blades', () => {
  const { fighters: [a, b], simulation } = setup();
  simulation.combat.tryClash(a, b);
  assert.equal(a.state, FighterState.BLADE_LOCK);
  assert.equal(b.state, FighterState.BLADE_LOCK);
  assert.equal(a.combat.lockOpponent, 1);
  assert.equal(b.combat.lockOpponent, 0);
  assert.equal(b.x - a.x, 70);
  assert.equal(a.vx, 0);
  assert.equal(b.vx, 0);
  assert.equal(a.facing, 1);
  assert.equal(b.facing, -1);
  assert.equal(simulation.events.some((event) => event.type === CombatEvent.CLASH), false);
});

it('keeps the short clash for every excluded entry condition', () => {
  const exclusions = [
    ({ simulation }) => { simulation.combat.rules.bladeLock = false; },
    ({ fighters }) => { fighters[0].grounded = false; },
    ({ fighters }) => { fighters[1].combat.attack = { ...fighters[1].moves.heavy, bladeLock: false }; },
    ({ fighters }) => { fighters[0].combat.lockCooldown = 0.01; },
    ({ fighters }) => { fighters[1].combat.chokeTime = 1; },
    ...['choke', 'storm', 'lightning'].map((effect) => ({ fighters }) => { fighters[0].combat.power = { effect }; }),
    ({ simulation }) => { Object.assign(simulation.projectiles.pool[0], { active: true, owner: 0 }); },
    ({ simulation }) => { Object.assign(simulation.projectiles.pool[0], { active: true, owner: 1 }); },
  ];
  for (const exclude of exclusions) {
    const fixture = setup();
    exclude(fixture);
    fixture.simulation.combat.tryClash(...fixture.fighters);
    assert.equal(fixture.fighters[0].state, FighterState.HIT);
    assert.equal(fixture.fighters[1].state, FighterState.HIT);
    assert.equal(fixture.simulation.events[0].type, CombatEvent.CLASH);
  }
});

it('does not start before active contact or with separated hitboxes', () => {
  for (const change of [(a) => { a.stateTime = 0; }, (a) => { a.x = 100; }]) {
    const { fighters: [a, b], simulation } = setup();
    change(a);
    simulation.combat.tryClash(a, b);
    assert.equal(a.combat.lockOpponent, -1);
    assert.equal(simulation.events.length, 0);
  }
});

it('places the pair inside either arena edge and clears round state', () => {
  for (const x of [arena.left + 23, arena.right - 103]) {
    const { fighters: [a, b], simulation } = setup();
    a.x = x;
    b.x = x + 80;
    simulation.combat.tryClash(a, b);
    assert.ok(a.left >= arena.left && b.right <= arena.right);
    for (const fighter of [a, b]) {
      fighter.resetForRound(500, 1);
      assert.equal(fighter.combat.lockOpponent, -1);
      assert.equal(fighter.combat.lockTime, 0);
      assert.equal(fighter.combat.lockPresses, 0);
      assert.equal(fighter.combat.lockCooldown, 0);
    }
  }
});

import { it } from 'node:test';
import assert from 'node:assert/strict';
import { powersConfig } from '../src/config/powersConfig.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { findStormEscapeX } from '../src/ai/perception.js';
import { captureFighter, restoreFighter } from '../src/simulation/ReplayBuffer.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { spawnFighter, createSimulation } from './helpers.js';

function setup(reversed = false) {
  const caster = spawnFighter(500), target = spawnFighter(800, -1);
  for (const fighter of [caster, target]) fighter.stats = { ...fighter.stats, flowLevel: 6, power: { ...fighter.stats.power, potency: 1 } };
  const fighters = reversed ? [target, caster] : [caster, target];
  const simulation = createSimulation(fighters, { powers: true });
  simulation.projectiles.fighters = fighters;
  const power = { ...powersConfig.powers.fracture, id: 'storm', range: powersConfig.powers.fracture.segmentLength * 3 };
  return { caster, target, fighters, simulation, power, fractures: simulation.combat.powers.fractures };
}

for (const reversed of [false, true]) {
  it('advances simultaneous bounded fractures with one contact per group, reversed ' + reversed, () => {
    const s = setup(reversed);
    for (const direction of [-1, 1]) s.fractures.launchAt(s.caster, s.target, s.power, s.target.x, direction, 0);
    assert.equal(s.caster.combat.fractures.length, 2);
    const [left, right] = s.caster.combat.fractures;
    assert.equal(left.segments.at(-1).left, s.target.x - s.power.range);
    assert.equal(right.segments.at(-1).right, s.target.x + s.power.range);
    left.time = right.time = s.power.fractureWarning;
    s.fractures.advance(s.caster, s.target, left);
    assert.equal(s.target.health, s.target.stats.maxHealth - s.power.damage);
    s.target.grounded = true;
    s.fractures.advance(s.caster, s.target, right);
    assert.equal(s.target.health, s.target.stats.maxHealth - s.power.damage);
    assert.equal(s.caster.combat.stormFractureHits[0], true);
    assert.ok(s.simulation.events.filter(event => event.type === CombatEvent.FRACTURE_BURST).every(event => event.attackType === 'storm'));
    s.fractures.launchAt(s.caster, s.target, s.power, s.target.x, 1, 1);
    const next = s.caster.combat.fractures.at(-1);
    next.time = s.power.fractureWarning;
    s.fractures.advance(s.caster, s.target, next);
    assert.equal(s.target.health, s.target.stats.maxHealth - 2 * s.power.damage);
  });
}

it('deeply snapshots independent trajectories, clocks and shared contact groups', () => {
  const s = setup();
  s.fractures.launchAt(s.caster, s.target, s.power, s.target.x, 1, 0);
  const snapshot = captureFighter(s.caster);
  s.caster.combat.fractures[0].segments[0].burst = true;
  s.caster.combat.stormFractureHits[0] = true;
  assert.equal(snapshot.combat.fractures[0].segments[0].burst, false);
  assert.equal(snapshot.combat.stormFractureHits[0], undefined);
  restoreFighter(s.caster, snapshot);
  s.caster.combat.fractures[0].time = 1;
  assert.equal(snapshot.combat.fractures[0].time, 0);
  s.caster.resetForRound(500, 1);
  assert.deepEqual(s.caster.combat.fractures, []);
});

it('finishes every additional trajectory independently and cleans them on death', () => {
  const s = setup();
  s.fractures.launchAt(s.caster, s.target, s.power, 700, 1, 0);
  s.fractures.launchAt(s.caster, s.target, s.power, 700, -1, 0);
  s.fractures.update(s.caster, s.fighters, s.power.range / s.power.speed + s.power.fractureWarning);
  assert.deepEqual(s.caster.combat.fractures, []);
  s.fractures.launchAt(s.caster, s.target, s.power, 700, 1, 1);
  s.caster.state = FighterState.DEAD;
  s.fractures.update(s.caster, s.fighters, 0);
  assert.deepEqual(s.caster.combat.fractures, []);
});

it('chooses a free exit from overlapping storm columns within arena walls', () => {
  const s = setup();
  s.caster.combat.power = powersConfig.powers.storm;
  const margin = aiConfig.perception.stormEscapeMargin;
  const clearance = s.caster.combat.power.strikeWidth / 2 + s.target.width / 2 + margin;
  s.caster.combat.stormMarks = [{ active: true, x: s.target.x }, { active: true, x: s.target.x - clearance }];
  const x = findStormEscapeX(s.target, s.caster, s.simulation.arena, margin);
  assert.notEqual(x, null);
  for (const mark of s.caster.combat.stormMarks) assert.ok(Math.abs(x - mark.x) >= clearance);
  assert.ok(x >= s.simulation.arena.left + s.target.width / 2);
  assert.ok(x <= s.simulation.arena.right - s.target.width / 2);
});

function castStorm(level = 10) {
  const s = setup();
  s.caster.stats.flowLevel = level;
  s.target.stats.flowLevel = level;
  s.caster.stats.power.loadout = { neutral: powersConfig.powers.storm };
  s.caster.flowMeter = s.caster.stats.power.max;
  assert.equal(s.simulation.combat.powers.tryCast(s.caster), true);
  s.caster.stateTime = powersConfig.powers.storm.startup;
  s.simulation.combat.powers.resolve(s.fighters, 0);
  return s;
}

it('limits overlapping bolts to one damage contact while opening both fractures from every apex bolt', () => {
  const s = castStorm();
  const storm = powersConfig.powers.storm;
  const marks = s.caster.combat.stormMarks.filter(mark => mark.wave === 0);
  for (const mark of marks) mark.x = s.target.x;
  s.caster.stateTime = marks[0].impactTime;
  s.simulation.combat.powers.resolve(s.fighters, 0);
  assert.equal(s.target.stats.maxHealth - s.target.health, storm.damage);
  assert.equal(s.caster.combat.fractures.length, marks.length * 2);
  for (const wave of s.caster.combat.fractures) {
    assert.equal(wave.power, storm.fractureByLevel);
    assert.equal(wave.power.launchSpeed, storm.fractureByLevel.launchSpeed);
    assert.equal(wave.group, marks[0].wave);
  }
  s.fractures.update(s.caster, s.fighters, storm.fractureByLevel.fractureWarning);
  assert.equal(s.target.stats.maxHealth - s.target.health, storm.damage + storm.fractureByLevel.damage);
});

it('drains Barrier separately for each overlapping storm bolt and never opens lower-tier fractures', () => {
  const s = castStorm(powersConfig.powers.storm.minFlowLevel);
  const storm = powersConfig.powers.storm;
  const marks = s.caster.combat.stormMarks.filter(mark => mark.wave === 0);
  for (const mark of marks) mark.x = s.target.x;
  s.target.state = FighterState.CHANNELING;
  s.target.combat.power = powersConfig.powers.barrier;
  s.target.stateTime = powersConfig.powers.barrier.startup;
  s.target.flowMeter = s.target.stats.power.max;
  s.caster.stateTime = marks[0].impactTime;
  s.simulation.combat.powers.resolve(s.fighters, 0);
  assert.equal(s.target.flowMeter, s.target.stats.power.max - marks.length * storm.barrierDrainPerStrike);
  assert.equal(s.target.health, s.target.stats.maxHealth);
  assert.equal(s.caster.combat.fractures.length, 0);
});
it('drains the configured Barrier meter on each held lightning pulse', () => {
  const s = setup();
  const lightning = powersConfig.powers.lightning;
  s.target.state = FighterState.CHANNELING;
  s.target.combat.power = powersConfig.powers.barrier;
  s.target.stateTime = powersConfig.powers.barrier.startup;
  s.target.flowMeter = s.target.stats.power.max;
  for (let pulse = 1; pulse <= 2; pulse++) {
    s.simulation.combat.powers.strike(s.caster, s.target, lightning, 'tick');
    assert.equal(s.target.flowMeter, s.target.stats.power.max - pulse * lightning.barrierDrainPerStrike);
    assert.equal(s.target.health, s.target.stats.maxHealth);
  }
});

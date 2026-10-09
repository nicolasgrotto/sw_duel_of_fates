import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolvePowerStats } from '../src/characters/powers.js';
import { getLevelDifference, getPowerTier, resolvePowerOutcome } from '../src/combat/powerResistance.js';
import { PowerOutcome, powersConfig } from '../src/config/powersConfig.js';
import { DuelMode, createDuelRules } from '../src/states/duelModes.js';
import { STEP, createSimulation, repeat, spawnFighter } from './helpers.js';

describe('power resistance', () => {
  const rule = powersConfig.resistance.standard;

  it('keeps the effect up to one level of difference, halves it at two and resists from three', () => {
    assert.equal(resolvePowerOutcome(rule, -4).outcome, PowerOutcome.NORMAL);
    assert.equal(resolvePowerOutcome(rule, 0).outcome, PowerOutcome.NORMAL);
    assert.equal(resolvePowerOutcome(rule, 1).scale, 1);
    assert.equal(resolvePowerOutcome(rule, 2).outcome, PowerOutcome.REDUCED);
    assert.equal(resolvePowerOutcome(rule, 2).scale, 0.5);
    assert.equal(resolvePowerOutcome(rule, 3).outcome, PowerOutcome.RESISTED);
    assert.equal(resolvePowerOutcome(rule, 9).scale, 0);
  });

  it('measures the difference as target level minus caster level', () => {
    assert.equal(getLevelDifference({ powerLevel: 5 }, { powerLevel: 8 }), 3);
    assert.equal(getLevelDifference({ powerLevel: 8 }, { powerLevel: 5 }), -3);
  });

  it('maps levels to the four visual tiers', () => {
    const { tiers } = powersConfig;
    assert.deepEqual([1, 3, 4, 7, 8, 11, 12].map((level) => getPowerTier(level, tiers).id), ['faint', 'faint', 'steady', 'steady', 'deep', 'deep', 'apex']);
  });

  it('scales meter gain and potency around the base level', () => {
    const base = resolvePowerStats(powersConfig.meter.baseLevel, powersConfig);
    const high = resolvePowerStats(9, powersConfig);
    const low = resolvePowerStats(3, powersConfig);
    assert.equal(base.gainScale, 1);
    assert.equal(base.potency, 1);
    assert.ok(high.gainScale > 1 && high.potency > 1);
    assert.ok(low.gainScale < 1 && low.potency < 1);
    assert.equal(base.max, powersConfig.meter.max);
  });
});

describe('duel rules', () => {
  it('turns powers on only in the power modes and respects the option', () => {
    const modes = powersConfig.modes;
    assert.equal(createDuelRules(DuelMode.VERSUS, {}, modes).powers, true);
    assert.equal(createDuelRules(DuelMode.LOCAL, { powers: true }, modes).powers, true);
    assert.equal(createDuelRules(DuelMode.TRAINING, { powers: false }, modes).powers, false);
    for (const mode of [DuelMode.ARCADE, DuelMode.SURVIVAL, DuelMode.TUTORIAL, DuelMode.CHALLENGE]) {
      assert.equal(createDuelRules(mode, { powers: true }, modes).powers, false);
    }
  });
});

describe('power meter', () => {
  it('starts each fighter with the configured meter and level from the flow rating', () => {
    const fighter = spawnFighter(400, 1, 'mirror');
    assert.equal(fighter.powerMeter, powersConfig.meter.start);
    assert.equal(fighter.powerLevel, 7);
    assert.equal(fighter.stats.alignment, 'light');
    assert.equal(spawnFighter(400, 1, 'shadow').stats.alignment, 'dark');
  });

  it('does not change in the classic rules', () => {
    const fighters = [spawnFighter(300), spawnFighter(900, -1, 'shadow')];
    const simulation = createSimulation(fighters);
    repeat(120, () => simulation.step(STEP));
    assert.equal(fighters[0].powerMeter, powersConfig.meter.start);
  });

  it('regenerates over time with powers on and never passes the maximum', () => {
    const fighters = [spawnFighter(300), spawnFighter(900, -1, 'shadow')];
    const simulation = createSimulation(fighters, { powers: true });
    repeat(60, () => simulation.step(STEP));
    const expected = powersConfig.meter.start + powersConfig.meter.regenPerSecond * fighters[0].stats.power.gainScale;
    assert.ok(Math.abs(fighters[0].powerMeter - expected) < 0.01);
    repeat(60 * 60, () => simulation.step(STEP));
    assert.equal(fighters[0].powerMeter, fighters[0].stats.power.max);
  });

  it('rewards both sides of a hit and resets for a new round', () => {
    const attacker = spawnFighter(500);
    const defender = spawnFighter(580, -1, 'shadow');
    const simulation = createSimulation([attacker, defender], { powers: true });
    attacker.intent.lightAttack = true;
    let hit = false;
    for (let i = 0; i < 40 && !hit; i += 1) {
      simulation.step(STEP);
      attacker.intent.lightAttack = false;
      hit = simulation.events.some((event) => event.type === 'hit');
    }
    assert.ok(hit);
    const { gain } = powersConfig.meter;
    assert.ok(attacker.powerMeter >= powersConfig.meter.start + gain.hitLanded * attacker.stats.power.gainScale);
    assert.ok(defender.powerMeter >= powersConfig.meter.start + gain.hitTaken * defender.stats.power.gainScale);
    attacker.resetForRound(400, 1);
    assert.equal(attacker.powerMeter, powersConfig.meter.start);
  });
});

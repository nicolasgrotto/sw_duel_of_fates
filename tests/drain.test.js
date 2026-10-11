import { it } from 'node:test';
import assert from 'node:assert/strict';
import { AiDecision, EnemyAI } from '../src/ai/EnemyAI.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';

const power = powersConfig.powers.drain;

function setup(difference = 0) {
  const caster = spawnFighter(500, 1, 'shadow');
  const target = spawnFighter(700, -1);
  caster.stats = { ...caster.stats, flowLevel: 6 + difference, power: { ...caster.stats.power, potency: 1, loadout: { neutral: power } } };
  target.stats = { ...target.stats, flowLevel: 6 };
  caster.flowMeter = 40;
  target.flowMeter = 50;
  const simulation = createSimulation([caster, target], { powers: true });
  return { caster, target, simulation, powers: simulation.combat.powers };
}

for (const difference of [-3, -2, -1, 0, 3]) {
  it(`drains resources without health damage at difference ${difference}`, () => {
    const { caster, target, powers } = setup(difference);
    target.state = FighterState.BLOCKING;
    const scale = difference <= -3 ? 0 : difference === -2 ? 0.5 : 1;
    powers.strike(caster, target, power, 'tick', null);
    assert.equal(target.flowMeter, 50 - power.drainFlow * scale);
    assert.equal(caster.flowMeter, 40 + power.drainFlow * scale * power.flowReturn);
    assert.equal(target.stamina, target.stats.maxStamina - power.drainStamina * scale);
    assert.equal(target.health, target.stats.maxHealth);
    assert.equal(target.state, FighterState.BLOCKING);
  });
}

it('returns only actual stolen flow, caps resources and never makes the target negative', () => {
  const { caster, target, powers } = setup();
  caster.flowMeter = 99;
  target.flowMeter = 2;
  target.stamina = 0.5;
  powers.strike(caster, target, power, 'tick', null);
  assert.equal(caster.flowMeter, 100);
  assert.equal(target.flowMeter, 0);
  assert.equal(target.stamina, 0);
  caster.flowMeter = 40;
  powers.strike(caster, target, power, 'tick', null);
  assert.equal(caster.flowMeter, 40);
});

it('requires held input, pays once, breaks at the range boundary and recovers', () => {
  const { caster, target, powers } = setup();
  assert.equal(powers.tryCast(caster), true);
  assert.equal(caster.flowMeter, 40 - power.cost);
  caster.stateTime = power.startup;
  powers.resolve([caster, target], STEP);
  assert.equal(target.flowMeter, 50);
  assert.equal(caster.combat.powerEndTime, power.startup);
  caster.stateTime += power.recovery;
  powers.resolve([caster, target], STEP);
  assert.equal(caster.combat.power, null);
  assert.equal(caster.combat.powerCooldown, powersConfig.cooldown);
  caster.combat.powerCooldown = 0;
  caster.flowMeter = 100;
  powers.tryCast(caster);
  caster.stateTime = power.startup;
  caster.intent.powerHeld = true;
  target.x = caster.x + (caster.width + target.width) / 2 + power.range;
  powers.resolve([caster, target], STEP);
  assert.ok(target.flowMeter < 50);
  target.x += 1;
  caster.combat.powerTick = 0;
  powers.resolve([caster, target], STEP);
  assert.equal(caster.combat.powerEndTime, caster.stateTime);
});

it('stops on release, max duration and interruption', () => {
  for (const ending of ['release', 'duration', 'hit']) {
    const { caster, target, powers } = setup();
    powers.tryCast(caster);
    caster.intent.powerHeld = true;
    caster.stateTime = power.startup;
    powers.resolve([caster, target], STEP);
    const before = target.flowMeter;
    if (ending === 'release') caster.intent.powerHeld = false;
    if (ending === 'duration') caster.stateTime += power.maxChannel;
    if (ending === 'hit') caster.clearAttack();
    powers.resolve([caster, target], STEP);
    assert.equal(target.flowMeter, before);
    assert.ok(caster.combat.powerEndTime > 0 || caster.combat.power === null);
  }
});

it('respects barrier, dodge invulnerability and full or partial absorption', () => {
  for (const defense of ['barrier', 'dodge', 'absorb', 'partial']) {
    const { caster, target, powers } = setup();
    if (defense === 'barrier') {
      target.combat.power = powersConfig.powers.barrier;
      target.state = FighterState.CHANNELING;
      target.stateTime = target.combat.power.startup;
    } else if (defense === 'dodge') {
      target.state = FighterState.DODGING;
      target.combat.dodgeProfile = target.stats.dodge;
    } else {
      target.combat.absorbTime = 0.3;
      if (defense === 'partial') target.stats.flowLevel = 5;
    }
    const before = target.stamina;
    powers.strike(caster, target, power, 'tick', null);
    assert.equal(target.health, target.stats.maxHealth);
    assert.equal(target.stamina, before - (defense === 'partial' ? power.drainStamina * 0.5 : 0));
  }
});

it('AI uses the configured range and target resource threshold through intents', () => {
  const { caster, target } = setup();
  const ai = new EnemyAI({ self: caster, opponent: target, profile: aiConfig.profiles.balanced, difficulty: aiConfig.difficulties.hard, perception: aiConfig.perception, random: () => 0, rules: { powers: true } });
  assert.equal(ai.tryPower(), AiDecision.POWER);
  ai.writeIntent(caster.intent);
  assert.equal(caster.intent.power, true);
  assert.equal(caster.intent.powerHeld, true);
  for (const [gap, meter] of [[119, 50], [301, 50], [150, 25]]) {
    target.x = caster.x + (caster.width + target.width) / 2 + gap;
    target.flowMeter = meter;
    assert.equal(ai.wantsPower(power), false);
  }
});

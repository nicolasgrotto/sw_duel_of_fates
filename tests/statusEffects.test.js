import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AiDecision, EnemyAI } from '../src/ai/EnemyAI.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';

const { choke, freeze, heal, focus } = powersConfig.powers;

function setLevel(fighter, level) {
  fighter.stats = { ...fighter.stats, flowLevel: level };
}

function duel(casterId, targetId, gap = 120) {
  const caster = spawnFighter(400, 1, casterId);
  const target = spawnFighter(400 + caster.width / 2 + gap + 23, -1, targetId);
  const simulation = createSimulation([caster, target], { powers: true });
  caster.flowMeter = 100;
  target.flowMeter = 100;
  return { caster, target, simulation, events: [] };
}

function step(setup, count = 1, each = () => {}) {
  for (let i = 0; i < count; i += 1) {
    each(i);
    setup.simulation.step(STEP);
    setup.events.push(...setup.simulation.events.map((event) => event.type));
    for (const fighter of [setup.caster, setup.target]) {
      fighter.intent.power = false;
      fighter.intent.lightAttack = false;
      fighter.intent.heavyAttack = false;
      fighter.intent.dodge = false;
    }
  }
}

function cast(setup, fighter, slot) {
  fighter.intent.moveX = slot === 'forward' ? fighter.facing : slot === 'back' ? -fighter.facing : 0;
  fighter.intent.power = true;
  step(setup);
  fighter.intent.moveX = 0;
}

function stepsFor(seconds) {
  return Math.ceil(seconds / STEP) + 1;
}

describe('choke', () => {
  it('holds the target and drains health over its duration', () => {
    const setup = duel('shadow', 'guardian');
    cast(setup, setup.caster, 'back');
    step(setup, stepsFor(choke.startup));
    assert.ok(setup.events.includes(CombatEvent.POWER_HIT));
    assert.equal(setup.target.state, FighterState.STUNNED);
    const afterHit = setup.target.health;
    const duration = setup.target.combat.chokeTime;
    assert.ok(duration > 0);
    step(setup, stepsFor(duration));
    assert.ok(setup.target.health < afterHit);
    assert.equal(setup.target.combat.chokeTime, 0);
  });

  it('lasts less at two levels below, fails at three and goes through the guard at three above', () => {
    const durationAt = (casterLevel, targetLevel, guarding = false) => {
      const setup = duel('shadow', 'guardian');
      setLevel(setup.caster, casterLevel);
      setLevel(setup.target, targetLevel);
      if (guarding) step(setup, 1, () => { setup.target.intent.block = true; });
      cast(setup, setup.caster, 'back');
      let longest = 0;
      step(setup, stepsFor(choke.startup) + 2, () => {
        if (guarding) setup.target.intent.block = true;
        longest = Math.max(longest, setup.target.combat.chokeTime);
      });
      return { longest, events: setup.events };
    };
    const even = durationAt(5, 5);
    const weak = durationAt(3, 5);
    const failed = durationAt(2, 5);
    assert.ok(Math.abs(weak.longest - even.longest * 0.5) < 0.05);
    assert.equal(failed.longest, 0);
    assert.ok(failed.events.includes(CombatEvent.POWER_RESISTED));
    const guarded = durationAt(5, 5, true);
    assert.equal(guarded.longest, 0);
    assert.ok(guarded.events.includes(CombatEvent.POWER_BLOCKED));
    assert.ok(durationAt(8, 5, true).longest > 0);
  });
});

describe('freeze', () => {
  it('holds without damage and breaks on the next hit', () => {
    const setup = duel('ember', 'guardian');
    cast(setup, setup.caster, 'back');
    step(setup, stepsFor(freeze.startup));
    assert.equal(setup.target.state, FighterState.STUNNED);
    assert.equal(setup.target.health, setup.target.stats.maxHealth);
    assert.ok(setup.target.combat.freezeTime > 0);
    setup.caster.x = setup.target.x - 70;
    step(setup, stepsFor(freeze.recovery));
    setup.caster.intent.lightAttack = true;
    step(setup, 30);
    assert.ok(setup.target.health < setup.target.stats.maxHealth);
    assert.equal(setup.target.combat.freezeTime, 0);
  });

  it('is shorter against a stronger flow and has no effect at three levels below', () => {
    const durationAt = (casterLevel, targetLevel) => {
      const setup = duel('ember', 'guardian');
      setLevel(setup.caster, casterLevel);
      setLevel(setup.target, targetLevel);
      cast(setup, setup.caster, 'back');
      step(setup, stepsFor(freeze.startup));
      return setup.target.combat.freezeTime;
    };
    const even = durationAt(5, 5);
    assert.ok(durationAt(4, 5) < even && durationAt(4, 5) > durationAt(3, 5));
    assert.equal(durationAt(2, 5), 0);
  });
});

describe('focus', () => {
  it('halves the stamina cost of attacking, blocking and dodging while it lasts', () => {
    const setup = duel('bastion', 'shadow', 400);
    cast(setup, setup.caster, 'forward');
    step(setup, stepsFor(focus.startup + focus.active + focus.recovery));
    assert.ok(setup.caster.combat.focusTime > 0);
    const stamina = setup.caster.stamina;
    setup.caster.intent.dodge = true;
    step(setup);
    const focusedCost = stamina - setup.caster.stamina;
    assert.ok(Math.abs(focusedCost - setup.caster.stats.dodge.staminaCost * focus.staminaScale) < 1);
    step(setup, stepsFor(setup.caster.combat.focusTime + 1));
    assert.equal(setup.caster.combat.focusTime, 0);
    setup.caster.stamina = setup.caster.stats.maxStamina;
    const before = setup.caster.stamina;
    setup.caster.intent.dodge = true;
    step(setup);
    assert.ok(Math.abs(before - setup.caster.stamina - setup.caster.stats.dodge.staminaCost) < 1);
  });
});

describe('heal', () => {
  it('restores part of the missing health over time and stops when hit', () => {
    const setup = duel('guardian', 'shadow', 400);
    const max = setup.caster.stats.maxHealth;
    setup.caster.health = max * 0.4;
    cast(setup, setup.caster, 'forward');
    step(setup, stepsFor(heal.startup + heal.duration));
    const healed = setup.caster.health - max * 0.4;
    assert.ok(healed > 0);
    assert.ok(healed <= max * 0.6 * heal.maxMissingFraction + 1e-9);
    assert.ok(healed <= heal.amount * setup.caster.stats.power.potency + 1e-9);

    const hurt = duel('guardian', 'shadow', 400);
    hurt.caster.health = max * 0.4;
    cast(hurt, hurt.caster, 'forward');
    step(hurt, stepsFor(heal.startup) + 10);
    hurt.simulation.combat.dealPowerDamage(hurt.target, hurt.caster, powersConfig.powers.lightning, 1, CombatEvent.POWER_HIT);
    const after = hurt.caster.health;
    assert.equal(hurt.caster.combat.healTime, 0);
    step(hurt, 30);
    assert.equal(hurt.caster.health, after);
  });

  it('never heals past the cap even at full health', () => {
    const setup = duel('guardian', 'shadow', 400);
    cast(setup, setup.caster, 'forward');
    step(setup, stepsFor(heal.startup + heal.duration));
    assert.equal(setup.caster.health, setup.caster.stats.maxHealth);
  });
});

describe('AI with status powers', () => {
  function ai(selfId, opponentId, gap) {
    const self = spawnFighter(800, -1, selfId);
    const opponent = spawnFighter(0, 1, opponentId);
    opponent.x = self.x - (self.width + opponent.width) / 2 - gap;
    self.flowMeter = 100;
    const controller = new EnemyAI({
      self, opponent, profile: { ...aiConfig.profiles.balanced, priorities: ['power'] },
      difficulty: { ...aiConfig.difficulties.hard, mistakeChance: 0, powerMultiplier: 10, powerAware: true },
      perception: aiConfig.perception, random: () => 0, rules: { powers: true },
    });
    return { self, controller };
  }

  it('heals when hurt and far, and not when healthy', () => {
    const hurt = ai('guardian', 'shadow', 300);
    hurt.self.health = hurt.self.stats.maxHealth * 0.3;
    hurt.controller.think();
    assert.equal(hurt.controller.decision, AiDecision.POWER);
    hurt.controller.writeIntent(hurt.self.intent);
    assert.equal(Math.sign(hurt.self.intent.moveX), hurt.self.facing);
    const healthy = ai('guardian', 'shadow', 300);
    healthy.controller.think();
    assert.notEqual(healthy.self.intent.moveX, healthy.self.facing);
  });

  it('chokes at close range', () => {
    const close = ai('shadow', 'guardian', 60);
    close.controller.think();
    assert.equal(close.controller.decision, AiDecision.POWER);
  });
});

describe('status fields', () => {
  it('reset every round', () => {
    const fighter = spawnFighter(400);
    Object.assign(fighter.combat, { chokeTime: 1, freezeTime: 1, focusTime: 1, healTime: 1 });
    fighter.resetForRound(400, 1);
    for (const field of ['chokeTime', 'freezeTime', 'focusTime', 'healTime']) assert.equal(fighter.combat[field], 0);
  });
});

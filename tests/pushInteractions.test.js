import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { resolveInteraction } from '../src/combat/flowInteractions.js';
import { PowerOutcome, powersConfig } from '../src/config/powersConfig.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';

const { push } = powersConfig.powers;
const table = powersConfig.interactions.push;
const BASE_LEVEL = 4;

function setLevel(fighter, level) {
  fighter.stats = { ...fighter.stats, flowLevel: level };
}

function pushAt(difference, guarding) {
  const caster = spawnFighter(400, 1, 'guardian');
  const target = spawnFighter(400 + caster.width / 2 + 160 + 23, -1, 'shadow');
  setLevel(caster, BASE_LEVEL + Math.max(0, difference));
  setLevel(target, BASE_LEVEL - Math.min(0, difference));
  const simulation = createSimulation([caster, target], { powers: true });
  caster.flowMeter = 100;
  const events = [];
  if (guarding) {
    target.intent.block = true;
    simulation.step(STEP);
  }
  const stamina = target.stamina;
  caster.intent.power = true;
  let velocity = null;
  for (let i = 0; i < 40 && velocity === null; i += 1) {
    simulation.step(STEP);
    caster.intent.power = false;
    for (const event of simulation.events) {
      events.push(event.type);
      if (event.type === CombatEvent.POWER_HIT || event.type === CombatEvent.POWER_BLOCKED || event.type === CombatEvent.POWER_RESISTED) {
        velocity = target.vx;
      }
    }
  }
  return { events, velocity, damage: target.stats.maxHealth - target.health, staminaSpent: stamina - target.stamina, state: target.state, stagger: target.combat.stunDuration };
}

describe('push interactions by flow difference', () => {
  it('maps every difference to its band in both directions', () => {
    const band = (difference) => resolveInteraction(table, difference);
    assert.equal(band(3).blockable, false);
    assert.equal(band(6).blockable, false);
    assert.ok(band(2).guardDamage > band(1).guardDamage && band(1).guardDamage > band(0).guardDamage);
    assert.ok(band(2).guardSlide > band(1).guardSlide && band(1).guardSlide > band(0).guardSlide && band(0).guardSlide > band(-1).guardSlide);
    assert.equal(band(0).guardDamage, 0);
    assert.equal(band(-2).outcome, PowerOutcome.REDUCED);
    assert.equal(band(-2).knockback, 0);
    assert.ok(band(-2).guardStamina < band(-1).guardStamina && band(-1).guardStamina < band(0).guardStamina);
    assert.equal(band(-3).outcome, PowerOutcome.RESISTED);
  });

  it('cannot be blocked from three levels above', () => {
    const result = pushAt(3, true);
    assert.ok(result.events.includes(CombatEvent.POWER_HIT));
    assert.equal(result.state, FighterState.STAGGERED);
    assert.ok(result.damage > 0);
  });

  it('lets the guard hold with chip damage and more slide at one and two levels above', () => {
    const even = pushAt(0, true);
    const one = pushAt(1, true);
    const two = pushAt(2, true);
    for (const result of [even, one, two]) {
      assert.ok(result.events.includes(CombatEvent.POWER_BLOCKED));
      assert.equal(result.state, FighterState.BLOCKING);
    }
    assert.equal(even.damage, 0);
    assert.ok(one.damage > 0 && two.damage > one.damage);
    assert.ok(two.velocity > one.velocity && one.velocity > even.velocity);
    assert.ok(two.staminaSpent > even.staminaSpent);
  });

  it('pushes the stronger defender less at one level below and not at all at two', () => {
    const even = pushAt(0, true);
    const below = pushAt(-1, true);
    const weak = pushAt(-2, true);
    assert.ok(below.velocity < even.velocity && below.staminaSpent < even.staminaSpent);
    assert.equal(weak.velocity, 0);
    assert.ok(weak.staminaSpent < below.staminaSpent);

    const open = pushAt(0, false);
    const weakOpen = pushAt(-2, false);
    assert.ok(open.velocity > 0);
    assert.equal(weakOpen.velocity, 0);
    assert.ok(Math.abs(weakOpen.damage - open.damage * 0.5) < 1e-9);
    assert.ok(weakOpen.stagger < open.stagger);
  });

  it('is resisted from three levels below', () => {
    const result = pushAt(-3, true);
    assert.ok(result.events.includes(CombatEvent.POWER_RESISTED));
    assert.equal(result.damage, 0);
  });
});

import { it } from 'node:test';
import assert from 'node:assert/strict';
import { powersConfig } from '../src/config/powersConfig.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { AiDecision, EnemyAI } from '../src/ai/EnemyAI.js';
import { captureFighter, restoreFighter } from '../src/simulation/ReplayBuffer.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';

const power = powersConfig.powers.choke;
function setup(diff = 0, reversed = false) {
  const caster = spawnFighter(450, 1, 'shadow');
  const target = spawnFighter(600, -1);
  caster.stats = { ...caster.stats, flowLevel: 6 + diff, power: { ...caster.stats.power, potency: 1, gainScale: 1, loadout: { neutral: power } } };
  target.stats = { ...target.stats, flowLevel: 6 };
  caster.flowMeter = 100;
  caster.intent.powerHeld = true;
  const fighters = reversed ? [target, caster] : [caster, target];
  const simulation = createSimulation(fighters, { powers: true });
  simulation.combat.powers.tryCast(caster);
  return { caster, target, fighters, simulation };
}
function advance(s, frames) { for (let i = 0; i < frames; i++) s.simulation.step(STEP); }
function acquire(s) { advance(s, Math.ceil(power.startup / STEP) + 1); }

for (const reversed of [false, true]) {
  for (const diff of [-3, -2, -1, 0, 3]) {
    it('bounds the held choke by flow difference ' + diff + ', reversed ' + reversed, () => {
      const s = setup(diff, reversed);
      acquire(s);
      if (diff === -3) { assert.equal(s.target.combat.chokeTime, 0); return; }
      const duration = diff === -2 ? power.maxChannel * 0.5 : power.maxChannel;
      assert.equal(s.caster.combat.chokeMaxChannel, duration);
      assert.equal(s.target.state, FighterState.STUNNED);
      assert.ok(s.target.combat.chokeTime <= duration);
      assert.equal(s.target.combat.chokeSource, s.fighters.indexOf(s.caster));
      const health = s.target.health;
      advance(s, 20);
      assert.ok(s.target.health < health);
      while (s.caster.combat.powerEndTime === 0) advance(s, 1);
      assert.equal(s.target.combat.chokeTime, 0);
      assert.equal(s.target.state, FighterState.STAGGERED);
      assert.equal(s.target.combat.stunDuration, power.recovery);
      advance(s, Math.ceil(power.recovery / STEP) + 1);
      assert.equal(s.target.state, FighterState.IDLE);
      assert.equal(s.caster.state, FighterState.IDLE);
    });
  }
  it('ends immediately on release without distance checks or a punishment advantage, reversed ' + reversed, () => {
    const s = setup(0, reversed); acquire(s);
    s.target.x = 1150;
    s.target.intent.lightAttack = true;
    s.target.intent.jump = true;
    advance(s, 12);
    assert.equal(s.target.state, FighterState.STUNNED);
    s.target.clearIntent();
    s.caster.intent.powerHeld = false;
    advance(s, 1);
    assert.equal(s.target.state, FighterState.STAGGERED);
    assert.equal(s.target.combat.chokeTime, 0);
    for (let frame = 0; frame < 20; frame++) {
      advance(s, 1);
      assert.equal(s.caster.canAct, s.target.canAct);
    }
  });
}

for (const interruption of ['meter', 'blade', 'projectile', 'death', 'targetDeath']) {
  it('releases a linked victim when the channel ends by ' + interruption, () => {
    const s = setup(); acquire(s);
    if (interruption === 'meter') s.caster.flowMeter = 0;
    if (interruption === 'blade' || interruption === 'projectile') {
      const attack = interruption === 'blade' ? s.target.moves.light : { ...s.target.moves.light, projectile: true };
      s.simulation.combat.applyHit({ attacker: s.target, defender: s.caster, attack, attackType: 'light', damage: 0 });
    }
    if (interruption === 'death') { s.caster.health = 0; s.caster.restartState(FighterState.DEAD); }
    if (interruption === 'targetDeath') { s.target.health = 0; s.target.restartState(FighterState.DEAD); }
    advance(s, 1);
    assert.equal(s.target.combat.chokeTime, 0);
    assert.equal(s.target.combat.chokeSource, -1);
    if (interruption !== 'targetDeath') assert.equal(s.target.state, FighterState.STAGGERED);
  });
}

it('does not acquire or deal damage on a tap without hold', () => {
  const s = setup(); s.caster.intent.powerHeld = false;
  advance(s, 100);
  assert.equal(s.target.health, s.target.stats.maxHealth);
  assert.equal(s.target.combat.chokeTime, 0);
  assert.equal(s.caster.combat.power, null);
});

it('pays the entry cost and channel drain, and applies entry damage only once', () => {
  const s = setup(); assert.equal(s.caster.flowMeter, 100 - power.cost);
  const events = [];
  for (let frame = 0; frame < 75; frame++) { s.simulation.step(STEP); events.push(...s.simulation.events); }
  assert.equal(events.filter(event => event.type === CombatEvent.POWER_HIT && event.attackType === 'choke').length, 1);
  assert.ok(s.caster.flowMeter < 100 - power.cost);
  assert.ok(s.target.health < s.target.stats.maxHealth - power.damage);
});

it('caps the air multiplier and keeps an airborne victim fixed', () => {
  const s = setup(3); s.target.y -= 70; s.target.grounded = false;
  const y = s.target.y; acquire(s);
  assert.equal(s.caster.combat.chokeMaxChannel, power.maxChannel);
  const fixed = s.target.y;
  advance(s, 20);
  assert.equal(s.target.y, fixed);
  assert.ok(fixed >= y);
});

it('stores a channel link in snapshots and clears it on round reset', () => {
  const s = setup(); acquire(s);
  const snapshots = s.fighters.map(captureFighter);
  s.caster.intent.powerHeld = false; advance(s, 1);
  s.fighters.forEach((fighter, index) => restoreFighter(fighter, snapshots[index]));
  s.caster.intent.powerHeld = true; advance(s, 1);
  assert.equal(s.target.state, FighterState.STUNNED);
  s.fighters.forEach(fighter => fighter.resetForRound(fighter.x, fighter.facing));
  assert.equal(s.target.combat.chokeSource, -1);
  assert.equal(s.caster.combat.chokeTarget, -1);
});

it('AI requests holding choke through preparation and the full channel', () => {
  const s = setup(); s.caster.clearPower(); s.caster.restartState(FighterState.IDLE); s.caster.flowMeter = 100;
  const ai = new EnemyAI({ self: s.caster, opponent: s.target, profile: aiConfig.profiles.shadow, difficulty: aiConfig.difficulties.hard, perception: aiConfig.perception, random: () => 0, rules: { powers: true } });
  assert.equal(ai.tryPower(), AiDecision.POWER);
  assert.equal(ai.plan.powerHoldTime, power.startup + power.maxChannel);
});

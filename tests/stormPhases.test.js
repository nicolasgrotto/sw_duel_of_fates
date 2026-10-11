import { it } from 'node:test';
import assert from 'node:assert/strict';
import { AiDecision, EnemyAI } from '../src/ai/EnemyAI.js';
import { findStormThreat } from '../src/ai/perception.js';
import { isStormShieldUp } from '../src/combat/StormSystem.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { captureFighter, restoreFighter } from '../src/simulation/ReplayBuffer.js';
import { STEP, arena, createSimulation, spawnFighter } from './helpers.js';

const power = powersConfig.powers.storm;

function setup(level = 6, reversed = false) {
  const caster = spawnFighter(500, 1, 'sovereign');
  const target = spawnFighter(800, -1);
  caster.stats = { ...caster.stats, flowLevel: level, power: { ...caster.stats.power, potency: 1, loadout: { neutral: power } } };
  target.stats = { ...target.stats, flowLevel: level, power: { ...target.stats.power, potency: 1 } };
  caster.flowMeter = target.flowMeter = 100;
  const fighters = reversed ? [target, caster] : [caster, target];
  const simulation = createSimulation(fighters, { powers: true });
  return { caster, target, fighters, simulation, powers: simulation.combat.powers };
}

function cast(s, time = power.startup) {
  assert.equal(s.powers.tryCast(s.caster), true);
  s.caster.stateTime = time;
  s.powers.resolve(s.fighters, STEP);
}

function bladeContact(s) {
  return { attacker: s.target, defender: s.caster, attack: s.target.moves.light, attackType: 'light', x: s.caster.x, y: s.caster.y, damage: 0 };
}

it('requires configured level, meter and enabled rules, paying a fixed cost once', () => {
  const s = setup(5);
  assert.equal(s.powers.tryCast(s.caster), false);
  s.caster.stats.flowLevel = 6;
  s.caster.flowMeter = power.cost - 1;
  assert.equal(s.powers.tryCast(s.caster), false);
  s.caster.flowMeter = power.cost;
  cast(s);
  assert.equal(s.caster.flowMeter, 0);
  s.caster.intent.powerHeld = false;
  s.caster.stateTime = power.startup + 2;
  s.powers.resolve(s.fighters, STEP);
  assert.equal(s.caster.flowMeter, 0);
  assert.equal(s.caster.combat.stormPhase, 'storm');
  assert.equal(Object.hasOwn(power, 'drainPerSecond'), false);
  s.powers.enabled = false;
  assert.equal(s.powers.canCast(s.target, power), false);
});

it('allows interruption at invocation and recovery, protecting only the storm phase', () => {
  for (const [time, protectedPhase] of [[power.startup - STEP, false], [power.startup, true], [power.startup + 5 - STEP, true], [power.startup + 5, false]]) {
    const s = setup();
    cast(s, time);
    const health = s.caster.health;
    const targetVelocity = s.target.vx;
    const contact = bladeContact(s);
    assert.equal(isStormShieldUp(s.caster), protectedPhase);
    s.simulation.combat.resolveContact(contact);
    assert.equal(s.caster.health === health, protectedPhase);
    if (protectedPhase) {
      assert.equal(s.caster.vx, 0);
      assert.equal(s.target.vx, targetVelocity);
      assert.equal(s.caster.combat.power, power);
      assert.ok(s.simulation.events.some(e => e.type === CombatEvent.POWER_ABSORBED));
    } else {
      assert.equal(s.caster.combat.power, null);
      assert.equal(s.caster.combat.stormMarks.length, 0);
    }
  }
});

it('shields all incoming powers, body shove and both projectile kinds without recoil', () => {
  for (const id of ['push', 'pull', 'lightning', 'choke', 'freeze', 'drain', 'mindTwist', 'storm']) {
    const s = setup();
    cast(s);
    const incoming = powersConfig.powers[id];
    s.powers.strike(s.target, s.caster, incoming, incoming.channel ? 'tick' : 'active', null);
    assert.equal(s.caster.health, s.caster.stats.maxHealth);
    assert.equal(s.caster.combat.power, power);
    assert.equal(s.caster.vx, 0);
    assert.equal(s.target.vx, 0);
    assert.equal(s.caster.combat.confuseTime, 0);
    assert.equal(s.caster.combat.freezeTime, 0);
    assert.equal(s.caster.combat.chokeTime, 0);
  }
  for (const kind of ['rock', 'saber', 'shove']) {
    const s = setup();
    cast(s);
    if (kind === 'shove') {
      const contact = bladeContact(s);
      contact.attack = s.target.moves.shove;
      contact.attackType = 'shove';
      s.simulation.combat.resolveContact(contact);
    } else {
      const projectiles = s.simulation.projectiles;
      projectiles.fighters = s.fighters;
      if (kind === 'rock') projectiles.spawnThrow(s.target, powersConfig.powers.throw);
      else projectiles.spawnSaber(s.target, 'saberThrow');
      const projectile = projectiles.pool.find(p => p.active);
      projectile.x = s.caster.x;
      projectiles.checkHit(projectile);
      assert.equal(kind === 'rock' ? projectile.active : projectile.returning, kind !== 'rock');
    }
    assert.equal(s.caster.health, s.caster.stats.maxHealth);
    assert.equal(s.caster.combat.power, power);
    assert.equal(s.caster.vx, 0);
    assert.equal(s.target.vx, 0);
  }
});

for (const reversed of [false, true]) {
  for (const [level, count] of [[6, 8], [7, 8], [8, 10], [9, 10], [10, 12]]) {
    it(`marks ${count} deterministic columns at level ${level}, reversed ${reversed}`, () => {
      const s = setup(level, reversed);
      cast(s, 0);
      assert.equal(s.caster.combat.stormPhase, 'invocation');
      assert.equal(s.caster.combat.stormMarks.length, count);
      const interval = (5 - power.strikeWarning) / (count - 1);
      assert.equal(s.caster.combat.stormMarks[0].impactTime, power.startup + 0.5);
      assert.equal(s.caster.combat.stormMarks.at(-1).impactTime, power.startup + 5);
      const timeline = [];
      for (let index = 0; index < count; index++) {
        const mark = s.caster.combat.stormMarks[index];
        assert.ok(Math.abs(mark.impactTime - (power.startup + power.strikeWarning + index * interval)) < 1e-12);
        timeline.push({ time: mark.markTime, index, marking: true });
        timeline.push({ time: mark.impactTime, index, marking: false });
      }
      timeline.sort((a, b) => a.time - b.time);
      const positions = new Map();
      let previousTime = -1;
      for (const entry of timeline) {
        if (entry.time === previousTime) continue;
        previousTime = entry.time;
        s.target.x = 800 + entry.time * 2;
        s.caster.stateTime = entry.time;
        const before = s.simulation.events.length;
        s.powers.resolve(s.fighters, STEP);
        for (const event of s.simulation.events.slice(before)) {
          if (event.type !== CombatEvent.STORM_MARK && event.type !== CombatEvent.STORM_STRIKE) continue;
          const index = s.caster.combat.stormMarks.findIndex(mark => mark.impactTime === event.impactTime);
          const mark = s.caster.combat.stormMarks[index];
          if (event.type === CombatEvent.STORM_MARK) {
            assert.equal(mark.x, s.target.x + power.strikeOffsets[index]);
            positions.set(index, mark.x);
          } else {
            assert.equal(event.x, positions.get(index));
            const hit = s.target.left < mark.x + power.strikeWidth / 2 && s.target.right > mark.x - power.strikeWidth / 2;
            assert.equal(event.hit, hit);
            assert.equal(mark.active, false);
          }
        }
      }
      assert.equal(s.simulation.events.filter(e => e.type === CombatEvent.STORM_STRIKE).length, count);
      assert.equal(s.caster.combat.stormPhase, 'recovery');
      s.caster.stateTime = power.startup + 5 + power.recovery;
      s.powers.resolve(s.fighters, STEP);
      assert.equal(s.caster.combat.power, null);
      assert.equal(s.caster.state, FighterState.IDLE);
      assert.equal(s.caster.combat.powerCooldown, powersConfig.cooldown);
    });
  }
}

for (const difference of [-4, -3, -2, -1, 0, 3]) {
  it(`ignores guard and Absorb, using storm interaction ${difference} with short stun`, () => {
    const s = setup();
    s.target.stats.flowLevel = s.caster.flowLevel - difference;
    s.target.state = FighterState.BLOCKING;
    s.target.combat.absorbTime = 0.3;
    const scale = difference >= 3 ? 1.2 : difference >= -1 ? 1 : difference === -2 ? 0.5 : 0;
    s.powers.strike(s.caster, s.target, power, 'strike', null);
    assert.ok(Math.abs(s.target.stats.maxHealth - s.target.health - power.damage * scale) < 1e-12);
    if (scale) assert.equal(s.target.combat.stunDuration, power.stun);
  });
}

it('hits the real hurtbox inside the column, including airborne targets, never the caster', () => {
  for (const [offset, airborne, hit] of [[0, false, true], [0, true, true], [100, false, false]]) {
    const s = setup();
    cast(s);
    const mark = s.caster.combat.stormMarks[0];
    s.target.x = mark.x + offset;
    s.target.grounded = !airborne;
    if (airborne) s.target.y -= 500;
    s.caster.x = mark.x;
    s.caster.stateTime = mark.impactTime;
    s.powers.resolve(s.fighters, STEP);
    assert.equal(s.target.health < s.target.stats.maxHealth, hit);
    assert.equal(s.caster.health, s.caster.stats.maxHealth);
    assert.equal(s.simulation.events.filter(e => e.type === CombatEvent.STORM_STRIKE).at(-1).hit, hit);
  }
});

it('lets invulnerability escape and drains 30 per blocked ray, dropping depleted Barrier', () => {
  const s = setup();
  cast(s);
  const mark = s.caster.combat.stormMarks[0];
  s.target.state = FighterState.DODGING;
  s.target.stateTime = 0;
  s.target.combat.dodgeProfile = s.target.stats.dodge;
  s.caster.stateTime = mark.impactTime;
  s.powers.resolve(s.fighters, STEP);
  assert.equal(s.target.health, s.target.stats.maxHealth);
  assert.equal(s.simulation.events.filter(e => e.type === CombatEvent.STORM_STRIKE).at(-1).hit, false);
  s.target.state = FighterState.CHANNELING;
  s.target.combat.power = powersConfig.powers.barrier;
  s.target.stateTime = powersConfig.powers.barrier.startup;
  s.target.flowMeter = 45;
  s.powers.strike(s.caster, s.target, power, 'strike', null);
  assert.equal(s.target.flowMeter, 15);
  assert.equal(s.target.combat.powerEndTime, 0);
  s.powers.strike(s.caster, s.target, power, 'strike', null);
  assert.equal(s.target.flowMeter, 0);
  assert.equal(s.target.combat.powerEndTime, s.target.stateTime);
  assert.equal(s.target.health, s.target.stats.maxHealth);
  s.powers.strike(s.caster, s.target, power, 'strike', null);
  assert.equal(s.target.stats.maxHealth - s.target.health, power.damage);
});

it('snapshots pending marks deeply, preserves phase and target, and clears on round reset', () => {
  const s = setup();
  cast(s);
  const snapshot = captureFighter(s.caster);
  const marks = structuredClone(snapshot.combat.stormMarks);
  s.caster.combat.stormMarks[0].x += 100;
  s.caster.combat.stormMarks[0].active = false;
  assert.deepEqual(snapshot.combat.stormMarks, marks);
  restoreFighter(s.caster, snapshot);
  assert.deepEqual(s.caster.combat.stormMarks, marks);
  assert.equal(s.caster.combat.stormPhase, 'storm');
  assert.equal(s.caster.combat.stormTarget, 1);
  s.caster.combat.stormMarks[0].x -= 100;
  assert.deepEqual(snapshot.combat.stormMarks, marks);
  s.caster.resetForRound(500, 1);
  assert.equal(s.caster.combat.stormPhase, null);
  assert.deepEqual(s.caster.combat.stormMarks, []);
});

it('AI casts only within 600px without pressure and flees marked columns after reaction', () => {
  const s = setup();
  const ai = new EnemyAI({ self: s.caster, opponent: s.target, arena, profile: aiConfig.profiles.balanced, difficulty: aiConfig.difficulties.hard, perception: aiConfig.perception, random: () => 0, rules: { powers: true } });
  assert.equal(ai.tryPower(), AiDecision.POWER);
  ai.writeIntent(s.caster.intent);
  assert.equal(s.caster.intent.powerHeld, false);
  s.target.x = s.caster.x + 601;
  assert.equal(ai.wantsPower(power), false);
  s.target.x = s.caster.x + 40;
  s.target.combat.attack = s.target.moves.light;
  s.target.combat.attackType = 'light';
  s.target.state = FighterState.ATTACKING;
  assert.equal(ai.wantsPower(power), false);
  s.target.clearAttack();
  s.target.state = FighterState.IDLE;
  s.target.x = 800;
  cast(s);
  const defender = new EnemyAI({ self: s.target, opponent: s.caster, arena, profile: aiConfig.profiles.balanced, difficulty: aiConfig.difficulties.hard, perception: aiConfig.perception, random: () => 0, rules: { powers: true } });
  const mark = s.caster.combat.stormMarks[0];
  assert.equal(defender.tryEscapeStorm(), null);
  s.caster.stateTime = mark.markTime + defender.difficulty.reactionTime;
  assert.equal(findStormThreat(s.target, s.caster, defender.difficulty.reactionTime, 8), mark);
  assert.equal(defender.tryEscapeStorm(), AiDecision.BACK_OFF);
  defender.writeIntent(s.target.intent);
  assert.notEqual(s.target.intent.moveX, 0);
  assert.equal(s.target.intent.block, false);
  s.caster.stateTime = mark.impactTime - STEP;
  assert.equal(defender.tryEscapeStorm(), AiDecision.DODGE);
  s.target.x = 1100;
  assert.equal(defender.tryEscapeStorm(), null);
});

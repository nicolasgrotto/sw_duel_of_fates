import { it } from 'node:test';
import assert from 'node:assert/strict';
import { powersConfig } from '../src/config/powersConfig.js';
import { ProjectileKind, projectilesConfig } from '../src/config/projectilesConfig.js';
import { resolveLevelBand } from '../src/combat/flowInteractions.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { captureFighter, restoreFighter } from '../src/simulation/ReplayBuffer.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { AiDecision, EnemyAI } from '../src/ai/EnemyAI.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { spawnFighter, createSimulation } from './helpers.js';

const power = powersConfig.powers.arsenal;
function setup(level = powersConfig.tiers.at(-1).minLevel, reversed = false) {
  const caster = spawnFighter(300), target = spawnFighter(600, -1);
  caster.stats = { ...caster.stats, flowLevel: level, power: { ...caster.stats.power, potency: 1, loadout: { neutral: power } } };
  target.stats = { ...target.stats, flowLevel: level, power: { ...target.stats.power, potency: 1 } };
  const fighters = reversed ? [target, caster] : [caster, target];
  const simulation = createSimulation(fighters, { powers: true });
  simulation.projectiles.fighters = fighters;
  const system = simulation.combat.powers;
  system.arsenals.start(caster, power);
  return { caster, target, fighters, simulation, system };
}

for (const tier of powersConfig.tiers) {
  it('creates the configured deterministic orbit for tier ' + tier.id, () => {
    const s = setup(tier.minLevel);
    assert.equal(s.caster.combat.arsenal.objects.length, resolveLevelBand(tier.minLevel, power.objectsByTier).objects);
    assert.equal(s.caster.combat.arsenal.angle, power.orbit.initialAngle);
    const before = s.system.arsenals.frontIndex(s.caster);
    s.system.arsenals.update(s.caster, power.orbit.period);
    assert.equal(s.system.arsenals.frontIndex(s.caster), before);
  });
}

it('pays only the original invocation and installs the orbit after startup', () => {
  const s = setup();
  s.caster.combat.arsenal = null;
  s.caster.flowMeter = s.caster.stats.power.max;
  assert.equal(s.system.tryCast(s.caster), true);
  assert.equal(s.caster.flowMeter, s.caster.stats.power.max - power.cost);
  s.caster.stateTime = power.startup / 2;
  s.system.resolve(s.fighters, 0);
  assert.equal(s.caster.combat.arsenal, null);
  s.caster.stateTime = power.startup;
  s.system.resolve(s.fighters, 0);
  assert.ok(s.caster.combat.arsenal);
});

it('repeating the command launches the front object for free without opening power cooldown', () => {
  const s = setup();
  s.caster.flowMeter = 0;
  s.caster.combat.powerCooldown = powersConfig.cooldown;
  const index = s.system.arsenals.frontIndex(s.caster);
  const id = s.caster.combat.arsenal.objects[index].id;
  assert.equal(s.system.tryCast(s.caster), true);
  assert.equal(s.caster.flowMeter, 0);
  assert.equal(s.caster.state, FighterState.CASTING);
  assert.equal(s.caster.canMove, false);
  assert.equal(s.caster.canAct, false);
  assert.ok(!s.caster.combat.arsenal.objects.some(o => o.id === id));
  const shot = s.simulation.projectiles.pool.find(p => p.active);
  assert.equal(shot.kind, ProjectileKind.THROW);
  assert.equal(shot.radius, projectilesConfig.arsenal.radius);
  assert.equal(shot.vx, projectilesConfig.arsenal.speed);
  s.caster.stateTime = power.launch.recovery;
  s.system.resolve(s.fighters, 0);
  assert.equal(s.caster.state, FighterState.IDLE);
  assert.equal(s.caster.combat.powerCooldown, powersConfig.cooldown);
  assert.equal(s.system.tryCast(s.caster), false);
  s.system.arsenals.update(s.caster, power.launchInterval);
  assert.equal(s.system.tryCast(s.caster), true);
  assert.ok(s.simulation.events.some(e => e.type === CombatEvent.ARSENAL_LAUNCH));
});

it('retains the object and meter when the projectile pool is full', () => {
  const s = setup();
  for (let i = 0; i < projectilesConfig.capacity; i++) s.simulation.projectiles.spawnWave(s.target, powersConfig.powers.flowCleave);
  const count = s.caster.combat.arsenal.objects.length, meter = s.caster.flowMeter;
  assert.equal(s.system.tryCast(s.caster), false);
  assert.equal(s.caster.combat.arsenal.objects.length, count);
  assert.equal(s.caster.flowMeter, meter);
});

for (const source of ['throw', 'flowCleave', 'arsenal', 'saber']) {
  for (const reversed of [false, true]) {
    it('consumes one orbit object to intercept ' + source + ', reversed ' + reversed, () => {
      const s = setup(undefined, reversed);
      const count = s.caster.combat.arsenal.objects.length;
      if (source === 'throw') s.simulation.projectiles.spawnThrow(s.target, powersConfig.powers.throw);
      if (source === 'flowCleave') s.simulation.projectiles.spawnWave(s.target, powersConfig.powers.flowCleave);
      if (source === 'arsenal') s.simulation.projectiles.spawnArsenal(s.target, power, s.target.x, s.target.y);
      if (source === 'saber') s.simulation.projectiles.spawnSaber(s.target, 'saberThrow');
      const shot = s.simulation.projectiles.pool.find(p => p.active);
      shot.x = s.caster.x;
      shot.y = s.caster.y - s.caster.height / 2;
      s.simulation.projectiles.checkHit(shot);
      assert.equal(s.caster.combat.arsenal.objects.length, count - 1);
      assert.equal(s.caster.health, s.caster.stats.maxHealth);
      assert.equal(shot.active, source === 'saber');
      if (source === 'saber') {
        assert.equal(shot.returning, true);
        s.simulation.projectiles.checkHit(shot);
        assert.equal(s.caster.combat.arsenal.objects.length, count - 1);
      }
      assert.ok(s.simulation.events.some(e => e.type === CombatEvent.ARSENAL_BLOCK));
    });
  }
}

it('does not intercept lightning or protect during dodge invulnerability', () => {
  const s = setup();
  const count = s.caster.combat.arsenal.objects.length;
  s.system.strike(s.target, s.caster, powersConfig.powers.lightning, 'tick');
  assert.equal(s.caster.combat.arsenal.objects.length, count);
  assert.ok(s.caster.health < s.caster.stats.maxHealth);
  s.caster.state = FighterState.DODGING;
  s.caster.stateTime = 0;
  s.caster.combat.dodgeProfile = s.caster.stats.dodge;
  const shot = s.simulation.projectiles.spawnWave(s.target, powersConfig.powers.flowCleave);
  shot.x = s.caster.x;
  s.simulation.projectiles.checkHit(shot);
  assert.equal(s.caster.combat.arsenal.objects.length, count);
  assert.equal(shot.active, true);
});

it('expires on duration, death and reset and deeply snapshots objects and orbit clocks', () => {
  const s = setup();
  const snapshot = captureFighter(s.caster);
  s.caster.combat.arsenal.objects[0].offset++;
  assert.notEqual(snapshot.combat.arsenal.objects[0].offset, s.caster.combat.arsenal.objects[0].offset);
  restoreFighter(s.caster, snapshot);
  s.caster.combat.arsenal.time++;
  assert.equal(snapshot.combat.arsenal.time, 0);
  s.system.arsenals.update(s.caster, power.duration);
  assert.equal(s.caster.combat.arsenal, null);
  s.system.arsenals.start(s.caster, power);
  s.caster.state = FighterState.DEAD;
  s.system.arsenals.update(s.caster, 0);
  assert.equal(s.caster.combat.arsenal, null);
  s.system.arsenals.start(s.caster, power);
  s.caster.resetForRound(300, 1);
  assert.equal(s.caster.combat.arsenal, null);
});

for (const aware of [false, true]) {
  it('lets AI launch without meter but reserve an object when aware ' + aware, () => {
    const s = setup();
    s.caster.flowMeter = 0;
    s.caster.combat.arsenal.objects.length = aiConfig.perception.powerUse.arsenal.reserveObjects;
    s.target.stats = { ...s.target.stats, power: { ...s.target.stats.power, loadout: { neutral: powersConfig.powers.throw } } };
    const ai = new EnemyAI({ self: s.caster, opponent: s.target, profile: aiConfig.profiles.balanced,
      difficulty: { ...aiConfig.difficulties.normal, powerAware: aware, powerMultiplier: 100 },
      perception: aiConfig.perception, random: () => 0, rules: { powers: true } });
    assert.equal(ai.tryPower(), aware ? null : AiDecision.POWER);
    s.caster.combat.arsenal = null;
    ai.attackCooldown = 0;
    s.caster.flowMeter = s.caster.stats.power.max;
    assert.equal(ai.tryPower(), AiDecision.POWER);
  });
}

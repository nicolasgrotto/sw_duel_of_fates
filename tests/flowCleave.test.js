import { it } from 'node:test';
import assert from 'node:assert/strict';
import { powersConfig } from '../src/config/powersConfig.js';
import { ProjectileKind, projectilesConfig } from '../src/config/projectilesConfig.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { captureProjectiles, restoreProjectiles } from '../src/combat/ProjectileSystem.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { AiDecision, EnemyAI } from '../src/ai/EnemyAI.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { spawnFighter, createSimulation } from './helpers.js';

const power = powersConfig.powers.flowCleave;
function setup(reversed = false) {
  const caster = spawnFighter(300), target = spawnFighter(600, -1);
  for (const f of [caster, target]) f.stats = { ...f.stats, flowLevel: 6, power: { ...f.stats.power, potency: 1, loadout: { neutral: power } } };
  const fighters = reversed ? [target, caster] : [caster, target];
  const simulation = createSimulation(fighters, { powers: true });
  simulation.projectiles.fighters = fighters;
  const wave = simulation.projectiles.spawnWave(caster, power);
  return { caster, target, fighters, simulation, wave };
}
function contact(s, target = s.target) {
  s.wave.x = target.x;
  s.simulation.projectiles.checkHit(s.wave);
}
function parry(fighter, time = 0) {
  fighter.state = FighterState.BLOCKING;
  fighter.combat.parryArmed = true;
  fighter.combat.parryTime = time;
}

it('pays configured Flow Cleave cost and launches after startup', () => {
  const s = setup();
  s.simulation.projectiles.release(s.wave);
  s.caster.flowMeter = s.caster.stats.power.max;
  assert.equal(s.simulation.combat.powers.tryCast(s.caster), true);
  assert.equal(s.caster.flowMeter, s.caster.stats.power.max - power.cost);
  s.caster.stateTime = power.startup / 2;
  s.simulation.combat.powers.resolve(s.fighters, 0);
  assert.equal(s.simulation.projectiles.pool.some(p => p.active), false);
  s.caster.stateTime = power.startup;
  s.simulation.combat.powers.resolve(s.fighters, 0);
  assert.equal(s.simulation.projectiles.pool.filter(p => p.active && p.kind === ProjectileKind.WAVE).length, 1);
});

it('uses configured speed and range and reuses the pool without reflection residue', () => {
  const s = setup();
  s.target.x = s.simulation.combat.arena.right;
  assert.equal(s.wave.vx, projectilesConfig.wave.speed);
  s.wave.reflected = true;
  s.simulation.projectiles.advance(s.wave, power.range / projectilesConfig.wave.speed);
  assert.equal(s.wave.distance, power.range);
  assert.equal(s.wave.active, false);
  const reused = s.simulation.projectiles.spawnWave(s.caster, power);
  assert.equal(reused, s.wave);
  assert.equal(reused.reflected, false);
  assert.equal(reused.distance, 0);
});

it('hits once with configured projectile damage', () => {
  const s = setup();
  contact(s);
  assert.equal(s.target.health, s.target.stats.maxHealth - projectilesConfig.wave.damage);
  assert.equal(s.wave.active, false);
});

for (const front of [true, false]) {
  it('uses projectile direction for guard, front ' + front, () => {
    const s = setup();
    s.target.state = FighterState.BLOCKING;
    s.target.facing = front ? -1 : 1;
    const stamina = s.target.stamina;
    contact(s);
    assert.equal(s.target.health, s.target.stats.maxHealth - (front ? 0 : projectilesConfig.wave.damage));
    if (front) assert.ok(s.target.stamina < stamina);
  });
}

for (const defense of ['absorb', 'barrier', 'dodge']) {
  it('respects ' + defense + ' against Flow Cleave', () => {
    const s = setup();
    if (defense === 'absorb') s.target.combat.absorbTime = powersConfig.powers.absorb.window;
    if (defense === 'barrier') {
      s.target.state = FighterState.CHANNELING;
      s.target.combat.power = powersConfig.powers.barrier;
      s.target.stateTime = powersConfig.powers.barrier.startup;
      s.target.flowMeter = s.target.stats.power.max;
    }
    if (defense === 'dodge') {
      s.target.state = FighterState.DODGING;
      s.target.combat.dodgeProfile = s.target.stats.dodge;
    }
    contact(s);
    assert.equal(s.target.health, s.target.stats.maxHealth);
    assert.equal(s.wave.active, defense === 'dodge');
  });
}

it('uses the throw resistance table for a three-level disadvantage', () => {
  const s = setup();
  s.caster.stats = { ...s.caster.stats, flowLevel: s.target.flowLevel - 3 };
  contact(s);
  assert.equal(s.target.health, s.target.stats.maxHealth);
  assert.ok(s.simulation.events.some(e => e.type === CombatEvent.POWER_RESISTED));
});

for (const reversed of [false, true]) {
  it('reflects once with owner, direction, damage and remaining range preserved, reversed ' + reversed, () => {
    const s = setup(reversed);
    s.wave.distance = power.range / 3;
    const damage = s.wave.damage, potency = s.wave.potency, distance = s.wave.distance;
    parry(s.target);
    contact(s);
    assert.equal(s.wave.owner, s.fighters.indexOf(s.target));
    assert.equal(s.wave.vx, -projectilesConfig.wave.speed);
    assert.equal(s.wave.damage, damage);
    assert.equal(s.wave.potency, potency);
    assert.equal(s.wave.distance, distance);
    assert.equal(s.wave.reflected, true);
    assert.ok(s.simulation.events.some(e => e.type === CombatEvent.WAVE_REFLECT));
    const snapshot = captureProjectiles(s.simulation.projectiles);
    s.wave.distance++;
    restoreProjectiles(s.simulation.projectiles, snapshot);
    assert.equal(s.wave.distance, distance);
    parry(s.caster);
    contact(s, s.caster);
    assert.equal(s.wave.active, false);
    assert.equal(s.caster.health, s.caster.stats.maxHealth);
    assert.equal(s.simulation.events.filter(e => e.type === CombatEvent.WAVE_REFLECT).length, 1);
  });
}

it('treats an ordinary parry at the perfect-window boundary as guard', () => {
  const s = setup();
  parry(s.target, s.target.stats.parry.perfectWindow);
  contact(s);
  assert.equal(s.wave.reflected, false);
  assert.equal(s.wave.active, false);
  assert.equal(s.target.health, s.target.stats.maxHealth);
});

it('lets AI request Flow Cleave within its configured range', () => {
  const s = setup();
  const ai = new EnemyAI({ self: s.caster, opponent: s.target, profile: aiConfig.profiles.balanced,
    difficulty: { ...aiConfig.difficulties.normal, powerMultiplier: 100 },
    perception: aiConfig.perception, random: () => 0, rules: { powers: true } });
  s.caster.flowMeter = s.caster.stats.power.max;
  assert.equal(ai.tryPower(), AiDecision.POWER);
});

it('lets aware AI schedule a perfect parry for an incoming wave', () => {
  const s = setup();
  const ai = new EnemyAI({ self: s.target, opponent: s.caster, profile: aiConfig.profiles.balanced,
    difficulty: { ...aiConfig.difficulties.hard, perfectParryChance: 1 },
    perception: aiConfig.perception, random: () => 0, rules: { powers: true }, projectiles: s.simulation.projectiles });
  assert.equal(ai.tryDefendProjectile(s.wave), AiDecision.PARRY);
  assert.ok(ai.plan.parryDelay >= 0);
});

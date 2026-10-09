import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AiDecision, EnemyAI } from '../src/ai/EnemyAI.js';
import { findIncomingProjectile } from '../src/ai/perception.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { bladeTechniques } from '../src/config/movesConfig.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';

function setup(gap = 80) {
  const self = spawnFighter(500, 1);
  const opponent = spawnFighter(500 + gap + self.width, -1, 'shadow');
  self.flowMeter = opponent.flowMeter = 100;
  self.stats = { ...self.stats, flowLevel: 7, power: { ...self.stats.power, loadout: {} } };
  opponent.stats = { ...opponent.stats, flowLevel: 7 };
  const simulation = createSimulation([self, opponent], { powers: true });
  simulation.step(STEP);
  const ai = new EnemyAI({ self, opponent, projectiles: simulation.projectiles, rules: { powers: true }, random: () => 0,
    profile: { ...aiConfig.profiles.balanced, powerChance: 1, blockChance: 1, shoveChance: 1, techniqueChance: 1 },
    difficulty: { ...aiConfig.difficulties.hard, powerAware: true, powerMultiplier: 1, defenseMultiplier: 1 }, perception: aiConfig.perception });
  return { self, opponent, ai, simulation };
}

function casting(fighter, power, active = false) {
  fighter.combat.power = power;
  fighter.state = power.channel ? FighterState.CHANNELING : FighterState.CASTING;
  fighter.stateTime = active ? power.startup : 0;
}

describe('AI ability coverage', () => {
  for (const id of ['spin', 'dashSlash', 'saberThrow']) {
    it(`requests ${id} only while its blade is available and powers are enabled`, () => {
      const { self, ai } = setup(30);
      self.stats.techniques = { forward: id };
      self.stats.attacks = { ...self.moves, [id]: { ...self.moves.heavy, ...bladeTechniques[id] } };
      assert.equal(ai.tryTechnique(), AiDecision.TECHNIQUE);
      ai.writeIntent(self.intent);
      assert.equal(self.intent.special, true);
      ai.attackCooldown = 0;
      self.combat.saberThrown = true;
      assert.equal(ai.tryTechnique(), null);
      self.combat.saberThrown = false;
      ai.powersEnabled = false;
      assert.equal(ai.tryTechnique(), null);
    });
  }

  for (const [id, gap] of Object.entries({ push: 40, pull: 280, lightning: 180, throw: 240, choke: 60, freeze: 140, storm: 40, heal: 200, focus: 200, redirect: 180 })) {
    it(`requests ${id} by intent without modifying combat resources`, () => {
      const { self, opponent, ai } = setup(gap);
      self.stats.power.loadout.neutral = powersConfig.powers[id];
      if (id === 'heal') self.health = self.stats.maxHealth / 3;
      if (id === 'focus') self.stamina = self.stats.maxStamina / 3;
      if (id === 'redirect') casting(opponent, powersConfig.powers.lightning, true);
      const before = [self.health, self.stamina, self.flowMeter, opponent.health];
      assert.equal(ai.tryPower(), AiDecision.POWER);
      ai.writeIntent(self.intent);
      assert.equal(self.intent.power, true);
      assert.deepEqual([self.health, self.stamina, self.flowMeter, opponent.health], before);
      ai.powersEnabled = false;
      ai.attackCooldown = 0;
      assert.equal(ai.tryPower(), null);
    });
  }

  for (const id of ['push', 'pull', 'lightning', 'throw', 'choke', 'freeze', 'storm']) {
    it(`guards against incoming ${id} and avoids an unblockable band`, () => {
      const { self, opponent, ai } = setup(60);
      casting(opponent, powersConfig.powers[id]);
      assert.equal(ai.tryDefendPower(), AiDecision.BLOCK);
      if (['push', 'choke', 'freeze', 'storm'].includes(id)) {
        opponent.stats.flowLevel = 10;
        ai.plan.blockTime = 0;
        assert.equal(ai.tryDefendPower(), AiDecision.DODGE);
        ai.writeIntent(self.intent);
        assert.equal(self.intent.dodge, true);
        assert.equal(self.intent.block, false);
      }
    });
  }

  it('finds barrier in any slot, avoids wasting offensive powers and shoves it at close range', () => {
    const { self, opponent, ai } = setup(10);
    self.stats.power.loadout.forward = powersConfig.powers.barrier;
    assert.equal(ai.tryBarrier(0.5), true);
    assert.equal(ai.plan.moveX, self.facing);
    casting(opponent, powersConfig.powers.barrier, true);
    assert.equal(ai.wantsPower(powersConfig.powers.push), false);
    ai.attackCooldown = 0;
    assert.equal(ai.tryShove(), AiDecision.SHOVE);
  });

  for (const id of ['heal', 'focus']) {
    it(`approaches and interrupts ${id} instead of guarding`, () => {
      const { self, opponent, ai } = setup(200);
      casting(opponent, powersConfig.powers[id]);
      assert.equal(ai.tryDefendPower(), null);
      assert.equal(ai.tryCounter(), AiDecision.APPROACH);
      opponent.x = self.x + 60;
      assert.equal(ai.tryCounter(), AiDecision.COUNTER);
    });
  }

  it('does not start or hold lightning into a redirect window', () => {
    const { self, opponent, ai } = setup(180);
    opponent.combat.redirectTime = 0.3;
    assert.equal(ai.wantsPower(powersConfig.powers.lightning), false);
    casting(self, powersConfig.powers.lightning, true);
    ai.plan.powerHoldTime = 1;
    ai.decide();
    ai.writeIntent(self.intent);
    assert.equal(self.intent.powerHeld, false);
  });
});

describe('AI projectiles in flight', () => {
  for (const kind of ['throw', 'saber']) {
    it(`tracks ${kind} after recovery and ignores friendly, receding or spent projectiles`, () => {
      const { self, opponent, ai, simulation } = setup(180);
      const system = simulation.projectiles;
      if (kind === 'throw') system.spawnThrow(opponent, powersConfig.powers.throw);
      else system.spawnSaber(opponent, 'saberThrow');
      const projectile = system.pool.find(p => p.active);
      assert.equal(opponent.combat.power, null);
      assert.equal(findIncomingProjectile(self, system, 0.45), projectile);
      assert.equal(ai.tryDefendProjectile(), AiDecision.BLOCK);
      assert.equal(ai.tryDefendProjectile(), AiDecision.BLOCK);
      projectile.hit = true;
      assert.equal(findIncomingProjectile(self, system, 0.45), null);
      projectile.hit = false;
      projectile.vx *= -1;
      assert.equal(findIncomingProjectile(self, system, 0.45), null);
      projectile.vx *= -1;
      projectile.owner = 0;
      assert.equal(findIncomingProjectile(self, system, 0.45), null);
      projectile.owner = 1;
      projectile.y = self.top - projectile.radius - 1;
      assert.equal(findIncomingProjectile(self, system, 0.45), null);
    });
  }

  it('dodges a returning blade from behind and ignores projectiles in classic rules', () => {
    const { self, opponent, ai, simulation } = setup();
    simulation.projectiles.spawnSaber(opponent, 'saberThrow');
    const projectile = simulation.projectiles.pool[0];
    projectile.x = self.x - 100;
    projectile.vx = 900;
    projectile.returning = true;
    assert.equal(ai.tryDefendProjectile(), AiDecision.DODGE);
    ai.powersEnabled = false;
    assert.equal(ai.tryDefendProjectile(), null);
  });
});

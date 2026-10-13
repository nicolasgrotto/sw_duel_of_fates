import { it } from 'node:test';
import assert from 'node:assert/strict';
import { EnemyAI, AiDecision } from '../src/ai/EnemyAI.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { STEP, spawnFighter, createSimulation } from './helpers.js';

function setup(gap, side = 1, powers = true) {
  const self = spawnFighter(500, 1, 'reaper');
  const opponent = spawnFighter(500 + side * (gap + self.width / 2 + 23), -side);
  self.flowMeter = self.stats.power.max;
  const ai = new EnemyAI({ self, opponent, profile: aiConfig.profiles.reaper,
    difficulty: { ...aiConfig.difficulties.normal, mistakeChance: 0 }, perception: aiConfig.perception, random: () => 0.1,
    rules: { powers } });
  return { self, opponent, ai };
}

for (const side of [-1, 1]) {
  for (const powers of [false, true]) {
    it(`requests neutral Twin Wheel at close range on side ${side}, powers ${powers}`, () => {
      const { ai, self } = setup(15, side, powers);
      ai.updateIntent(self.intent, STEP);
      assert.equal(ai.decision, AiDecision.SPECIAL);
      assert.equal(self.intent.special, true);
      assert.equal(self.intent.moveX, 0);
      assert.equal(self.combat.attack, null);
    });
  }
}

it('requests wrath before directional pressure and avoids reapplying active wrath', () => {
  const { ai, self, opponent } = setup(150);
  ai.updateIntent(self.intent, STEP);
  assert.equal(ai.decision, AiDecision.POWER);
  assert.equal(self.intent.power, true);
  assert.equal(self.intent.moveX, -1);
  const simulation = createSimulation([self, opponent], { powers: true });
  simulation.step(STEP);
  assert.equal(self.combat.power.id, 'wrath');
  self.combat.wrathTime = 1;
  ai.attackCooldown = 0;
  ai.resetPlan();
  assert.equal(ai.tryPower(true), null);
});

it('does not request wrath without powers, meter or cooldown availability', () => {
  for (const condition of ['disabled', 'meter', 'cooldown']) {
    const { ai, self } = setup(150, 1, condition !== 'disabled');
    if (condition === 'meter') self.flowMeter = 0;
    if (condition === 'cooldown') self.combat.powerCooldown = 1;
    assert.equal(ai.tryPower(true), null);
  }
});

it('chains both connected light recoveries into the third strike through intents', () => {
  const { ai, self, opponent } = setup(15, 1, false);
  const simulation = createSimulation([self, opponent]);
  simulation.combat.tryAttack(self, 'light');
  for (const next of ['light2', 'light3']) {
    self.combat.attackConnected = true;
    self.stateTime = self.combat.attack.startup + self.combat.attack.active + STEP;
    ai.tryChain();
    ai.writeIntent(self.intent);
    assert.equal(self.intent.lightAttack, true);
    simulation.step(STEP);
    assert.equal(self.combat.attackType, next);
  }
  self.combat.attackConnected = true;
  self.stateTime = self.combat.attack.startup + self.combat.attack.active + STEP;
  ai.tryChain();
  ai.writeIntent(self.intent);
  assert.equal(self.intent.lightAttack, false);
});

function freeze(value) {
  for (const child of Object.values(value)) if (child && typeof child === 'object' && !Object.isFrozen(child)) freeze(child);
  return Object.freeze(value);
}

it('reads frozen fighters while requesting wrath and Twin Wheel only through actions', () => {
  for (const gap of [15, 150]) {
    const { ai, self, opponent } = setup(gap);
    freeze(self);
    freeze(opponent);
    const intent = {};
    assert.doesNotThrow(() => ai.updateIntent(intent, STEP));
    assert.equal(gap === 15 ? intent.special : intent.power, true);
  }
});

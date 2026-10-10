import { it } from 'node:test';
import assert from 'node:assert/strict';
import { EnemyAI, AiDecision } from '../src/ai/EnemyAI.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { captureFighter } from '../src/simulation/ReplayBuffer.js';
import { isNeutralForFocus } from '../src/combat/StatusSystem.js';
import { FighterState } from '../src/entities/fighterStates.js';
import './consequenceHelpers.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';

const RULES = { powers: true, exhaustion: true, wounds: true, focusEvade: true };

function setup({ id = 'guardian', gap = 40, priorities = ['attack'], rules = RULES } = {}) {
  const self = spawnFighter(400, 1, id);
  const opponent = spawnFighter(400 + self.width / 2 + 23 + gap, -1, 'shadow');
  const simulation = createSimulation([self, opponent], rules);
  const ai = new EnemyAI({
    self, opponent, rules, random: () => 0, perception: aiConfig.perception,
    profile: { ...aiConfig.profiles.balanced, priorities, attackChance: 1, heavyChance: 0, powerChance: 1 },
    difficulty: { ...aiConfig.difficulties.hard, mistakeChance: 0, attackTell: 0, parryChance: 0, perfectParryChance: 0 },
  });
  return { self, opponent, simulation, ai };
}

function requestOnly(duel) {
  const before = [duel.self, duel.opponent].map(captureFighter);
  duel.ai.updateIntent(duel.self.intent, STEP);
  assert.deepEqual([duel.self, duel.opponent].map(captureFighter), before);
  return duel.self.intent;
}

it('requests a wound-capable heavy against exhaustion and respects the quota', () => {
  const duel = setup();
  duel.opponent.combat.exhausted = true;
  const intent = requestOnly(duel);
  assert.equal(intent.heavyAttack, true);
  assert.equal(intent.moveX, duel.self.facing);
  duel.simulation.step(STEP);
  assert.equal(duel.self.combat.attackType, 'forwardHeavy');
  const spent = setup();
  spent.opponent.combat.exhausted = true;
  spent.opponent.combat.woundUsed = true;
  assert.equal(requestOnly(spent).heavyAttack, false);
});

it('preserves the stamina reserve except when a hit can finish the opponent', () => {
  const duel = setup();
  duel.self.stamina = duel.self.moves.light.staminaCost + duel.self.stats.maxStamina * 0.1;
  assert.equal(duel.ai.startAttack(false), false);
  duel.opponent.health = 1;
  assert.equal(duel.ai.startAttack(false), true);
  duel.ai.writeIntent(duel.self.intent);
  assert.equal(duel.self.intent.lightAttack, true);
  duel.simulation.step(STEP);
  assert.equal(duel.self.combat.exhausted, true);
});

it('requests healing for a full-health wounded fighter', () => {
  const duel = setup({ gap: 220, priorities: ['power'] });
  duel.self.flowMeter = 100;
  duel.self.combat.wound = 'arm';
  duel.self.combat.woundUsed = true;
  const intent = requestOnly(duel);
  assert.equal(intent.power, true);
  assert.equal(intent.moveX, duel.self.facing);
  duel.simulation.step(STEP);
  assert.equal(duel.self.combat.power.id, 'heal');
});

it('requests wrath from a supplied loadout and guards or retreats against active wrath', () => {
  const use = setup({ id: 'shadow', gap: 220, priorities: ['power'] });
  use.self.flowMeter = 100;
  use.self.stats.power.loadout.forward = powersConfig.powers.wrath;
  assert.equal(requestOnly(use).power, true);
  use.simulation.step(STEP);
  assert.equal(use.self.combat.power.id, 'wrath');
  const retreat = setup();
  retreat.simulation.combat.powers.applySelf(retreat.opponent, powersConfig.powers.wrath);
  assert.equal(requestOnly(retreat).moveX, -retreat.self.facing);
  assert.equal(retreat.ai.decision, AiDecision.BACK_OFF);
  const guard = setup();
  guard.simulation.combat.powers.applySelf(guard.opponent, powersConfig.powers.wrath);
  guard.simulation.combat.tryAttack(guard.opponent, 'light');
  assert.equal(requestOnly(guard).block, true);
  assert.equal(guard.ai.decision, AiDecision.GUARD);
});

it('requests true neutral focus posture and cancels pending defense and held actions', () => {
  const duel = setup({ id: 'bastion', priorities: ['defend', 'attack'] });
  duel.self.flowMeter = 100;
  duel.simulation.combat.powers.applySelf(duel.self, powersConfig.powers.focus);
  duel.simulation.combat.tryAttack(duel.opponent, 'light');
  duel.ai.plan.parryDelay = 1;
  duel.ai.plan.blockTime = 1;
  duel.ai.plan.powerHoldTime = 1;
  duel.ai.plan.chargeHoldTime = 1;
  requestOnly(duel);
  assert.equal(duel.ai.decision, AiDecision.FOCUS_WAIT);
  assert.equal(isNeutralForFocus(duel.self), true);
});

it('answers the opponents neutral focus with a shove intent', () => {
  const duel = setup({ gap: 10, priorities: ['shove'] });
  duel.opponent.flowMeter = 100;
  duel.simulation.combat.powers.applySelf(duel.opponent, powersConfig.powers.focus);
  const intent = requestOnly(duel);
  assert.equal(duel.ai.decision, AiDecision.SHOVE);
  assert.equal(intent.block, true);
  assert.equal(intent.lightAttack, true);
});

it('uses wound-derived dash costs and stops requesting second jumps with a leg wound', () => {
  const duel = setup({ id: 'wasp' });
  duel.self.combat.wound = 'leg';
  duel.self.stamina = duel.self.stats.airDash.staminaCost;
  assert.equal(duel.ai.canSpend(duel.self.stats.airDash.staminaCost, null, 'dash'), false);
  duel.self.grounded = false;
  duel.self.state = FighterState.JUMPING;
  duel.self.combat.jumpsUsed = 1;
  assert.equal(duel.ai.tryAirJump(), false);
});

it('keeps the legacy attack choice when new capabilities are disabled', () => {
  const duel = setup({ rules: { powers: true } });
  duel.opponent.combat.exhausted = true;
  assert.equal(requestOnly(duel).heavyAttack, false);
});

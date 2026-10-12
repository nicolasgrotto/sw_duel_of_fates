import { it } from 'node:test';
import assert from 'node:assert/strict';
import { powersConfig } from '../src/config/powersConfig.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { EnemyAI, AiDecision } from '../src/ai/EnemyAI.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { captureFighter, restoreFighter } from '../src/simulation/ReplayBuffer.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';

const power = powersConfig.powers.supremePush;
function setup() {
  const caster = spawnFighter(500, 1), target = spawnFighter(650, -1);
  caster.stats = { ...caster.stats, power: { ...caster.stats.power, potency: 1, loadout: { neutral: power } } };
  target.stats = { ...target.stats, flowLevel: caster.flowLevel };
  caster.flowMeter = 100;
  const simulation = createSimulation([caster, target], { powers: true });
  return { caster, target, simulation, combat: simulation.combat };
}
for (const state of [FighterState.HIT, FighterState.STAGGERED, FighterState.BLOCKING]) it('escapes ' + state + ' through the action buffer', () => {
  const s = setup(); s.caster.state = state; s.caster.combat.stunDuration = 1; s.caster.combat.blockstun = 1;
  s.caster.intent.power = true; s.simulation.step(STEP);
  assert.equal(s.caster.state, FighterState.CASTING);
  assert.equal(s.caster.combat.powerMode, 'escape');
  assert.equal(s.caster.combat.power.startup, power.escape.startup);
  assert.ok(s.simulation.events.some(e => e.type === CombatEvent.POWER_START && e.mode === 'escape'));
});
for (const state of [FighterState.STUNNED, FighterState.BLADE_LOCK, FighterState.DEAD, FighterState.ATTACKING, FighterState.CASTING, FighterState.CHANNELING]) it('cannot cast supreme push in ' + state, () => {
  const s = setup(); s.caster.state = state;
  if (state === FighterState.CASTING || state === FighterState.CHANNELING) s.caster.combat.power = powersConfig.powers.lightning;
  assert.equal(s.combat.powers.tryCast(s.caster), false);
  assert.equal(s.caster.flowMeter, 100);
});
for (const side of [-1, 1]) it('pushes away on side ' + side + ' and respects the radial boundary', () => {
  const s = setup(); s.target.x = s.caster.x + side * power.range;
  assert.equal(s.combat.powers.tryCast(s.caster), true);
  s.caster.stateTime = power.startup; s.combat.powers.resolve([s.caster, s.target], STEP);
  assert.equal(s.target.health, s.target.stats.maxHealth - power.damage);
  assert.equal(Math.sign(s.target.vx), side);
  const outside = setup(); outside.target.x = outside.caster.x + side * (power.range + 0.01);
  outside.combat.powers.tryCast(outside.caster); outside.caster.stateTime = power.startup;
  outside.combat.powers.resolve([outside.caster, outside.target], STEP);
  assert.equal(outside.target.health, outside.target.stats.maxHealth);
});
it('retains guard and flow interaction results behind the caster', () => {
  const s = setup(); s.target.x = 400; s.target.facing = 1; s.target.state = FighterState.BLOCKING;
  const stamina = s.target.stamina;
  s.combat.powers.tryCast(s.caster); s.caster.stateTime = power.startup; s.combat.powers.resolve([s.caster,s.target], STEP);
  assert.equal(s.target.health, s.target.stats.maxHealth);
  assert.ok(s.target.stamina < stamina); assert.ok(s.target.vx < 0);
});
it('protects only escape preparation from melee and thrown blades and leaves powers effective', () => {
  for (const attackType of ['light', 'saberThrow']) {
    const s = setup(); s.caster.state = FighterState.HIT; s.combat.powers.tryCast(s.caster);
    const contact = { attacker: s.target, defender: s.caster, attack: attackType === 'saberThrow' ? { ...s.target.moves.light, projectile: true } : s.target.moves.light, attackType, x: 500, y: 550 };
    const health = s.caster.health; s.combat.applyHit(contact); assert.equal(s.caster.health, health);
    s.caster.stateTime = power.escape.startup; s.combat.applyHit(contact); assert.ok(s.caster.health < health);
  }
  const s = setup(); s.caster.state = FighterState.HIT; s.combat.powers.tryCast(s.caster);
  s.combat.powers.strike(s.target, s.caster, powersConfig.powers.freeze, 'active', null);
  assert.equal(s.caster.state, FighterState.STUNNED);
});
it('pays once, deals reduced escape damage and starts its own cooldown at finish', () => {
  const s = setup(); s.caster.state = FighterState.HIT; s.combat.powers.tryCast(s.caster);
  assert.equal(s.caster.flowMeter, 100 - power.cost);
  s.caster.stateTime = power.escape.startup; s.combat.powers.resolve([s.caster,s.target], STEP);
  assert.equal(s.target.health, s.target.stats.maxHealth - power.escape.damage);
  const snap = captureFighter(s.caster); s.caster.clearPower(); restoreFighter(s.caster, snap);
  assert.equal(s.caster.combat.powerMode, 'escape');
  s.combat.powers.finish(s.caster); assert.equal(s.caster.combat.powerCooldown, power.cooldown);
  assert.equal(s.combat.powers.tryCast(s.caster), false);
  s.caster.flowMeter = 100; s.combat.powers.update([s.caster], power.cooldown); assert.equal(s.combat.powers.tryCast(s.caster), true);
});
it('AI requests escape after two observed hits strictly inside its configured window', () => {
  const s = setup();
  const ai = new EnemyAI({ self: s.caster, opponent: s.target, profile: aiConfig.profiles.shadow, difficulty: aiConfig.difficulties.hard, perception: aiConfig.perception, random: () => 0, rules: { powers: true } });
  ai.thinkTimer = 10; s.caster.state = FighterState.HIT;
  s.caster.combat.bladeHitSequence++; ai.updateIntent(s.caster.intent, STEP); assert.equal(ai.trySupremeEscape(), null);
  s.caster.combat.bladeHitSequence++; ai.updateIntent(s.caster.intent, 0.5); assert.equal(ai.trySupremeEscape(), AiDecision.POWER);
  ai.comboElapsed = aiConfig.perception.powerUse.supremePush.comboWindow; assert.equal(ai.trySupremeEscape(), null);
  ai.comboElapsed = 0; s.caster.flowMeter = 0; assert.equal(ai.trySupremeEscape(), null);
});

it('preserves a thrown blade for later contact while escape preparation is protected', () => {
  const s = setup(); s.caster.state = FighterState.HIT; s.combat.powers.tryCast(s.caster);
  const p = { active: true, kind: 'saber', owner: 1, source: 'light', x: s.caster.x, y: s.caster.y - s.caster.height / 2, radius: 20, hit: false, vx: -100 };
  s.combat.projectiles.fighters = [s.caster, s.target];
  s.combat.projectiles.checkHit(p); assert.equal(p.hit, false);
  s.caster.stateTime = power.escape.startup; s.combat.projectiles.checkHit(p);
  assert.equal(p.hit, true); assert.equal(s.caster.state, FighterState.HIT);
});
it('uses the attack mode without blade immunity and rejects ordinary powers during hitstun', () => {
  const s = setup(); s.combat.powers.tryCast(s.caster);
  assert.equal(s.caster.combat.powerMode, 'attack');
  s.combat.resolveContact({ attacker: s.target, defender: s.caster, attack: s.target.moves.light, attackType: 'light', x: 500, y: 550 });
  assert.equal(s.caster.state, FighterState.HIT);
  s.caster.stats.power.loadout = { neutral: powersConfig.powers.push }; s.caster.intent.power = true;
  s.caster.combat.stunDuration = 1; s.simulation.step(STEP); assert.equal(s.caster.state, FighterState.HIT);
});

it('allows escape from lightning HIT while freeze remains ineligible by the closed state list', () => {
  const s=setup();
  s.combat.powers.strike(s.target,s.caster,powersConfig.powers.lightning,'tick',null);
  assert.equal(s.caster.state,FighterState.HIT);assert.equal(s.combat.powers.tryCast(s.caster),true);
  assert.equal(s.caster.combat.powerMode,'escape');
  s.combat.powers.strike(s.target,s.caster,powersConfig.powers.freeze,'active',null);
  assert.equal(s.caster.state,FighterState.STUNNED);s.caster.flowMeter=100;
  assert.equal(s.combat.powers.tryCast(s.caster),false);
});

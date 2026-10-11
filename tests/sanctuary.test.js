import { it } from 'node:test';
import assert from 'node:assert/strict';
import { powersConfig } from '../src/config/powersConfig.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { captureFighter, restoreFighter } from '../src/simulation/ReplayBuffer.js';
import { STEP, spawnFighter, createSimulation } from './helpers.js';
const power = powersConfig.powers.sanctuary;
function setup() {
  const caster = spawnFighter(500), target = spawnFighter(620, -1);
  for (const f of [caster,target]) f.stats = { ...f.stats, flowLevel: 6, power: { ...f.stats.power, potency: 1 } };
  const simulation = createSimulation([caster,target], { powers: true });
  const combat = simulation.combat;
  combat.powers.applySelf(target,power);
  return { caster,target,simulation,combat };
}
it('scales shield capacity without extending the maximum duration or limiting actions', () => {
  const s = setup(); s.target.stats.power.potency = 1.5; s.combat.powers.applySelf(s.target,power);
  assert.equal(s.target.combat.sanctuaryShield,45); assert.equal(s.target.combat.sanctuaryTime,6);
  assert.equal(s.target.canAct,true);
});
for (const state of [FighterState.IDLE,FighterState.ATTACKING,FighterState.CASTING,FighterState.CHANNELING]) it('preserves ' + state + ' while shield remains without spending wrath armor', () => {
  const s = setup(); s.target.state = state;
  if ([FighterState.CASTING,FighterState.CHANNELING].includes(state)) s.target.combat.power = powersConfig.powers.lightning;
  s.combat.powers.applySelf(s.target,powersConfig.powers.wrath);
  const contact = { attacker:s.caster,defender:s.target,attack:s.caster.moves.light,attackType:'light' };
  const health = s.target.health;
  s.combat.applyHit(contact);
  assert.equal(s.target.state,state); assert.equal(s.target.health,health);
  assert.equal(s.target.combat.wrathArmorHits,2); assert.equal(s.target.vx,0);
  assert.ok(s.target.combat.sanctuaryShield < power.shield);
});
for (const source of ['blade','power','periodic']) it('absorbs ' + source + ' damage before health and passes only overflow on break', () => {
  const s = setup(); const health = s.target.health;
  const c = { attacker:s.caster,defender:s.target,attack:s.caster.moves.light,attackType:'light' };
  assert.equal(s.combat.applyDamage(c,10,source),false); assert.equal(s.target.health,health);
  assert.equal(s.combat.applyDamage(c,25,source),true); assert.equal(s.target.health,health-5);
  assert.equal(s.target.combat.sanctuaryShield,0); assert.equal(s.target.combat.sanctuaryEnd,'broken');
  assert.equal(s.combat.events.filter(e => e.type === CombatEvent.SANCTUARY_BREAK).length,1);
  s.combat.applyDamage(c,1,source);
  assert.equal(s.combat.events.filter(e => e.type === CombatEvent.SANCTUARY_BREAK).length,1);
});
it('interrupts even when the breaking blade hit has exactly zero overflow', () => {
  const s = setup(); const damage = s.combat.getHitDamage(s.caster,s.target,s.caster.moves.light);
  s.target.combat.sanctuaryShield = damage;
  const health = s.target.health;
  s.combat.applyHit({ attacker:s.caster,defender:s.target,attack:s.caster.moves.light,attackType:'light' });
  assert.equal(s.target.health,health); assert.equal(s.target.state,FighterState.HIT);
});
for (const id of ['choke','freeze','mindTwist']) it('blocks the ' + id + ' contact that breaks the shield and allows the next', () => {
  const s = setup(); s.target.combat.sanctuaryShield = power.controlCost;
  s.combat.projectiles.fighters = [s.caster,s.target];
  const incoming = powersConfig.powers[id];
  s.combat.powers.strike(s.caster,s.target,incoming,'active',null);
  assert.equal(s.target.combat.sanctuaryShield,0); assert.equal(s.target.state,FighterState.IDLE);
  assert.equal(s.target.combat.confuseTime,0); assert.equal(s.target.combat.chokeTime,0); assert.equal(s.target.combat.freezeTime,0);
  s.combat.powers.strike(s.caster,s.target,incoming,'active',null);
  assert.ok(s.target.combat.confuseTime > 0 || s.target.combat.chokeTime > 0 || s.target.combat.freezeTime > 0);
});
for (const id of ['push','pull','lightning']) it('prevents ' + id + ' interruption and displacement while the shield remains', () => {
  const s = setup(); s.caster.facing = 1; s.target.facing = -1;
  s.combat.powers.strike(s.caster,s.target,powersConfig.powers[id], id === 'lightning' ? 'tick' : 'active',null);
  assert.equal(s.target.state,FighterState.IDLE); assert.equal(s.target.vx,0);
  assert.equal(s.target.health,s.target.stats.maxHealth);
});
it('expires with its own event and survives snapshot but clears on death and round reset', () => {
  const s = setup(); const snap = captureFighter(s.target);
  s.combat.statuses.update([s.caster,s.target],power.duration);
  assert.equal(s.target.combat.sanctuaryShield,0);
  assert.equal(s.combat.events.filter(e => e.type === CombatEvent.SANCTUARY_END).length,1);
  restoreFighter(s.target,snap); assert.equal(s.target.combat.sanctuaryShield,30);
  s.combat.statuses.onDeath(s.target); assert.equal(s.target.combat.sanctuaryShield,0);
  s.combat.powers.applySelf(s.target,power); s.target.resetForRound(620,-1); assert.equal(s.target.combat.sanctuaryShield,0);
});
it('keeps startup interruptible and does not apply shield early', () => {
  const s = setup(); s.combat.statuses.end(s.target,'sanctuary','reset');
  s.target.stats.power.loadout = { neutral:power }; s.target.flowMeter=100; s.combat.powers.tryCast(s.target);
  assert.equal(s.target.combat.sanctuaryShield,0);
  s.combat.applyHit({ attacker:s.caster,defender:s.target,attack:s.caster.moves.light,attackType:'light' });
  s.simulation.step(STEP); assert.equal(s.target.combat.sanctuaryShield,0); assert.equal(s.target.state,FighterState.HIT);
});

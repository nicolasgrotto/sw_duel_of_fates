import { it } from 'node:test';
import assert from 'node:assert/strict';
import { powersConfig } from '../src/config/powersConfig.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { EnemyAI } from '../src/ai/EnemyAI.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { assertSnapshotContinuation } from './consequenceHelpers.js';
import { STEP, spawnFighter, createSimulation } from './helpers.js';
const power = powersConfig.powers.crush;
function setup(diff=0,reversed=false) {
  const caster=spawnFighter(500,1),target=spawnFighter(650,-1);
  caster.stats={ ...caster.stats,flowLevel:6+diff,power:{ ...caster.stats.power,potency:1,loadout:{neutral:power} } };
  target.stats={ ...target.stats,flowLevel:6,power:{ ...target.stats.power,potency:1 } };
  const fighters=reversed?[target,caster]:[caster,target];
  const simulation=createSimulation(fighters,{powers:true});
  const combat=simulation.combat; combat.projectiles.fighters=fighters; caster.flowMeter=100;
  return {caster,target,fighters,simulation,combat};
}
function capture(s) { s.combat.powers.tryCast(s.caster); s.caster.stateTime=power.startup; s.combat.powers.resolve(s.fighters,STEP); }
for(const [diff,scale] of [[3,1],[2,1],[0,1],[-1,0.75],[-2,0.5],[-3,0]]) it('delivers the delayed flow band at difference '+diff,()=>{
  const s=setup(diff); capture(s); const health=s.target.health;
  assert.equal(health,s.target.stats.maxHealth);
  if(scale===0) { assert.equal(s.target.combat.crushTime,0); return; }
  assert.equal(s.target.y,s.target.floorY-power.liftHeight); assert.equal(s.target.state,FighterState.STUNNED);
  s.combat.statuses.update(s.fighters,power.duration-STEP); assert.equal(s.target.health,health);
  s.combat.statuses.update(s.fighters,STEP*2); assert.equal(s.target.health,health-power.damage*scale);
  assert.equal(s.target.state,FighterState.STAGGERED); assert.equal(s.target.combat.stunDuration,power.stagger);
  s.combat.statuses.update(s.fighters,1); assert.equal(s.target.health,health-power.damage*scale);
});
for(const diff of [0,1,2,3]) it('handles guarded crush at difference '+diff,()=>{
  const s=setup(diff); s.target.state=FighterState.BLOCKING;
  capture(s);
  if(diff===3) {assert.ok(s.target.combat.crushTime>0);return;}
  assert.equal(s.target.combat.crushTime,0); assert.equal(s.target.health,s.target.stats.maxHealth-power.damage/4);
  assert.equal(s.target.state,FighterState.BLOCKING);
  assert.ok(s.target.stamina<s.target.stats.maxStamina);
});
for(const reversed of [false,true]) it('keeps the victim physically suspended and snapshot continuation in order '+reversed,()=>{
  const s=setup(0,reversed); capture(s);
  for(let i=0;i<10;i++)s.simulation.step(STEP);
  assert.equal(s.target.y,s.target.floorY-power.liftHeight); assert.equal(s.target.vx,0); assert.equal(s.target.vy,0);
  assertSnapshotContinuation(s.simulation,100);
  assert.equal(s.target.combat.crushTime,0); assert.equal(s.target.grounded,true);
});
it('does not require the caster to remain in its recovery after an instantaneous capture',()=>{
  const s=setup();capture(s);s.caster.clearAttack();s.caster.state=FighterState.HIT;
  s.combat.statuses.update(s.fighters,power.duration);assert.equal(s.target.state,FighterState.STAGGERED);
});
it('is interrupted before acquisition and respects the cast cost and range',()=>{
  const s=setup();s.caster.flowMeter=power.cost-1;assert.equal(s.combat.powers.tryCast(s.caster),false);
  s.caster.flowMeter=100;s.combat.powers.tryCast(s.caster);assert.equal(s.caster.flowMeter,100-power.cost);
  s.combat.applyHit({attacker:s.target,defender:s.caster,attack:s.target.moves.light,attackType:'light'});
  s.simulation.step(STEP);assert.equal(s.target.combat.crushTime,0);
  const outside=setup();outside.target.x=outside.caster.x+(outside.caster.width+outside.target.width)/2+power.range+0.1;capture(outside);assert.equal(outside.target.combat.crushTime,0);
});
it('lets Absorb, Barrier, Sanctuary and invulnerable dodge prevent capture',()=>{
  for(const defense of ['absorb','barrier','sanctuary','dodge']) {
    const s=setup();
    if(defense==='absorb')s.target.combat.absorbTime=1;
    if(defense==='sanctuary')s.combat.powers.applySelf(s.target,powersConfig.powers.sanctuary);
    if(defense==='barrier'){s.target.combat.power=powersConfig.powers.barrier;s.target.state=FighterState.CHANNELING;s.target.stateTime=s.target.combat.power.startup;}
    if(defense==='dodge'){s.target.state=FighterState.DODGING;s.target.combat.dodgeProfile=s.target.stats.dodge;s.target.stateTime=0;}
    capture(s);assert.equal(s.target.combat.crushTime,0,defense);
    if(defense==='sanctuary')assert.equal(s.target.combat.sanctuaryShield,powersConfig.powers.sanctuary.shield-powersConfig.powers.sanctuary.controlCost);
  }
});
it('clears delayed damage on target death and round reset',()=>{
  const s=setup();capture(s);s.combat.knockOut(s.target,s.combat.createPowerContact(s.caster,s.target,power,0));
  assert.equal(s.target.combat.crushTime,0);assert.equal(s.target.combat.crushDamage,0);
  s.target.resetForRound(650,-1);assert.equal(s.target.combat.crushSource,-1);
});
it('AI only wants crush against vulnerability inside range',()=>{
  const s=setup();const ai=new EnemyAI({self:s.caster,opponent:s.target,profile:aiConfig.profiles.shadow,difficulty:aiConfig.difficulties.hard,perception:aiConfig.perception,random:()=>0,rules:{powers:true}});
  assert.equal(ai.wantsPower(power),false);s.target.state=FighterState.STUNNED;assert.equal(ai.wantsPower(power),true);
  s.target.state=FighterState.CASTING;s.target.combat.power=powersConfig.powers.push;s.target.stateTime=powersConfig.powers.push.startup+powersConfig.powers.push.active;assert.equal(ai.wantsPower(power),true);
  s.target.x=1100;assert.equal(ai.wantsPower(power),false);
});

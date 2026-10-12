import { it } from 'node:test';
import assert from 'node:assert/strict';
import { powersConfig } from '../src/config/powersConfig.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { EnemyAI, AiDecision } from '../src/ai/EnemyAI.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { captureFighter } from '../src/simulation/ReplayBuffer.js';
import { assertSnapshotContinuation } from './consequenceHelpers.js';
import { STEP, spawnFighter, createSimulation } from './helpers.js';
const power=powersConfig.powers.meteorRain;
function setup(level=10,reversed=false) {
  const caster=spawnFighter(400),target=spawnFighter(800,-1);
  for(const f of [caster,target])f.stats={...f.stats,flowLevel:level,power:{...f.stats.power,potency:1,loadout:{neutral:power}}};
  caster.flowMeter=100;const fighters=reversed?[target,caster]:[caster,target];
  const simulation=createSimulation(fighters,{powers:true});const combat=simulation.combat;combat.projectiles.fighters=fighters;
  return {caster,target,fighters,simulation,combat};
}
function call(s) { assert.equal(s.combat.powers.tryCast(s.caster),true);s.caster.stateTime=power.startup;s.combat.powers.resolve(s.fighters,STEP); }
for(const [level,count] of [[6,5],[7,5],[8,6],[9,6],[10,7]])it('schedules '+count+' strikes at level '+level,()=>{
  const s=setup(level);call(s);const marks=s.caster.combat.rain.marks;
  assert.equal(marks.length,count);assert.equal(marks[0].impactTime,power.startup+power.strikeWarning);
  assert.ok(Math.abs(marks.at(-1).impactTime-power.startup-power.active)<1e-12);
  assert.equal(s.combat.events.filter(e=>e.type===CombatEvent.RAIN_CALL).length,1);
  assert.equal(s.caster.state,FighterState.IDLE);assert.equal(s.caster.flowMeter,100-power.cost);
});
it('requires minimum flow and remains interruptible until invocation ends',()=>{
  const low=setup(5);assert.equal(low.combat.powers.tryCast(low.caster),false);
  const s=setup();s.combat.powers.tryCast(s.caster);s.combat.applyHit({attacker:s.target,defender:s.caster,attack:s.target.moves.light,attackType:'light'});
  for(let i=0;i<60;i++)s.simulation.step(STEP);assert.equal(s.caster.combat.rainActive,false);
  assert.equal(s.combat.events.some(e=>e.type===CombatEvent.RAIN_CALL),false);
});
it('locks attacks and powers but permits walking jumping and dodge after invocation',()=>{
  const s=setup();call(s);const x=s.caster.x;s.caster.intent.moveX=1;s.simulation.step(STEP);assert.ok(s.caster.x>x);
  s.caster.intent.jump=true;s.simulation.step(STEP);assert.equal(s.caster.grounded,false);
  assert.equal(s.combat.tryAttack(s.caster,'air'),false);assert.equal(s.combat.trySpecial(s.caster),false);
  s.caster.flowMeter=100;assert.equal(s.combat.powers.tryCast(s.caster),false);
  const grounded=setup();call(grounded);grounded.caster.intent.dodge=true;grounded.simulation.step(STEP);assert.equal(grounded.caster.state,FighterState.DODGING);
});
it('keeps invoked rain after a blade interrupts the caster and clears it on death',()=>{
  const s=setup();call(s);s.combat.applyHit({attacker:s.target,defender:s.caster,attack:s.target.moves.light,attackType:'light'});
  const time=s.caster.combat.rain.time;s.simulation.step(STEP);assert.ok(s.caster.combat.rain.time>time);
  assert.equal(s.caster.combat.rainActive,true);
  s.combat.knockOut(s.caster,s.combat.createPowerContact(s.target,s.caster,power,0));assert.equal(s.caster.combat.rainActive,false);
});
it('fixes marks using its own offset sequence and lets the target leave the column',()=>{
  const s=setup();call(s);const rain=s.caster.combat.rain,mark=rain.marks[0],x=mark.x;
  assert.equal(x,s.target.x+power.strikeOffsets[0]);s.target.x+=power.strikeWidth;
  s.combat.powers.storms.updateRain(s.caster,s.fighters,power.strikeWarning);
  assert.equal(mark.x,x);assert.equal(s.target.health,s.target.stats.maxHealth);
  assert.ok(s.combat.events.some(e=>e.type===CombatEvent.RAIN_STRIKE&&e.hit===false));
  const next=rain.marks[1];s.combat.powers.storms.updateRain(s.caster,s.fighters,next.markTime-rain.time);
  assert.equal(next.x,s.target.x+power.strikeOffsets[1]);
});
for(const defense of ['guard','absorb','barrier','dodge'])it('resolves meteor contact against '+defense,()=>{
  const s=setup();call(s);s.target.flowMeter=100;
  if(defense==='guard')s.target.state=FighterState.BLOCKING;
  if(defense==='absorb')s.target.combat.absorbTime=1;
  if(defense==='barrier'){s.target.state=FighterState.CHANNELING;s.target.combat.power=powersConfig.powers.barrier;s.target.stateTime=s.target.combat.power.startup;}
  if(defense==='dodge'){s.target.state=FighterState.DODGING;s.target.combat.dodgeProfile=s.target.stats.dodge;s.target.stateTime=0;}
  s.combat.powers.storms.updateRain(s.caster,s.fighters,power.strikeWarning);
  if(defense==='barrier'){assert.equal(s.target.flowMeter,70);assert.equal(s.target.health,s.target.stats.maxHealth);}
  else if(defense==='dodge')assert.equal(s.target.health,s.target.stats.maxHealth);
  else{assert.equal(s.target.health,s.target.stats.maxHealth-power.damage);assert.equal(s.target.state,FighterState.STAGGERED);}
  assert.equal(s.caster.health,s.caster.stats.maxHealth);
});
it('ends its recovery with a cooldown and can then cast again',()=>{
  const s=setup();call(s);s.combat.powers.storms.updateRain(s.caster,s.fighters,power.active);
  assert.equal(s.caster.combat.rain.phase,'recovery');assert.equal(s.caster.combat.rainActive,true);
  s.combat.powers.storms.updateRain(s.caster,s.fighters,power.recovery);
  assert.equal(s.caster.combat.rainActive,false);assert.equal(s.caster.combat.rain,null);
  assert.equal(s.caster.combat.powerCooldown,powersConfig.cooldown);
});
for(const reversed of [false,true])it('clones marks and continues snapshots deterministically in order '+reversed,()=>{
  const s=setup(10,reversed);call(s);const snapshot=captureFighter(s.caster);
  assert.notEqual(snapshot.combat.rain.marks,s.caster.combat.rain.marks);
  assert.notEqual(snapshot.combat.rain.marks[0],s.caster.combat.rain.marks[0]);
  assertSnapshotContinuation(s.simulation,300,(fighters,i)=>{const caster=fighters[reversed?1:0];caster.intent.moveX=i<30?-1:0;});
});
it('AI requests rain only when allowed and uses movement during active rain',()=>{
  const s=setup();const ai=new EnemyAI({self:s.caster,opponent:s.target,profile:aiConfig.profiles.shadow,difficulty:aiConfig.difficulties.hard,perception:aiConfig.perception,random:()=>0,rules:{powers:true}});
  assert.equal(ai.tryPower(),AiDecision.POWER);call(s);assert.equal(ai.canUsePower(power),false);
  assert.equal(ai.decide(),AiDecision.BACK_OFF);
});

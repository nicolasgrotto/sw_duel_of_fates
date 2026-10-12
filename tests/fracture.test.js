import { it } from 'node:test';
import assert from 'node:assert/strict';
import { powersConfig } from '../src/config/powersConfig.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { EnemyAI,AiDecision } from '../src/ai/EnemyAI.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { captureFighter } from '../src/simulation/ReplayBuffer.js';
import { assertSnapshotContinuation } from './consequenceHelpers.js';
import { STEP,spawnFighter,createSimulation } from './helpers.js';
const power=powersConfig.powers.fracture;
function setup(direction=1,diff=0,reversed=false) {
  const caster=spawnFighter(600,direction),target=spawnFighter(600+direction*200,-direction);
  caster.stats={...caster.stats,flowLevel:6+diff,power:{...caster.stats.power,potency:1,loadout:{neutral:power}}};
  target.stats={...target.stats,flowLevel:6,power:{...target.stats.power,potency:1}};
  const fighters=reversed?[target,caster]:[caster,target],simulation=createSimulation(fighters,{powers:true});
  const combat=simulation.combat;combat.projectiles.fighters=fighters;caster.flowMeter=100;
  return {caster,target,fighters,simulation,combat};
}
function launch(s) { assert.equal(s.combat.powers.tryCast(s.caster),true);s.caster.stateTime=power.startup;s.combat.powers.resolve(s.fighters,STEP); }
function firstBurst(s) { const wave=s.caster.combat.fracture,segment=wave.segments[0];s.target.x=(segment.left+segment.right)/2;s.combat.powers.fractures.update(s.caster,s.fighters,power.fractureWarning); }
for(const direction of [-1,1])it('travels from the front foot to the wall with exact warning and speed, direction '+direction,()=>{
  const s=setup(direction);launch(s);const wave=s.caster.combat.fracture,segments=wave.segments;
  const foot=s.caster.x+direction*s.caster.width/2;
  assert.equal(direction>0?segments[0].left:segments[0].right,foot);
  assert.equal(direction>0?segments.at(-1).right:segments.at(-1).left,direction>0?s.simulation.arena.right:s.simulation.arena.left);
  for(let i=0;i<segments.length;i++){assert.ok(segments[i].right-segments[i].left<=power.segmentLength);assert.equal(segments[i].markTime,i*power.segmentLength/power.speed);assert.equal(segments[i].impactTime,segments[i].markTime+power.fractureWarning);}
  assert.equal(s.combat.events.filter(e=>e.type===CombatEvent.FRACTURE_CRACK).length,1);
  s.combat.powers.fractures.update(s.caster,s.fighters,power.fractureWarning-STEP);assert.equal(segments[0].burst,false);
  s.combat.powers.fractures.update(s.caster,s.fighters,STEP);assert.equal(segments[0].burst,true);
});
for(const [diff,scale] of [[3,1],[0,1],[-1,1],[-2,0.5],[-3,0]])it('resolves ground contact at flow difference '+diff,()=>{
  const s=setup(1,diff);launch(s);firstBurst(s);
  assert.equal(s.target.health,s.target.stats.maxHealth-power.damage*scale);
  if(scale){assert.equal(s.target.vy,-power.launchSpeed);assert.equal(s.target.grounded,false);assert.equal(s.target.state,FighterState.STAGGERED);assert.equal(s.target.combat.stunDuration,power.stagger);}
  else assert.equal(s.target.state,FighterState.IDLE);
});
for(const defense of ['guard','absorb','barrier','dodge','storm'])it('passes through '+defense+' on the ground',()=>{
  const s=setup();launch(s);
  if(defense==='guard')s.target.state=FighterState.BLOCKING;
  if(defense==='absorb')s.target.combat.absorbTime=1;
  if(defense==='barrier'||defense==='storm'){s.target.state=FighterState.CHANNELING;s.target.combat.power=powersConfig.powers[defense];s.target.stateTime=s.target.combat.power.startup;}
  if(defense==='dodge'){s.target.state=FighterState.DODGING;s.target.combat.dodgeProfile=s.target.stats.dodge;s.target.stateTime=0;}
  firstBurst(s);assert.equal(s.target.health,s.target.stats.maxHealth-power.damage);assert.equal(s.target.grounded,false);
});
it('still sends ground damage through Sanctuary without interrupting its remaining shield',()=>{
  const s=setup();launch(s);s.combat.powers.applySelf(s.target,powersConfig.powers.sanctuary);firstBurst(s);
  assert.equal(s.target.health,s.target.stats.maxHealth);assert.equal(s.target.combat.sanctuaryShield,30-power.damage);
  assert.equal(s.target.state,FighterState.IDLE);assert.equal(s.target.grounded,true);
});
it('checks grounded feet rather than the hurtbox, never the caster or someone behind',()=>{
  const air=setup();launch(air);air.target.grounded=false;firstBurst(air);assert.equal(air.target.health,air.target.stats.maxHealth);
  const feet=setup();launch(feet);const seg=feet.caster.combat.fracture.segments[0];feet.target.x=seg.right+1;feet.combat.powers.fractures.update(feet.caster,feet.fighters,power.fractureWarning);assert.equal(feet.target.health,feet.target.stats.maxHealth);
  const back=setup();back.target.x=400;launch(back);back.combat.powers.fractures.update(back.caster,back.fighters,3);assert.equal(back.target.health,back.target.stats.maxHealth);assert.equal(back.caster.health,back.caster.stats.maxHealth);
});
it('allows only one resolved contact while emitting every segment event and ending at the wall',()=>{
  const s=setup();launch(s);const wave=s.caster.combat.fracture;firstBurst(s);const health=s.target.health;
  s.target.grounded=true;s.target.x=(wave.segments[1].left+wave.segments[1].right)/2;
  s.combat.powers.fractures.update(s.caster,s.fighters,3);assert.equal(s.target.health,health);
  assert.equal(s.combat.events.filter(e=>e.type===CombatEvent.FRACTURE_CRACK).length,wave.segments.length);
  assert.equal(s.combat.events.filter(e=>e.type===CombatEvent.FRACTURE_BURST).length,wave.segments.length);
  assert.equal(s.caster.combat.fracture,null);
});
it('remains interruptible before launch and continues after launch without the caster attack state',()=>{
  const s=setup();s.combat.powers.tryCast(s.caster);assert.equal(s.caster.flowMeter,30);
  s.combat.applyHit({attacker:s.target,defender:s.caster,attack:s.target.moves.light,attackType:'light'});s.simulation.step(STEP);assert.equal(s.caster.combat.fracture,null);
  const invoked=setup();launch(invoked);invoked.caster.clearAttack();invoked.caster.state=FighterState.HIT;firstBurst(invoked);assert.ok(invoked.target.health<invoked.target.stats.maxHealth);
  invoked.caster.resetForRound(600,1);assert.equal(invoked.caster.combat.fracture,null);
});
for(const reversed of [false,true])it('deeply clones and continues the wave in snapshots, order '+reversed,()=>{
  const s=setup(1,0,reversed);launch(s);const snap=captureFighter(s.caster);
  assert.notEqual(snap.combat.fracture.segments,s.caster.combat.fracture.segments);assert.notEqual(snap.combat.fracture.segments[0],s.caster.combat.fracture.segments[0]);
  assertSnapshotContinuation(s.simulation,130);
});
it('AI jumps from a cracked segment after difficulty reaction and only casts against a distant grounded target',()=>{
  const s=setup();launch(s);const seg=s.caster.combat.fracture.segments[0];s.target.x=(seg.left+seg.right)/2;
  const ai=new EnemyAI({self:s.target,opponent:s.caster,profile:aiConfig.profiles.shadow,difficulty:aiConfig.difficulties.hard,perception:aiConfig.perception,random:()=>0,rules:{powers:true}});
  assert.equal(ai.tryJumpFracture(),null);s.caster.combat.fracture.time=ai.difficulty.reactionTime;assert.equal(ai.tryJumpFracture(),AiDecision.JUMP);
  s.target.grounded=false;assert.equal(ai.tryJumpFracture(),null);
  const casterAI=new EnemyAI({self:s.caster,opponent:s.target,profile:aiConfig.profiles.shadow,difficulty:aiConfig.difficulties.hard,perception:aiConfig.perception,random:()=>0,rules:{powers:true}});
  s.target.x=1000;s.target.grounded=true;assert.equal(casterAI.wantsPower(power),true);
  s.target.grounded=false;assert.equal(casterAI.wantsPower(power),false);
  s.target.grounded=true;s.target.x=s.caster.x+(s.caster.width+s.target.width)/2+150;assert.equal(casterAI.wantsPower(power),false);
  s.target.x+=0.01;assert.equal(casterAI.wantsPower(power),true);
});

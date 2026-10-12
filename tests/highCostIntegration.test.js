import { it } from 'node:test';
import assert from 'node:assert/strict';
import { powersConfig } from '../src/config/powersConfig.js';
import { characters } from '../src/characters/characterData.js';
import { galleryCatalog } from '../src/modes/galleryCatalog.js';
import { GalleryDirector } from '../src/modes/GalleryDirector.js';
import { GalleryScene } from '../src/modes/GalleryScene.js';
import { ReplayBuffer,captureFighter,restoreFighter } from '../src/simulation/ReplayBuffer.js';
import { Fighter } from '../src/entities/Fighter.js';
import { Hud } from '../src/ui/Hud.js';
import { colors } from '../src/config/themeConfig.js';
import { getPowerDebugInfo } from '../src/states/powerDebugInfo.js';
import { STEP,spawnFighter,createSimulation } from './helpers.js';
const ids=['supremePush','meteorRain','sanctuary','wrath','fracture'];
function scene(id,target='idle') {
  const simulation=createSimulation([spawnFighter(400),spawnFighter(700,-1,'shadow')],{powers:true});
  return new GalleryScene(new GalleryDirector({ability:id,tier:3,target,caster:'guardian',repeat:false}),simulation);
}
function step(s) {
  s.beforeStep();s.controllers.forEach((c,i)=>c.updateIntent(s.fighters[i].intent,STEP));s.simulation.step(STEP);s.afterStep(STEP);
  return s.simulation.events;
}
it('catalogs five high cost powers with configured tokens without assigning them to the roster',()=>{
  for(const id of ids){assert.ok(galleryCatalog.some(i=>i.id===id));assert.match(powersConfig.powers[id].hudMark,/^powerCost/);}
  for(const character of Object.values(characters))for(const id of ids)assert.ok(!Object.values(character.loadout.powers).includes(id));
});
it('demonstrates supreme escape only after the attacking target actually lands a blade hit',()=>{
  const s=scene('supremePush','attacking');s.requestCast();let hit=false,start=false,active=false;
  for(let i=0;i<120;i++)for(const event of step(s)){
    if(event.type==='hit'&&event.defender===s.fighters[0])hit=true;
    if(event.type==='powerStart'&&event.attacker===s.fighters[0]){assert.equal(hit,true);assert.equal(event.mode,'escape');start=true;}
    if(event.type==='powerActive'&&event.attacker===s.fighters[0]){assert.equal(event.mode,'escape');active=true;}
    assert.ok(!(event.type==='powerStart'&&event.attacker===s.fighters[1]));
  }
  assert.equal(start,true);assert.equal(active,true);
});
for(const id of ['meteorRain','fracture','sanctuary'])it('keeps the gallery cycle active while '+id+' remains and cleans all state on reset',()=>{
  const s=scene(id);s.requestCast();let observed=false;
  for(let i=0;i<400;i++){
    step(s);const active=s.fighters.some(f=>f.combat.rainActive||f.combat.fracture||f.combat.sanctuaryTime>0);
    if(active){observed=true;assert.equal(s.hasEffects(),true);assert.equal(s.director.phase,'active');}
  }
  assert.equal(observed,true);s.reset();
  for(const f of s.fighters){assert.equal(f.combat.rainActive,false);assert.equal(f.combat.rain,null);assert.equal(f.combat.fracture,null);assert.equal(f.combat.sanctuaryShield,0);}
});
it('keeps debug state reads pure and covers every new status',()=>{
  const f=spawnFighter(500);f.combat.powerMode='escape';f.combat.chokeTime=1;f.combat.sanctuaryShield=30;f.combat.sanctuaryTime=6;f.combat.wrathArmorHits=2;
  f.combat.rain={phase:'rain',time:1,marks:[{active:true}]};f.combat.fracture={time:0.1,segments:[{marked:true,burst:false}]};
  const before=captureFighter(f),line=getPowerDebugInfo(f);
  for(const name of ['mode escape','choke 1.00','sanctuary 30.0/6.00','wrath armor 2','rain rain/1.00','marks 1','fracture 0.10','cracks 1'])assert.ok(line.includes(name),name);
  assert.deepEqual(captureFighter(f),before);
});
it('keeps unimplemented cost mark colors out of the renderer while retaining the existing storm mark',()=>{
  const left=spawnFighter(500),right=spawnFighter(800,-1);
  left.stats.power.loadout={neutral:{...powersConfig.powers.sanctuary,hudMark:'pendingCostColor'},forward:powersConfig.powers.storm};
  const hud=new Hud(left,right);left.flowMeter=100;hud.update(STEP);
  assert.deepEqual(hud.sides[0].costMarks.map(m=>m.power.id),['storm']);
  assert.ok(hud.sides[0].costMarks.every(m=>m.color===colors.powerCostStorm));
});
for(const id of ['meteorRain','fracture'])for(const reversed of [false,true])it('replays recorded '+id+' intents from pre-cast and active snapshots, order '+reversed,()=>{
  const caster=spawnFighter(500,1),target=spawnFighter(800,-1);
  caster.stats={...caster.stats,flowLevel:10,power:{...caster.stats.power,potency:1,loadout:{neutral:powersConfig.powers[id]}}};
  target.stats={...target.stats,flowLevel:10};caster.flowMeter=100;
  const fighters=reversed?[target,caster]:[caster,target],simulation=createSimulation(fighters,{powers:true});
  const buffer=new ReplayBuffer({frames:400,snapshotInterval:60});
  for(let i=0;i<360;i++){
    fighters.forEach(f=>f.clearIntent());caster.intent.power=i===0;caster.intent.moveX=i>60&&i<100?-1:0;target.intent.jump=i===40;
    buffer.record(fighters,STEP,simulation.projectiles);simulation.step(STEP);
  }
  for(const checkpoint of [0,60,180]){
    const snap=buffer.snapshots.find(s=>s?.step===checkpoint);
    const clones=fighters.map((f,i)=>{const clone=new Fighter({id:f.id,name:f.name,stats:f.stats,appearance:f.appearance,sound:f.sound,x:f.x,y:f.floorY,facing:f.facing});restoreFighter(clone,snap.fighters[i]);return clone;});
    const replay=createSimulation(clones,{powers:true});
    for(let i=checkpoint;i<360;i++)replay.step(buffer.readStep(i,clones));
    assert.deepEqual(clones.map(captureFighter),fighters.map(captureFighter));
  }
});

it('keeps Barrier slides away from radial and marked impact centers',()=>{
  for(const id of ['supremePush','meteorRain']){
    const caster=spawnFighter(600,1),target=spawnFighter(400,-1);
    const simulation=createSimulation([caster,target],{powers:true});
    target.combat.power=powersConfig.powers.barrier;target.state='CHANNELING';target.stateTime=target.combat.power.startup;target.flowMeter=100;
    simulation.combat.powers.strike(caster,target,powersConfig.powers[id],id==='meteorRain'?'strike':'active',null,target.x+40);
    assert.ok(target.vx<0);assert.equal(target.health,target.stats.maxHealth);
  }
});

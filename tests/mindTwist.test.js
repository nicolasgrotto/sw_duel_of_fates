import { it } from 'node:test';
import assert from 'node:assert/strict';
import { AiDecision, EnemyAI } from '../src/ai/EnemyAI.js';
import { getIntentSlot, selectPower, selectTechnique } from '../src/combat/PowerSystem.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { IntentRecorder } from '../src/controllers/IntentRecorder.js';
import { getMoveX } from '../src/entities/fighterIntent.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { captureFighter, restoreFighter, ReplayBuffer } from '../src/simulation/ReplayBuffer.js';
import { STEP, createSimulation, spawnFighter } from './helpers.js';

const power = powersConfig.powers.mindTwist;

function setup(difference = 0) {
  const caster = spawnFighter(500, 1);
  const target = spawnFighter(700, -1, 'shadow');
  caster.stats = { ...caster.stats, flowLevel: 6 + difference, power: { ...caster.stats.power, loadout: { neutral: power } } };
  target.stats = { ...target.stats, flowLevel: 6 };
  caster.flowMeter = 100;
  return { caster, target, simulation: createSimulation([caster, target], { powers: true }) };
}

for (const [difference, duration] of [[-4, 0], [-3, 0], [-2, 0.4], [-1, 0.75], [0, 1], [2, 1], [3, 1.25]]) {
  it(`uses mind twist duration band ${difference} without damage or interrupting actions`, () => {
    const { caster, target, simulation } = setup(difference);
    target.state = FighterState.BLOCKING;
    simulation.combat.powers.strike(caster, target, power, 'active', null);
    assert.equal(target.combat.confuseTime, power.duration * duration);
    assert.equal(target.health, target.stats.maxHealth);
    assert.equal(target.state, FighterState.BLOCKING);
    if (duration) assert.equal(target.combat.statusLevel, caster.flowLevel);
  });
}

it('pays once, applies at startup and observes range, barrier, dodge and absorption', () => {
  const { caster, target, simulation } = setup();
  const powers = simulation.combat.powers;
  powers.tryCast(caster);
  assert.equal(caster.flowMeter, 100 - power.cost);
  caster.stateTime = power.startup - STEP;
  powers.resolve([caster, target], STEP);
  assert.equal(target.combat.confuseTime, 0);
  caster.stateTime = power.startup;
  powers.resolve([caster, target], STEP);
  assert.equal(target.combat.confuseTime, power.duration);
  for (const defense of ['range', 'barrier', 'dodge', 'absorb', 'partial']) {
    const s = setup();
    if (defense === 'range') s.target.x = s.caster.x + (s.caster.width + s.target.width) / 2 + power.range + 1;
    if (defense === 'barrier') {
      s.target.combat.power = powersConfig.powers.barrier;
      s.target.state = FighterState.CHANNELING;
      s.target.stateTime = s.target.combat.power.startup;
    }
    if (defense === 'dodge') {
      s.target.state = FighterState.DODGING;
      s.target.combat.dodgeProfile = s.target.stats.dodge;
    }
    if (defense === 'absorb' || defense === 'partial') {
      s.target.combat.absorbTime = 0.3;
      if (defense === 'partial') s.target.stats.flowLevel = 5;
    }
    s.simulation.combat.powers.affect(s.caster, s.target, power, 'active');
    assert.equal(s.target.combat.confuseTime, defense === 'partial' ? power.duration * 0.5 : 0);
  }
});

it('restarts rather than stacks and expires or resets without changing other controls', () => {
  const { caster, target, simulation } = setup();
  target.combat.confuseTime = 0.2;
  target.combat.confuseElapsed = 0.6;
  target.intent.moveX = 1;
  target.intent.jump = true;
  target.intent.dodge = true;
  target.intent.lightAttack = true;
  const original = { ...target.intent };
  simulation.combat.powers.strike(caster, target, power, 'active', null);
  assert.equal(target.combat.confuseTime, power.duration);
  assert.equal(target.combat.confuseElapsed, 0);
  assert.equal(getMoveX(target), -1);
  assert.deepEqual(target.intent, original);
  simulation.combat.statuses.update([target], power.duration);
  assert.equal(getMoveX(target), 1);
  assert.equal(target.combat.confuseElapsed, 0);
  target.combat.confuseTime = 1;
  target.resetForRound(700, -1);
  assert.equal(target.combat.confuseTime, 0);
});

for (const facing of [-1, 1]) {
  it(`uses the same inversion for walk, block walk, air movement and loadout slots facing ${facing}`, () => {
    const { target, simulation } = setup();
    target.facing = facing;
    target.combat.confuseTime = power.duration;
    target.intent.moveX = facing;
    assert.equal(getIntentSlot(target), 'back');
    assert.equal(selectPower(target), target.stats.power.loadout.back);
    assert.equal(selectTechnique(target), target.stats.techniques.back);
    simulation.movement.applyHorizontalMovement(target, STEP);
    assert.equal(Math.sign(target.vx), -facing);
    target.vx = 0;
    target.grounded = false;
    simulation.movement.applyHorizontalMovement(target, STEP);
    assert.equal(Math.sign(target.vx), -facing);
    target.vx = 0;
    target.stats.blockWalkSpeed = 80;
    simulation.movement.applyBlockWalk(target, STEP);
    assert.equal(Math.sign(target.vx), -facing);
    assert.equal(target.intent.moveX, facing);
    target.intent.moveX = 0;
    assert.equal(getIntentSlot(target), 'neutral');
  });
}

for (const difficulty of ['easy', 'normal', 'hard', 'boss']) {
  it(`compensates confusion only after the configured ${difficulty} delay`, () => {
    const { caster, target } = setup();
    const ai = new EnemyAI({ self: caster, opponent: target, difficulty: aiConfig.difficulties[difficulty], profile: aiConfig.profiles.balanced, perception: aiConfig.perception, random: () => 0, rules: { powers: true } });
    caster.combat.confuseTime = power.duration;
    ai.plan.moveX = 1;
    ai.writeIntent(caster.intent);
    assert.equal(caster.intent.moveX, 1);
    const delay = ai.difficulty.confusionCompensation;
    if (delay !== null) {
      caster.combat.confuseElapsed = delay - STEP;
      ai.writeIntent(caster.intent);
      assert.equal(caster.intent.moveX, 1);
      caster.combat.confuseElapsed = delay;
      ai.writeIntent(caster.intent);
      assert.equal(caster.intent.moveX, -1);
      assert.equal(getMoveX(caster), 1);
    } else {
      caster.combat.confuseElapsed = power.duration;
      ai.writeIntent(caster.intent);
      assert.equal(getMoveX(caster), -1);
    }
    assert.equal(ai.plan.moveX, 1);
  });
}

it('AI requests mind twist in its configured approach range', () => {
  const { caster, target } = setup();
  const ai = new EnemyAI({ self: caster, opponent: target, difficulty: aiConfig.difficulties.hard, profile: aiConfig.profiles.balanced, perception: aiConfig.perception, random: () => 0, rules: { powers: true } });
  assert.equal(ai.tryPower(), AiDecision.POWER);
  for (const gap of [119, 321]) {
    target.x = caster.x + (caster.width + target.width) / 2 + gap;
    assert.equal(ai.wantsPower(power), false);
  }
});

it('preserves original intents in training recording and deterministic replay', () => {
  const { caster, target, simulation } = setup();
  target.combat.confuseTime = power.duration;
  target.intent.moveX = -1;
  const recorder = new IntentRecorder(120);
  recorder.toggleRecording();
  recorder.record(target.intent, target.facing);
  recorder.stop();
  const intent = {};
  recorder.startPlayback();
  recorder.play(intent, target.facing);
  assert.equal(intent.moveX, -1);
  const fighters = [caster, target];
  const buffer = new ReplayBuffer({ frames: 120, snapshotInterval: 10 });
  for (let i = 0; i < 90; i++) {
    buffer.record(fighters, STEP);
    simulation.step(STEP);
    assert.equal(target.intent.moveX, -1);
  }
  const expected = fighters.map(captureFighter);
  const playback = buffer.createPlayback();
  fighters.forEach((fighter, i) => restoreFighter(fighter, playback.snapshot.fighters[i]));
  const replay = createSimulation(fighters, { powers: true });
  for (let i = playback.firstStep; i < playback.lastStep; i++) replay.step(buffer.readStep(i, fighters));
  assert.deepEqual(fighters.map(captureFighter), expected);
});

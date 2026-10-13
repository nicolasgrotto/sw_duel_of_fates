import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Action, controlsConfig } from '../src/config/controlsConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { PlayerController } from '../src/controllers/PlayerController.js';
import { encodeIntent, decodeIntent, IntentRecorder } from '../src/controllers/IntentRecorder.js';
import { CombatAction, updateActionBuffer } from '../src/combat/actionBuffer.js';
import { captureFighter, ReplayBuffer, restoreFighter } from '../src/simulation/ReplayBuffer.js';
import { EnemyAI } from '../src/ai/EnemyAI.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { STEP, spawnFighter, createSimulation } from './helpers.js';

function setup(fourth = true, enabled = true) {
  const fighter = spawnFighter(400, 1, 'foretold');
  if (fourth) fighter.stats.power.loadout.fourth = powersConfig.powers.meteorRain;
  else delete fighter.stats.power.loadout.fourth;
  const input = { down: [], pressed: [], focused: true, resetGeneration: 0,
    isDown(action) { return this.down.includes(action); },
    wasPressed(action) { return this.pressed.includes(action); } };
  const controller = new PlayerController(input, { fighter, powersEnabled: enabled });
  const tick = (pressed = [], down = []) => {
    input.pressed = pressed;
    input.down = down;
    controller.updateIntent(fighter.intent, STEP);
    return fighter.intent;
  };
  return { fighter, input, controller, tick };
}

describe('fourth power chord', () => {
  for (const [first, second] of [[Action.POWER, Action.SPECIAL], [Action.SPECIAL, Action.POWER]]) {
    for (const gap of [0, 1, 5, 6, 7]) {
      it(`${first} then ${second} after ${gap} steps`, () => {
        const { tick } = setup();
        if (gap === 0) {
          const intent = tick([first, second], [first, second]);
          assert.equal(intent.fourthPower, true);
          assert.equal(intent.power || intent.special, false);
          return;
        }
        assert.equal(tick([first], [first]).fourthPower, false);
        for (let i = 1; i < gap; i++) tick([], [first]);
        const intent = tick([second], [first, second]);
        assert.equal(intent.fourthPower, gap <= 6);
        if (gap <= 6) assert.equal(intent.power || intent.special, false);
      });
    }
  }
  it('measures exactly six steps / 100 ms and preserves the press direction', () => {
    for (const action of [Action.POWER, Action.SPECIAL]) {
      const { fighter, tick } = setup();
      tick([action], [action, Action.MOVE_RIGHT]);
      let delay = 0;
      while (!fighter.intent[action]) {
        tick([], [Action.MOVE_LEFT]);
        delay += STEP;
        assert.ok(delay <= controlsConfig.fourthPower.chordWindow + 1e-10);
      }
      assert.ok(Math.abs(delay - 0.1) < 1e-10);
      assert.equal(fighter.intent.actionMoveX, 1);
      assert.equal(fighter.intent.powerHeld, false);
    }
  });
  for (const first of [Action.POWER, Action.SPECIAL]) {
    for (const other of [Action.LIGHT_ATTACK, Action.HEAVY_ATTACK, Action.BLOCK, Action.DODGE, Action.EVADE, Action.JUMP]) {
      it(`flushes ${first} before ${other}`, () => {
        const { fighter, tick } = setup();
        tick([first], [first]);
        const intent = tick([other], [other]);
        assert.equal(intent.resolvedAction, first);
        assert.equal(intent[first], true);
        updateActionBuffer(fighter, STEP, 0.2);
        assert.equal(fighter.combat.bufferedAction, first);
        if (other !== Action.JUMP) assert.ok(fighter.combat.queuedAction);
      });
    }
  }
  it('holds once with either chord button, releases both, and rearms', () => {
    const { tick } = setup();
    tick([Action.POWER, Action.SPECIAL], [Action.POWER, Action.SPECIAL]);
    assert.equal(tick([], [Action.SPECIAL]).fourthPowerHeld, true);
    assert.equal(tick([Action.POWER], [Action.POWER, Action.SPECIAL]).power, false);
    assert.equal(tick([], [Action.POWER]).fourthPowerHeld, true);
    assert.equal(tick().fourthPowerHeld, false);
    assert.equal(tick([Action.POWER, Action.SPECIAL], [Action.POWER, Action.SPECIAL]).fourthPower, true);
  });
  it('discards pending commands on pause/round clear, blur and a blur-focus cycle', () => {
    for (const mode of ['clear', 'blur', 'cycle']) {
      const { input, controller, tick } = setup();
      tick([Action.POWER], [Action.POWER]);
      if (mode === 'clear') controller.clearCapturedInput();
      if (mode === 'blur') input.focused = false;
      if (mode === 'cycle') input.resetGeneration++;
      for (let i = 0; i < 8; i++) assert.equal(tick().power, false);
      assert.equal(controller.pendingAction, null);
    }
  });
  it('does not delay three-slot fighters or disabled powers', () => {
    for (const [fourth, enabled] of [[false, true], [true, false]]) {
      for (const action of [Action.POWER, Action.SPECIAL]) {
        const { tick } = setup(fourth, enabled);
        assert.equal(tick([action], [action])[action], true);
      }
    }
  });
  it('keeps the direction captured during hit stop', () => {
    const { input, controller, fighter, tick } = setup();
    input.pressed = [Action.POWER];
    input.down = [Action.MOVE_RIGHT];
    controller.captureInput();
    tick([], [Action.MOVE_LEFT]);
    for (let i = 0; i < 6; i++) tick();
    assert.equal(fighter.intent.actionMoveX, 1);
  });
});

it('records semantic fourth power and ordered commands without raw chord presses', () => {
  const { fighter, tick } = setup();
  const recorder = new IntentRecorder(3);
  recorder.toggleRecording();
  tick([Action.POWER, Action.SPECIAL], [Action.POWER]);
  recorder.record(fighter.intent, 1);
  recorder.startPlayback();
  fighter.clearIntent();
  recorder.play(fighter.intent, -1);
  assert.equal(fighter.intent.fourthPower, true);
  assert.equal(fighter.intent.fourthPowerHeld, true);
  assert.equal(fighter.intent.power || fighter.intent.special, false);
  fighter.intent.actionMoveX = -1;
  fighter.intent.resolvedAction = 'special';
  const encoded = encodeIntent(fighter.intent, 1);
  decodeIntent(encoded, fighter.intent, -1);
  assert.equal(fighter.intent.actionMoveX, 1);
  assert.equal(fighter.intent.resolvedAction, 'special');
});

it('buffers a fourth power and replays the complete simulation deterministically', () => {
  const { fighter, tick } = setup();
  const opponent = spawnFighter(850, -1);
  const fighters = [fighter, opponent];
  const simulation = createSimulation(fighters, { powers: true });
  const buffer = new ReplayBuffer({ frames: 160, snapshotInterval: 10 });
  fighter.flowMeter = 100;
  for (let i = 0; i < 120; i++) {
    tick(i === 0 ? [Action.POWER, Action.SPECIAL] : [], i < 10 ? [Action.POWER] : []);
    buffer.record(fighters, STEP, simulation.projectiles);
    simulation.step(STEP);
    if (i === 0) assert.equal(fighter.combat.power.id, 'meteorRain');
  }
  const expected = fighters.map(captureFighter);
  const playback = buffer.createPlayback();
  fighters.forEach((f, i) => restoreFighter(f, playback.snapshot.fighters[i]));
  const replay = createSimulation(fighters, { powers: true });
  for (let i = playback.firstStep; i < playback.lastStep; i++) {
    const dt = buffer.readStep(i, fighters);
    replay.step(dt);
  }
  assert.deepEqual(fighters.map(captureFighter), expected);
});

it('AI requests the fourth slot semantically and uses its hold channel', () => {
  const { fighter } = setup();
  const ai = new EnemyAI({ self: fighter, opponent: spawnFighter(850, -1), profile: aiConfig.profiles.foretold,
    difficulty: aiConfig.difficulties.hard, perception: aiConfig.perception, random: () => 0, rules: { powers: true } });
  ai.startPower('fourth', 1);
  ai.writeIntent(fighter.intent);
  assert.equal(fighter.intent.fourthPower, true);
  assert.equal(fighter.intent.fourthPowerHeld, true);
  assert.equal(fighter.intent.power || fighter.intent.special || fighter.intent.powerHeld, false);
  assert.equal(CombatAction.FOURTH_POWER, 'fourthPower');
});

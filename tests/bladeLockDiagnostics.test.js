import { it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { Input } from '../src/core/Input.js';
import { TouchInput } from '../src/core/TouchInput.js';
import { Action } from '../src/config/controlsConfig.js';
import { PlayerController } from '../src/controllers/PlayerController.js';
import { captureFighter } from '../src/simulation/ReplayBuffer.js';
import { createBladeLockFixture, bladeLockTestNumbers } from './bladeLockHelpers.js';
import { assertSnapshotContinuation } from './consequenceHelpers.js';
import { STEP } from './helpers.js';

function advance(simulation, count, press = () => false) {
  const events = [];
  for (let step = 0; step < count; step += 1) {
    simulation.fighters.forEach((fighter, side) => {
      fighter.clearIntent();
      fighter.intent.lightAttack = press(step, side);
    });
    simulation.step(STEP);
    events.push(...simulation.events);
  }
  return events;
}

it('emits one start, accepted pressures with side and advantage, and one bounded result', () => {
  const { fighters: [a, b], simulation } = createBladeLockFixture();
  assert.equal(simulation.events.filter((event) => event.type === CombatEvent.BLADE_LOCK_START).length, 1);
  b.stamina = 30;
  const health = b.health;
  const events = advance(simulation, 19, (step, side) => side === 0 && step % 6 === 0);
  const presses = events.filter((event) => event.type === CombatEvent.BLADE_LOCK_PRESS);
  assert.deepEqual(presses.map((event) => event.side), [0, 0, 0, 0]);
  assert.deepEqual(presses.map((event) => event.advantage), [1, 2, 3, 4]);
  const endings = events.filter((event) => event.type === CombatEvent.BLADE_LOCK_END);
  assert.equal(endings.length, 1);
  assert.equal(endings[0].winner, a);
  assert.equal(endings[0].loser, b);
  assert.equal(endings[0].draw, false);
  assert.equal(endings[0].reason, 'margin');
  assert.equal(endings[0].damage, 8);
  assert.equal(endings[0].winnerPresses, 4);
  assert.ok(Math.abs(endings[0].duration - 19 * STEP) < 1e-12);
  assert.deepEqual([a.combat.lockWinCount, b.combat.lockWinCount], [1, 0]);
  assert.equal(b.combat.exhaustionBladeLockCount, 1);
  simulation.combat.spendStamina(b, 1, 'bladeLock');
  simulation.bladeLocks.finish(a, b, a);
  assert.equal(b.health, health - 8);
  assert.equal(b.combat.exhaustionBladeLockCount, 1);
  assert.equal(a.combat.lockEndCount, 1);
  assert.equal(b.combat.lockEndCount, 1);
});

it('reports simultaneous advantage after both sides and ignores rejected edges', () => {
  const { fighters, simulation } = createBladeLockFixture();
  const events = advance(simulation, 5, (step) => step % 2 === 0);
  const presses = events.filter((event) => event.type === CombatEvent.BLADE_LOCK_PRESS);
  assert.equal(presses.length, 2);
  assert.deepEqual(presses.map((event) => event.advantage), [0, 0]);
  assert.deepEqual(fighters.map((fighter) => fighter.combat.lockPresses), [1, 1]);
  assert.equal(simulation.bladeLocks.canStart(fighters[0], fighters[0]), false);
});

it('records draw duration once and distinguishes cancellation from a draw', () => {
  const draw = createBladeLockFixture();
  const events = advance(draw.simulation, 120);
  const end = events.find((event) => event.type === CombatEvent.BLADE_LOCK_END);
  assert.equal(end.draw, true);
  assert.equal(end.winner, null);
  assert.equal(end.loser, null);
  assert.equal(end.duration, 2);
  for (const fighter of draw.fighters) {
    assert.equal(fighter.combat.lockDrawCount, 1);
    assert.equal(fighter.combat.lockDurationTotal, 2);
    assert.equal(fighter.combat.lockEndCount, 1);
  }
  const death = createBladeLockFixture();
  death.fighters[1].restartState(FighterState.DEAD);
  death.simulation.step(STEP);
  const cancelled = death.simulation.events.find((event) => event.type === CombatEvent.BLADE_LOCK_END);
  assert.equal(cancelled.reason, 'death');
  assert.equal(cancelled.draw, false);
  assert.equal(cancelled.winner, null);
  assert.equal(death.fighters[0].combat.lockEndCount, 0);
  const reset = createBladeLockFixture();
  reset.simulation.bladeLocks.reset();
  assert.equal(reset.simulation.events.filter((event) => event.type === CombatEvent.BLADE_LOCK_END).length, 1);
  assert.equal(reset.simulation.events.at(-1).reason, 'reset');
  reset.fighters.forEach((fighter) => assert.equal(fighter.combat.lockCount, 0));
});

it('counts a lethal result once with damage capped to life and the normal death event', () => {
  const { fighters: [a, b], simulation } = createBladeLockFixture();
  b.health = 4;
  const events = advance(simulation, 19, (step, side) => side === 0 && step % 6 === 0);
  const end = events.find((event) => event.type === CombatEvent.BLADE_LOCK_END);
  assert.equal(end.damage, 4);
  assert.equal(end.winner, a);
  assert.equal(b.state, FighterState.DEAD);
  assert.equal(events.filter((event) => event.type === CombatEvent.DEATH).length, 1);
  assert.equal(a.combat.lockWinCount, 1);
});

it('snapshots every scalar diagnostic mid-lock and resets them between rounds', () => {
  const { fighters, simulation } = createBladeLockFixture();
  fighters[1].stamina = 30;
  advance(simulation, 10, (step, side) => side === 0 && step % 6 === 0);
  const fields = ['lockCount', 'lockWinCount', 'lockDrawCount', 'lockEndCount', 'lockDurationTotal', 'exhaustionBladeLockCount'];
  for (const fighter of fighters) {
    const snapshot = captureFighter(fighter);
    for (const field of fields) assert.equal(snapshot.combat[field], fighter.combat[field]);
  }
  assertSnapshotContinuation(simulation, 40, (current, step) => { current[0].intent.lightAttack = step % 6 === 0; });
  assert.equal(fighters[0].combat.lockWinCount, 1);
  assert.equal(fighters[1].combat.exhaustionBladeLockCount, 1);
  for (const fighter of fighters) {
    fighter.resetForRound(500, 1);
    for (const field of fields) assert.equal(fighter.combat[field], 0, field);
  }
});

function inputFixture(kind, hold = false) {
  const fixture = createBladeLockFixture();
  const target = new EventTarget();
  target.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1280, height: 720 });
  const pad = { connected: true, mapping: 'standard', axes: [0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false })) };
  let pads = kind === 'gamepad' ? [pad] : [];
  const input = new Input({ target, bindings: { [Action.LIGHT_ATTACK]: ['KeyQ'] }, getGamepads: () => pads });
  if (kind === 'touch') {
    const touch = new TouchInput({ target });
    input.addSource(touch);
    touch.setContext('duel');
  }
  const key = (type, repeat = false) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { code: 'KeyQ', repeat });
    target.dispatchEvent(event);
  };
  const pointer = (type, id) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { pointerId: id, pointerType: 'touch', clientX: 1220, clientY: 630 });
    target.dispatchEvent(event);
  };
  const press = () => {
    if (kind === 'keyboard') key('keydown');
    if (kind === 'gamepad') pad.buttons[2].pressed = true;
    if (kind === 'touch') pointer('pointerdown', 1);
  };
  const repeat = () => {
    if (kind === 'keyboard') key('keydown', true);
    if (kind === 'touch') pointer('pointerdown', 2);
  };
  const release = () => {
    if (kind === 'keyboard') key('keyup');
    if (kind === 'gamepad') pad.buttons[2].pressed = false;
    if (kind === 'touch') {
      pointer('pointerup', 1);
      pointer('pointerup', 2);
    }
  };
  const controller = new PlayerController(input, { fighter: fixture.fighters[0], settings: { bladeLockHold: [hold, false] } });
  const step = (opponentPress = false) => {
    input.poll();
    controller.updateIntent(fixture.fighters[0].intent, STEP);
    fixture.fighters[1].clearIntent();
    fixture.fighters[1].intent.lightAttack = opponentPress;
    fixture.simulation.step(STEP);
    input.endFrame();
  };
  return { ...fixture, target, input, controller, press, repeat, release, step, disconnect: () => { pads = []; } };
}

for (const kind of ['keyboard', 'gamepad', 'touch']) {
  it(`counts equivalent ${kind} edges without held, auto-repeat or duplicate-touch pressures`, () => {
    const current = inputFixture(kind);
    try {
      current.press();
      for (let step = 0; step < 25; step += 1) {
        current.repeat();
        current.step();
      }
      assert.equal(current.fighters[0].combat.lockPresses, 1);
      current.release();
      current.step();
      current.press();
      current.step();
      assert.equal(current.fighters[0].combat.lockPresses, 2);
    } finally { current.input.destroy(); }
  });
}

for (const interruption of ['blur', 'disconnect']) {
  it(`continues the lock after ${interruption} with no held presses from the affected side`, () => {
    const current = inputFixture(interruption === 'blur' ? 'keyboard' : 'gamepad', true);
    try {
      current.press();
      current.step();
      const health = current.fighters[0].health;
      if (interruption === 'blur') {
        current.release();
        current.press();
        current.controller.captureInput();
        current.target.dispatchEvent(new Event('blur'));
      } else current.disconnect();
      for (let step = 0; step < 25; step += 1) current.step(step % 6 === 0);
      const end = current.simulation.events.find((event) => event.type === CombatEvent.BLADE_LOCK_END);
      assert.equal(end.winner, current.fighters[1]);
      assert.equal(end.loserPresses, 1);
      assert.equal(current.fighters[0].health, health - 8);
      assert.equal(current.input.isDown(Action.LIGHT_ATTACK), false);
    } finally { current.input.destroy(); }
  });
}

it('exposes actual lock counts, side wins, weighted duration and exhaustion in the simulator', () => {
  const overrides = [
    ...Object.entries(bladeLockTestNumbers).map(([name, value]) => `combatRules.bladeLock.${name}=${value}`),
    'combatRules.bladeLock.staminaLoss=1000', 'game.duel.spawnDistance=80',
    'ai.profiles.aggressive.attackChance=1', 'ai.profiles.aggressive.heavyChance=1',
    'ai.profiles.aggressive.blockChance=0', 'ai.profiles.aggressive.guardChance=0',
    'ai.profiles.aggressive.dodgeChance=0',
    ...['easy', 'hard'].flatMap((name) => ['reactionTime', 'mistakeChance', 'attackTell', 'parryChance',
      'perfectParryChance', 'specialMultiplier', 'shoveMultiplier', 'jumpChance', 'attackCooldown',
      'recoveryGuardChance'].map((field) => `ai.difficulties.${name}.${field}=0`)),
    'ai.difficulties.easy.bladeLockRate=5', 'ai.difficulties.hard.bladeLockRate=9',
    'ai.perception.reactionJitter=0',
  ];
  const args = ['tools/simulate.js', '--duels', '2', '--maxSeconds', '3', '--left', 'guardian', '--right', 'guardian',
    '--profile', 'aggressive', '--leftDifficulty', 'hard', '--rightDifficulty', 'easy', '--rules', 'bladeLock,exhaustion',
    ...overrides.flatMap((value) => ['--set', value])];
  const output = execFileSync(process.execPath, args, { encoding: 'utf8' });
  assert.match(output, /avg blade locks: 1.00  wins A 1.00 B 0.00  draws 0.00  duration [\d.]+ s/);
  assert.match(output, /avg exhaustion:.*bladeLock 1.00/);
  const legacy = execFileSync(process.execPath, ['tools/simulate.js', '--duels', '1', '--maxSeconds', '0.1'], { encoding: 'utf8' });
  assert.doesNotMatch(legacy, /avg blade locks|bladeLock [\d.]+/);
});

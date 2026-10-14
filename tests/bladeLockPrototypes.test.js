import { it } from 'node:test';
import assert from 'node:assert/strict';
import { getBeatProgress, isOnBeat } from '../src/combat/BladeLockSystem.js';
import { aiConfig } from '../src/config/aiConfig.js';
import { Action } from '../src/config/controlsConfig.js';
import { combatRulesConfig, resolveCombatRules } from '../src/config/combatRulesConfig.js';
import { powersConfig } from '../src/config/powersConfig.js';
import { PlayerController } from '../src/controllers/PlayerController.js';
import { EnemyAI } from '../src/ai/EnemyAI.js';
import { createDuelRules, DuelMode } from '../src/states/duelModes.js';
import { createRandom } from '../src/utils/random.js';
import { STEP } from './helpers.js';
import { createBladeLockFixture, bladeLockTestNumbers } from './bladeLockHelpers.js';

const RHYTHM_RULES = { bladeLock: true, exhaustion: true, bladeLockRhythm: true };
const { beat, window } = combatRulesConfig.bladeLock.rhythm;

function pressAt(simulation, fighter, times, duration) {
  const frames = Math.round(duration / STEP);
  const pressFrames = new Set(times.map((time) => Math.round(time / STEP)));
  for (let frame = 1; frame <= frames; frame += 1) {
    fighter.intent.lightAttack = pressFrames.has(frame);
    simulation.step(STEP);
  }
}

it('keeps the approved blade lock as the default and enables the rhythm only by option in its modes', () => {
  for (const mode of Object.values(DuelMode)) {
    assert.equal(createDuelRules(mode, {}, powersConfig.modes).bladeLockRhythm, false, mode);
    const enabled = createDuelRules(mode, { prototypes: { bladeLockRhythm: true } }, powersConfig.modes).bladeLockRhythm;
    assert.equal(enabled, ['versus', 'local', 'training'].includes(mode), mode);
  }
  assert.equal(resolveCombatRules({ bladeLockRhythm: true }).bladeLockRhythm, false);
});

it('scores the first press on each beat and takes one away for every other press', () => {
  combatRulesConfig.bladeLock.winMargin = 100;
  combatRulesConfig.bladeLock.maxDuration = 3;
  const { fighters: [a], simulation } = createBladeLockFixture(RHYTHM_RULES);
  pressAt(simulation, a, [beat, beat * 2 + window / 2, beat * 3], beat * 3 + STEP);
  assert.equal(a.combat.lockPresses, 3);
  pressAt(simulation, a, [beat / 2], beat / 2 + STEP);
  assert.equal(a.combat.lockPresses, 2);
  Object.assign(combatRulesConfig.bladeLock, bladeLockTestNumbers);
});

it('never lets mashing beat steady timing', () => {
  combatRulesConfig.bladeLock.winMargin = 100;
  combatRulesConfig.bladeLock.maxDuration = 3;
  const { fighters: [masher, timer], simulation } = createBladeLockFixture(RHYTHM_RULES);
  for (let frame = 1; frame <= Math.round(2.4 / STEP); frame += 1) {
    const time = frame * STEP;
    masher.intent.lightAttack = frame % 5 === 0;
    timer.intent.lightAttack = Math.abs(time - Math.round(time / beat) * beat) < STEP / 2 && time > beat / 2;
    simulation.step(STEP);
  }
  assert.ok(timer.combat.lockPresses >= 7, `${timer.combat.lockPresses}`);
  assert.ok(masher.combat.lockPresses < timer.combat.lockPresses / 2, `${masher.combat.lockPresses}`);
  Object.assign(combatRulesConfig.bladeLock, bladeLockTestNumbers);
});

it('marks presses on and off the beat in the press event and resets the beat on a new lock', () => {
  combatRulesConfig.bladeLock.winMargin = 100;
  const { fighters: [a], simulation } = createBladeLockFixture(RHYTHM_RULES);
  const events = [];
  for (let frame = 1; frame <= Math.round((beat + STEP) / STEP); frame += 1) {
    a.intent.lightAttack = frame === 6 || frame === Math.round(beat / STEP);
    simulation.step(STEP);
    events.push(...simulation.events.filter((event) => event.type === 'bladeLockPress'));
  }
  assert.deepEqual(events.map((event) => event.onBeat), [false, true]);
  assert.equal(a.combat.lockBeat, 1);
  assert.ok(isOnBeat(beat) && !isOnBeat(beat / 2));
  assert.ok(getBeatProgress(beat * 0.5) > 0.49 && getBeatProgress(beat * 0.5) < 0.51);
  Object.assign(combatRulesConfig.bladeLock, bladeLockTestNumbers);
});

it('lets the AI press once per beat, more accurately on harder difficulties', () => {
  const accuracy = {};
  for (const id of ['easy', 'hard']) {
    combatRulesConfig.bladeLock.winMargin = 100;
    combatRulesConfig.bladeLock.maxDuration = 3;
    const { fighters: [ai, idle], simulation } = createBladeLockFixture(RHYTHM_RULES);
    const controller = new EnemyAI({ self: ai, opponent: idle, profile: Object.values(aiConfig.profiles)[0], difficulty: aiConfig.difficulties[id],
      perception: aiConfig.perception, random: createRandom(5), rules: RHYTHM_RULES });
    const events = [];
    for (let frame = 0; frame < Math.round(2.9 / STEP); frame += 1) {
      controller.updateIntent(ai.intent, STEP);
      simulation.step(STEP);
      events.push(...simulation.events.filter((event) => event.type === 'bladeLockPress' && event.attacker === ai));
    }
    assert.ok(events.length <= Math.ceil(2.9 / beat), `${id}: ${events.length}`);
    accuracy[id] = events.filter((event) => event.onBeat).length;
    Object.assign(combatRulesConfig.bladeLock, bladeLockTestNumbers);
  }
  assert.ok(accuracy.hard > accuracy.easy, JSON.stringify(accuracy));
});

it('makes the competitive hold match the hard AI rate only when its option is on', () => {
  for (const competitive of [false, true]) {
    const { fighters: [a], simulation } = createBladeLockFixture();
    combatRulesConfig.bladeLock.winMargin = 100;
    const controller = new PlayerController({ isDown: (action) => action === Action.LIGHT_ATTACK, wasPressed: () => false },
      { fighter: a, settings: { bladeLockHold: [true, false], prototypes: { competitiveHold: competitive } } });
    for (let step = 0; step < 60; step += 1) {
      controller.updateIntent(a.intent, STEP);
      simulation.step(STEP);
    }
    assert.equal(a.combat.lockPresses, competitive ? combatRulesConfig.bladeLock.competitiveHoldRate : bladeLockTestNumbers.holdRate);
    Object.assign(combatRulesConfig.bladeLock, bladeLockTestNumbers);
  }
  assert.equal(combatRulesConfig.bladeLock.competitiveHoldRate, aiConfig.difficulties.hard.bladeLockRate);
});

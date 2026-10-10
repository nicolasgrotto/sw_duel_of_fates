import { it } from 'node:test';
import assert from 'node:assert/strict';
import { DuelAudio } from '../src/audio/DuelAudio.js';
import { SoundName } from '../src/audio/soundNames.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { createSimulation, repeat, spawnFighter } from './helpers.js';

const STEP = 1 / 60;

function createLock() {
  const fighters = [spawnFighter(500, 1), spawnFighter(580, -1, 'wasp')];
  const simulation = createSimulation(fighters, { bladeLock: true });
  fighters.forEach((fighter) => { fighter.combat.attack = fighter.moves.heavy; });
  simulation.bladeLocks.tryStart(...fighters);
  return { fighters, simulation };
}

function step(simulation, times) {
  repeat(times, () => simulation.step(STEP));
}

it('plays the lock sounds and runs the grind only while a lock is active', () => {
  const played = [];
  const grinds = [];
  const audio = {
    isReady: true,
    play: (name) => played.push(name),
    duckMusic() {},
    setMusicTension() {},
    createHum: () => ({ setMode() {}, setPan() {}, stop() {} }),
    createGrind: () => {
      const grind = { intensities: [], stopped: false, setPan() {}, setIntensity(value) { this.intensities.push(value); }, stop() { this.stopped = true; } };
      grinds.push(grind);
      return grind;
    },
  };
  const duelAudio = new DuelAudio(audio, { arenaWidth: 1280, stereoWidth: 0.6, hum: { level: 0, cutoff: 0, swingLevel: 0, swingCutoff: 0, swingPitch: 1 } });
  const { fighters, simulation } = createLock();
  duelAudio.handleEvents(simulation.events);
  duelAudio.update(fighters);
  step(simulation, 30);
  duelAudio.update(fighters);
  assert.equal(grinds.length, 1);
  assert.ok(grinds[0].intensities.at(-1) > grinds[0].intensities[0]);

  duelAudio.handleEvents([
    { type: CombatEvent.BLADE_LOCK_PRESS, x: 540 },
    { type: CombatEvent.BLADE_LOCK_END, x: 540, winner: fighters[0], loser: fighters[1], draw: false },
    { type: CombatEvent.BLADE_LOCK_END, x: 540, winner: null, loser: null, draw: true },
    { type: CombatEvent.BLADE_LOCK_END, x: 540, winner: null, loser: null, draw: false },
  ]);
  assert.deepEqual(played, [SoundName.CLASH, SoundName.BLADE_LOCK_PRESS, SoundName.BLADE_LOCK_WIN, SoundName.BLADE_LOCK_BREAK]);

  duelAudio.stopGrind();
  assert.equal(grinds[0].stopped, true);
  duelAudio.update(fighters);
  assert.equal(grinds.length, 2);
  fighters.forEach((fighter) => fighter.restartState(FighterState.IDLE));
  duelAudio.update(fighters);
  assert.equal(grinds[1].stopped, true);
  duelAudio.stop();
  assert.equal(grinds.length, 2);
});

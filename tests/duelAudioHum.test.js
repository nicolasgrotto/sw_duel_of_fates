import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DuelAudio } from '../src/audio/DuelAudio.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { audioConfig } from '../src/config/audioConfig.js';
import { FighterState } from '../src/entities/fighterStates.js';
import { spawnFighter } from './helpers.js';

function createFakeAudio({ ready = true } = {}) {
  const audio = {
    isReady: ready,
    hums: [],
    ducks: [],
    play: () => {},
    duckMusic: (duration) => audio.ducks.push(duration),
    createHum: (frequency) => {
      const hum = { frequency, modes: [], pans: [], stopped: false };
      hum.setMode = (level, cutoff, pitch) => hum.modes.push({ level, cutoff, pitch });
      hum.setPan = (pan) => hum.pans.push(pan);
      hum.stop = () => {
        hum.stopped = true;
      };
      audio.hums.push(hum);
      return hum;
    },
  };
  return audio;
}

function createDuelAudio(audio) {
  return new DuelAudio(audio, {
    arenaWidth: 1280,
    stereoWidth: audioConfig.stereoWidth,
    hum: audioConfig.hum,
    musicDuckDuration: audioConfig.music.duckDuration,
  });
}

function startActiveAttack(fighter) {
  fighter.combat.attack = fighter.stats.attacks.light;
  fighter.combat.attackType = 'light';
  fighter.restartState(FighterState.ATTACKING);
  fighter.stateTime = fighter.combat.attack.startup + 0.01;
}

describe('DuelAudio saber hum', () => {
  it('waits until the audio is ready to create the hums', () => {
    const audio = createFakeAudio({ ready: false });
    const duelAudio = createDuelAudio(audio);
    const fighters = [spawnFighter(300), spawnFighter(900, -1, 'shadow')];

    duelAudio.update(fighters);
    assert.equal(audio.hums.length, 0);

    audio.isReady = true;
    duelAudio.update(fighters);
    assert.deepEqual(
      audio.hums.map((hum) => hum.frequency),
      fighters.map((fighter) => fighter.sound.humFrequency),
    );
  });

  it('changes the hum only when the mode changes', () => {
    const audio = createFakeAudio();
    const duelAudio = createDuelAudio(audio);
    const fighter = spawnFighter(300);

    duelAudio.update([fighter]);
    duelAudio.update([fighter]);
    const [hum] = audio.hums;
    assert.equal(hum.modes.length, 1);
    assert.equal(hum.modes[0].level, audioConfig.hum.level);

    startActiveAttack(fighter);
    duelAudio.update([fighter]);
    assert.equal(hum.modes[1].level, audioConfig.hum.swingLevel);
    assert.equal(hum.modes[1].pitch, audioConfig.hum.swingPitch);

    fighter.restartState(FighterState.DEAD);
    duelAudio.update([fighter]);
    assert.equal(hum.modes[2].level, 0);
  });

  it('follows the fighter in stereo and stops the hums at the end', () => {
    const audio = createFakeAudio();
    const duelAudio = createDuelAudio(audio);
    const fighter = spawnFighter(0);

    duelAudio.update([fighter]);
    duelAudio.stop();

    assert.equal(audio.hums[0].pans[0], -audioConfig.stereoWidth);
    assert.equal(audio.hums[0].stopped, true);
  });

  it('lowers the music on the final blow', () => {
    const audio = createFakeAudio();
    const duelAudio = createDuelAudio(audio);
    const attacker = spawnFighter(300);

    duelAudio.handleEvents([{ type: CombatEvent.DEATH, attacker, defender: null, attackType: 'light', x: 300, y: 500 }]);

    assert.deepEqual(audio.ducks, [audioConfig.music.duckDuration]);
  });
});

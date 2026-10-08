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
    tensions: [],
    played: [],
    play: (name) => audio.played.push(name),
    duckMusic: (duration) => audio.ducks.push(duration),
    setMusicTension: (amount) => audio.tensions.push(amount),
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
    tension: audioConfig.music.tension,
    heartbeat: audioConfig.music.heartbeat,
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

describe('DuelAudio dynamic music', () => {
  it('raises the music tension as the lowest health drops', () => {
    const audio = createFakeAudio();
    const duelAudio = createDuelAudio(audio);
    const fighters = [spawnFighter(400, 1), spawnFighter(800, -1, 'shadow')];

    duelAudio.updateMusic(fighters, fighters[0], 1 / 60);
    assert.deepEqual(audio.tensions, []);

    fighters[1].health = fighters[1].stats.maxHealth * 0.4;
    duelAudio.updateMusic(fighters, fighters[0], 1 / 60);
    assert.ok(Math.abs(audio.tensions[0] - 0.6) < 1e-9);

    duelAudio.stop();
    assert.equal(audio.tensions.at(-1), 0);
  });

  it('beats twice per interval while the watched fighter has low health', () => {
    const audio = createFakeAudio();
    const duelAudio = createDuelAudio(audio);
    const fighters = [spawnFighter(400, 1), spawnFighter(800, -1, 'shadow')];
    const { interval } = audioConfig.music.heartbeat;
    fighters[0].health = fighters[0].stats.maxHealth * 0.1;

    for (let time = 0; time < interval * 2 - 1e-6; time += 1 / 60) {
      duelAudio.updateMusic(fighters, fighters[0], 1 / 60);
    }

    assert.equal(audio.played.filter((name) => name === 'heartbeat').length, 4);
  });
});

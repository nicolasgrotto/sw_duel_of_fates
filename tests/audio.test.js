import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DuelAudio } from '../src/audio/DuelAudio.js';
import { SoundName } from '../src/audio/soundNames.js';
import { CombatEvent } from '../src/combat/combatEvents.js';
import { Action } from '../src/config/controlsConfig.js';
import { audioConfig } from '../src/config/audioConfig.js';
import { AudioManager } from '../src/core/AudioManager.js';
import { MenuList } from '../src/ui/MenuList.js';
import { spawnFighter } from './helpers.js';

function createRecordingAudio() {
  const played = [];
  return {
    played,
    play: (name, options = {}) => played.push({ name, pan: options.pan }),
  };
}

function createEvent(type, x, attackType = 'light') {
  return { type, attacker: spawnFighter(x), defender: null, attackType, x, y: 500 };
}

describe('AudioManager', () => {
  it('does nothing when there is no audio support', () => {
    const audio = new AudioManager(audioConfig);

    audio.unlock();

    assert.equal(audio.isReady, false);
    assert.doesNotThrow(() => audio.play(SoundName.HIT));
  });

  it('has a recipe for every sound name', () => {
    for (const name of Object.values(SoundName)) {
      assert.ok(Array.isArray(audioConfig.sounds[name]), name);
    }
  });
});

describe('DuelAudio', () => {
  it('maps combat events to sounds', () => {
    const audio = createRecordingAudio();
    const duelAudio = new DuelAudio(audio, { arenaWidth: 1280, stereoWidth: 0.6 });

    duelAudio.handleEvents([
      createEvent(CombatEvent.ATTACK_START, 640, 'light'),
      createEvent(CombatEvent.ATTACK_START, 640, 'heavy'),
      createEvent(CombatEvent.HIT, 640, 'heavy'),
      createEvent(CombatEvent.BLOCK, 640),
      createEvent(CombatEvent.CLASH, 640),
      createEvent(CombatEvent.DODGE, 640, null),
    ]);

    assert.deepEqual(
      audio.played.map((sound) => sound.name),
      [SoundName.SWING_LIGHT, SoundName.SWING_HEAVY, SoundName.HEAVY_HIT, SoundName.BLOCK, SoundName.CLASH, SoundName.DODGE],
    );
  });

  it('places the sound in stereo by the event position', () => {
    const audio = createRecordingAudio();
    const duelAudio = new DuelAudio(audio, { arenaWidth: 1280, stereoWidth: 0.6 });

    duelAudio.handleEvents([createEvent(CombatEvent.HIT, 0), createEvent(CombatEvent.HIT, 640), createEvent(CombatEvent.HIT, 1280)]);

    assert.deepEqual(
      audio.played.map((sound) => sound.pan),
      [-0.6, 0, 0.6],
    );
  });
});

describe('MenuList sounds', () => {
  it('plays a tick when moving and a tone when confirming', () => {
    const audio = createRecordingAudio();
    const menu = new MenuList([{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }], { firstItemY: 0, itemSpacing: 10 }, audio);

    menu.update({ wasPressed: (action) => action === Action.MENU_DOWN });
    menu.update({ wasPressed: (action) => action === Action.CONFIRM });

    assert.deepEqual(
      audio.played.map((sound) => sound.name),
      [SoundName.UI_MOVE, SoundName.UI_CONFIRM],
    );
  });
});

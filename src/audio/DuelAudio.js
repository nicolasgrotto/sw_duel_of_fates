import { AttackType, isStrongAttack } from '../combat/attackPhases.js';
import { CombatEvent } from '../combat/combatEvents.js';
import { isAttackActive } from '../combat/hitboxes.js';
import { clamp } from '../utils/math.js';
import { SoundName } from './soundNames.js';

function getSoundForEvent(event) {
  const isHeavy = event.attackType === AttackType.HEAVY;
  const isStrong = isStrongAttack(event.attackType);

  switch (event.type) {
    case CombatEvent.ATTACK_START:
      return isHeavy ? SoundName.SWING_HEAVY : SoundName.SWING_LIGHT;
    case CombatEvent.HIT:
      return isStrong ? SoundName.HEAVY_HIT : SoundName.HIT;
    case CombatEvent.BLOCK:
      return SoundName.BLOCK;
    case CombatEvent.GUARD_BREAK:
      return SoundName.GUARD_BREAK;
    case CombatEvent.CLASH:
      return SoundName.CLASH;
    case CombatEvent.DEATH:
      return SoundName.DEATH;
    case CombatEvent.DODGE:
      return SoundName.DODGE;
    case CombatEvent.ACTION_REJECTED:
      return SoundName.DENIED;
    default:
      return null;
  }
}

export const HumMode = Object.freeze({
  IDLE: 'idle',
  SWING: 'swing',
  OFF: 'off',
});

function getHumMode(fighter) {
  if (!fighter.isAlive) {
    return HumMode.OFF;
  }
  return isAttackActive(fighter) ? HumMode.SWING : HumMode.IDLE;
}

export class DuelAudio {
  constructor(audio, { arenaWidth, stereoWidth, hum, musicDuckDuration }) {
    this.audio = audio;
    this.arenaWidth = arenaWidth;
    this.stereoWidth = stereoWidth;
    this.humConfig = hum;
    this.musicDuckDuration = musicDuckDuration;
    this.playOptions = { pan: 0, intensity: 1 };
    this.hums = null;
  }

  update(fighters) {
    if (!this.hums) {
      if (!this.audio.isReady) {
        return;
      }
      this.hums = fighters.map((fighter) => ({ handle: this.audio.createHum(fighter.sound.humFrequency), mode: null }));
    }

    for (let i = 0; i < fighters.length; i += 1) {
      this.updateHum(this.hums[i], fighters[i]);
    }
  }

  updateHum(hum, fighter) {
    hum.handle.setPan(this.getPan(fighter.x));

    const mode = getHumMode(fighter);
    if (mode === hum.mode) {
      return;
    }
    hum.mode = mode;

    const { level, swingLevel, cutoff, swingCutoff, swingPitch } = this.humConfig;
    if (mode === HumMode.SWING) {
      hum.handle.setMode(swingLevel, swingCutoff, swingPitch);
    } else if (mode === HumMode.IDLE) {
      hum.handle.setMode(level, cutoff, 1);
    } else {
      hum.handle.setMode(0, cutoff, 1);
    }
  }

  stop() {
    for (const hum of this.hums ?? []) {
      hum.handle.stop();
    }
    this.hums = null;
  }

  getPan(x) {
    return clamp((x / this.arenaWidth) * 2 - 1, -1, 1) * this.stereoWidth;
  }

  handleEvents(events) {
    for (const event of events) {
      const sound = getSoundForEvent(event);
      if (sound) {
        this.playOptions.pan = this.getPan(event.x);
        this.audio.play(sound, this.playOptions);
      }
      if (event.type === CombatEvent.DEATH) {
        this.audio.duckMusic(this.musicDuckDuration);
      }
    }
  }
}

import { AttackType } from '../combat/attackPhases.js';
import { CombatEvent } from '../combat/combatEvents.js';
import { clamp } from '../utils/math.js';
import { SoundName } from './soundNames.js';

function getSoundForEvent(event) {
  const isHeavy = event.attackType === AttackType.HEAVY;

  switch (event.type) {
    case CombatEvent.ATTACK_START:
      return isHeavy ? SoundName.SWING_HEAVY : SoundName.SWING_LIGHT;
    case CombatEvent.HIT:
      return isHeavy ? SoundName.HEAVY_HIT : SoundName.HIT;
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
    default:
      return null;
  }
}

export class DuelAudio {
  constructor(audio, { arenaWidth, stereoWidth }) {
    this.audio = audio;
    this.arenaWidth = arenaWidth;
    this.stereoWidth = stereoWidth;
    this.playOptions = { pan: 0, intensity: 1 };
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
    }
  }
}

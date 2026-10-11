import { AttackType, isHeavyAttack, isStrongAttack } from '../combat/attackPhases.js';
import { CombatEvent } from '../combat/combatEvents.js';
import { isSaberStrikeActive } from '../combat/hitboxes.js';
import { combatRulesConfig } from '../config/combatRulesConfig.js';
import { FighterState } from '../entities/fighterStates.js';
import { clamp } from '../utils/math.js';
import { SoundName } from './soundNames.js';

function getSoundForEvent(event) {
  const isHeavy = isHeavyAttack(event.attackType);
  const isStrong = isStrongAttack(event.attackType);

  switch (event.type) {
    case CombatEvent.ATTACK_START:
      if (event.attackType === AttackType.SHOVE) {
        return null;
      }
      return isHeavy ? SoundName.SWING_HEAVY : SoundName.SWING_LIGHT;
    case CombatEvent.SHOVE:
      return SoundName.SHOVE;
    case CombatEvent.HIT:
      return isStrong ? SoundName.HEAVY_HIT : SoundName.HIT;
    case CombatEvent.BLOCK:
      return SoundName.BLOCK;
    case CombatEvent.GUARD_BREAK:
      return SoundName.GUARD_BREAK;
    case CombatEvent.CLASH:
    case CombatEvent.BLADE_LOCK_START:
      return SoundName.CLASH;
    case CombatEvent.BLADE_LOCK_PRESS:
      return SoundName.BLADE_LOCK_PRESS;
    case CombatEvent.BLADE_LOCK_END:
      if (event.winner) return SoundName.BLADE_LOCK_WIN;
      return event.draw ? SoundName.BLADE_LOCK_BREAK : null;
    case CombatEvent.DEATH:
      return SoundName.DEATH;
    case CombatEvent.EVADE_SUCCESS:
      return SoundName.EVADE_SUCCESS;
    case CombatEvent.EXHAUSTION:
      return SoundName.EXHAUSTED;
    case CombatEvent.WOUND:
      return SoundName.WOUND;
    case CombatEvent.DODGE:
      return SoundName.DODGE;
    case CombatEvent.ACTION_REJECTED:
      return SoundName.DENIED;
    case CombatEvent.FEINT:
      return SoundName.FEINT;
    case CombatEvent.PARRY:
    case CombatEvent.COUNTER:
      return SoundName.PARRY;
    case CombatEvent.PERFECT_PARRY:
      return SoundName.PERFECT_PARRY;
    case CombatEvent.POWER_START:
      if (event.attackType === 'drain') return SoundName.DRAIN;
      return event.attackType === 'barrier' ? SoundName.BARRIER : SoundName.POWER_CHARGE;
    case CombatEvent.POWER_ACTIVE:
      if (event.attackType === 'wrath') return SoundName.WRATH;
      return event.attackType === 'pull' ? SoundName.POWER_PULL : SoundName.POWER_WAVE;
    case CombatEvent.POWER_HIT:
      if (event.attackType === 'drain') return null;
      if (event.attackType === 'mindTwist') return SoundName.MIND_TWIST;
      return event.attackType === 'lightning' ? SoundName.LIGHTNING : SoundName.POWER_IMPACT;
    case CombatEvent.POWER_BLOCKED:
      return SoundName.BLOCK;
    case CombatEvent.POWER_RESISTED:
      return SoundName.POWER_RESISTED;
    case CombatEvent.POWER_ABSORBED:
      if (event.defender?.combat.absorbTime > 0 && event.attackType !== 'storm') return SoundName.ABSORB;
      return SoundName.POWER_ABSORBED;
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
  return isSaberStrikeActive(fighter) ? HumMode.SWING : HumMode.IDLE;
}

export class DuelAudio {
  constructor(audio, { arenaWidth, stereoWidth, hum, musicDuckDuration, perfectParryDuckDuration, tension, heartbeat }) {
    this.audio = audio;
    this.arenaWidth = arenaWidth;
    this.stereoWidth = stereoWidth;
    this.humConfig = hum;
    this.musicDuckDuration = musicDuckDuration;
    this.perfectParryDuckDuration = perfectParryDuckDuration;
    this.tension = tension;
    this.heartbeat = heartbeat;
    this.tensionLevel = 0;
    this.heartbeatTime = heartbeat ? heartbeat.interval : 0;
    this.secondBeatPending = false;
    this.playOptions = { pan: 0, intensity: 1 };
    this.hums = null;
    this.grind = null;
  }

  updateMusic(fighters, heartbeatFighter, dt) {
    const lowestRatio = Math.min(...fighters.map((fighter) => fighter.health / fighter.stats.maxHealth));
    const level = clamp(1 - lowestRatio, 0, 1);
    if (Math.abs(level - this.tensionLevel) >= this.tension.step) {
      this.tensionLevel = level;
      this.audio.setMusicTension(level);
    }
    this.updateHeartbeat(heartbeatFighter, dt);
  }

  updateHeartbeat(fighter, dt) {
    const inDanger = fighter.isAlive && fighter.health / fighter.stats.maxHealth < this.heartbeat.healthRatio;
    if (!inDanger) {
      this.heartbeatTime = this.heartbeat.interval;
      this.secondBeatPending = false;
      return;
    }
    this.heartbeatTime += dt;
    if (this.heartbeatTime >= this.heartbeat.interval) {
      this.heartbeatTime = 0;
      this.secondBeatPending = true;
      this.playHeartbeat();
    } else if (this.secondBeatPending && this.heartbeatTime >= this.heartbeat.secondBeat) {
      this.secondBeatPending = false;
      this.playHeartbeat();
    }
  }

  playHeartbeat() {
    this.playOptions.pan = 0;
    this.audio.play(SoundName.HEARTBEAT, this.playOptions);
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
    this.updateGrind(fighters);
  }

  updateGrind(fighters) {
    const locked = fighters.find((fighter) => fighter.state === FighterState.BLADE_LOCK);
    if (!locked) {
      this.stopGrind();
      return;
    }
    this.grind ??= this.audio.createGrind();
    const opponent = fighters[locked.combat.lockOpponent] ?? locked;
    this.grind.setPan(this.getPan((locked.x + opponent.x) / 2));
    this.grind.setIntensity(clamp(locked.combat.lockTime / combatRulesConfig.bladeLock.maxDuration, 0, 1));
  }

  stopGrind() {
    this.grind?.stop();
    this.grind = null;
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

  playIgnition() {
    this.playOptions.pan = 0;
    this.audio.play(SoundName.IGNITE, this.playOptions);
  }

  stop() {
    this.stopGrind();
    this.audio.setMusicTension(0);
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
      } else if (event.type === CombatEvent.PERFECT_PARRY) {
        this.audio.duckMusic(this.perfectParryDuckDuration);
      }
    }
  }
}

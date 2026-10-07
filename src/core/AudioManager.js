import { createHum, createMusic, playSound } from '../audio/synth.js';

const SILENT_HUM = Object.freeze({
  setMode() {},
  setPan() {},
  stop() {},
});

function getAudioContextClass() {
  return globalThis.AudioContext ?? globalThis.webkitAudioContext ?? null;
}

export class AudioManager {
  constructor(config) {
    this.config = config;
    this.context = null;
    this.sfxEnabled = true;
    this.musicEnabled = true;
    this.music = null;
  }

  get isReady() {
    return this.context !== null && this.context.state === 'running';
  }

  unlock() {
    const AudioContextClass = getAudioContextClass();
    if (!AudioContextClass) {
      return;
    }
    if (!this.context) {
      this.createGraph(new AudioContextClass());
    }
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
    if (!this.music) {
      this.music = createMusic(this.context, this.musicBus, this.config.music);
    }
  }

  createGraph(context) {
    const { volumes } = this.config;
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = volumes.master;
    this.master.connect(context.destination);

    this.sfxBus = context.createGain();
    this.sfxBus.gain.value = this.sfxEnabled ? volumes.sfx : 0;
    this.sfxBus.connect(this.master);

    this.musicBus = context.createGain();
    this.musicBus.gain.value = this.musicEnabled ? volumes.music : 0;
    this.musicBus.connect(this.master);
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = enabled;
    if (this.context) {
      this.sfxBus.gain.value = enabled ? this.config.volumes.sfx : 0;
    }
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (this.context) {
      this.musicBus.gain.value = enabled ? this.config.volumes.music : 0;
    }
  }

  createHum(frequency) {
    if (!this.isReady) {
      return SILENT_HUM;
    }
    return createHum(this.context, this.sfxBus, this.config.hum, frequency);
  }

  duckMusic(duration) {
    this.music?.duck(duration);
  }

  play(name, options = {}) {
    if (!this.isReady || !this.sfxEnabled) {
      return;
    }
    const layers = this.config.sounds[name];
    if (!layers) {
      return;
    }
    playSound(this.context, this.sfxBus, layers, { ...options, envelopeFloor: this.config.envelopeFloor });
  }
}

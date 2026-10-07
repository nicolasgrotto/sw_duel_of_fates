export const audioConfig = {
  volumes: {
    master: 0.8,
    sfx: 0.9,
    music: 0.35,
  },
  stereoWidth: 0.6,
  hum: {
    wave: 'sawtooth',
    detune: 1.012,
    cutoff: 380,
    level: 0.035,
    swingLevel: 0.1,
    swingCutoff: 1400,
    swingPitch: 1.35,
    smoothing: 0.04,
    releaseTime: 0.25,
  },
  music: {
    notes: [
      { frequency: 55, wave: 'triangle', gain: 0.5 },
      { frequency: 82.6, wave: 'sine', gain: 0.35 },
      { frequency: 110.4, wave: 'triangle', gain: 0.2 },
    ],
    cutoff: 320,
    lfoRate: 0.06,
    lfoDepth: 160,
    level: 0.6,
    fadeIn: 2,
    duckDuration: 1.6,
    duckFade: 0.05,
    returnFade: 0.6,
  },
  envelopeFloor: 0.0001,
  sounds: {
    swingLight: [
      { type: 'noise', duration: 0.18, attack: 0.02, gain: 0.35, filter: { type: 'bandpass', from: 600, to: 2400, q: 1.2 } },
      { type: 'tone', wave: 'sawtooth', from: 140, to: 220, duration: 0.18, attack: 0.02, gain: 0.06, filter: { type: 'lowpass', from: 600, to: 1200, q: 1 } },
    ],
    swingHeavy: [
      { type: 'noise', duration: 0.32, attack: 0.05, gain: 0.45, filter: { type: 'bandpass', from: 400, to: 1800, q: 1 } },
      { type: 'tone', wave: 'sawtooth', from: 100, to: 170, duration: 0.32, attack: 0.05, gain: 0.08, filter: { type: 'lowpass', from: 500, to: 1000, q: 1 } },
    ],
    hit: [
      { type: 'noise', duration: 0.09, attack: 0.002, gain: 0.3, filter: { type: 'highpass', from: 1800, to: 1800, q: 0.7 } },
      { type: 'tone', wave: 'square', from: 240, to: 90, duration: 0.14, attack: 0.002, gain: 0.1, filter: { type: 'lowpass', from: 1500, to: 600, q: 1 } },
      { type: 'tone', wave: 'sine', from: 90, to: 40, duration: 0.22, attack: 0.002, gain: 0.22, filter: null },
    ],
    heavyHit: [
      { type: 'noise', duration: 0.16, attack: 0.002, gain: 0.9, filter: { type: 'bandpass', from: 2500, to: 700, q: 0.8 } },
      { type: 'tone', wave: 'square', from: 200, to: 60, duration: 0.22, attack: 0.002, gain: 0.12, filter: { type: 'lowpass', from: 1400, to: 400, q: 1 } },
      { type: 'tone', wave: 'sine', from: 70, to: 30, duration: 0.35, attack: 0.002, gain: 0.35, filter: null },
    ],
    block: [
      { type: 'tone', wave: 'triangle', from: 1250, to: 1180, duration: 0.2, attack: 0.002, gain: 0.18, filter: null },
      { type: 'tone', wave: 'square', from: 1710, to: 1650, duration: 0.16, attack: 0.002, gain: 0.05, filter: { type: 'lowpass', from: 4000, to: 4000, q: 1 } },
      { type: 'noise', duration: 0.05, attack: 0.001, gain: 0.3, filter: { type: 'bandpass', from: 3500, to: 3500, q: 1 } },
    ],
    guardBreak: [
      { type: 'tone', wave: 'sawtooth', from: 420, to: 70, duration: 0.4, attack: 0.002, gain: 0.22, filter: { type: 'lowpass', from: 2000, to: 400, q: 1 } },
      { type: 'noise', duration: 0.25, attack: 0.002, gain: 0.6, filter: { type: 'bandpass', from: 1500, to: 400, q: 1 } },
      { type: 'tone', wave: 'triangle', from: 1250, to: 900, duration: 0.25, attack: 0.002, gain: 0.14, filter: null },
    ],
    clash: [
      { type: 'tone', wave: 'triangle', from: 1100, to: 900, duration: 0.35, attack: 0.002, gain: 0.32, filter: null },
      { type: 'tone', wave: 'square', from: 1580, to: 1300, duration: 0.3, attack: 0.002, gain: 0.06, filter: { type: 'lowpass', from: 5000, to: 2000, q: 1 } },
      { type: 'noise', duration: 0.3, attack: 0.002, gain: 0.9, filter: { type: 'bandpass', from: 3000, to: 900, q: 0.9 } },
      { type: 'tone', wave: 'sawtooth', from: 520, to: 160, duration: 0.3, attack: 0.002, gain: 0.1, filter: { type: 'lowpass', from: 1800, to: 500, q: 1 } },
    ],
    death: [
      { type: 'tone', wave: 'sine', from: 70, to: 28, duration: 0.6, attack: 0.002, gain: 0.45, filter: null },
      { type: 'tone', wave: 'sawtooth', from: 180, to: 30, duration: 0.7, attack: 0.01, gain: 0.12, filter: { type: 'lowpass', from: 900, to: 200, q: 1 } },
    ],
    dodge: [
      { type: 'noise', duration: 0.16, attack: 0.01, gain: 0.25, filter: { type: 'bandpass', from: 2400, to: 900, q: 1.5 } },
    ],
    denied: [
      { type: 'tone', wave: 'square', from: 150, to: 110, duration: 0.08, attack: 0.002, gain: 0.07, filter: { type: 'lowpass', from: 900, to: 600, q: 1 } },
    ],
    uiMove: [
      { type: 'tone', wave: 'sine', from: 880, to: 880, duration: 0.05, attack: 0.002, gain: 0.08, filter: null },
    ],
    uiConfirm: [
      { type: 'tone', wave: 'sine', from: 660, to: 990, duration: 0.12, attack: 0.002, gain: 0.1, filter: null },
    ],
  },
};

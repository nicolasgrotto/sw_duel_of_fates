const NOISE_SECONDS = 1;
const STOP_PADDING = 0.05;
const noiseBuffers = new WeakMap();

function getNoiseBuffer(context) {
  let buffer = noiseBuffers.get(context);
  if (!buffer) {
    buffer = context.createBuffer(1, context.sampleRate * NOISE_SECONDS, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = Math.random() * 2 - 1;
    }
    noiseBuffers.set(context, buffer);
  }
  return buffer;
}

function createSource(context, layer, startTime) {
  if (layer.type === 'noise') {
    const source = context.createBufferSource();
    source.buffer = getNoiseBuffer(context);
    source.loop = true;
    return source;
  }

  const oscillator = context.createOscillator();
  oscillator.type = layer.wave;
  oscillator.frequency.setValueAtTime(layer.from, startTime);
  oscillator.frequency.exponentialRampToValueAtTime(layer.to, startTime + layer.duration);
  return oscillator;
}

function createFilter(context, filter, startTime, duration) {
  const node = context.createBiquadFilter();
  node.type = filter.type;
  node.Q.value = filter.q;
  node.frequency.setValueAtTime(filter.from, startTime);
  node.frequency.exponentialRampToValueAtTime(filter.to, startTime + duration);
  return node;
}

function playLayer(context, output, layer, startTime, intensity, envelopeFloor) {
  const source = createSource(context, layer, startTime);
  const envelope = context.createGain();
  const peak = Math.max(layer.gain * intensity, envelopeFloor);

  envelope.gain.setValueAtTime(envelopeFloor, startTime);
  envelope.gain.linearRampToValueAtTime(peak, startTime + layer.attack);
  envelope.gain.exponentialRampToValueAtTime(envelopeFloor, startTime + layer.duration);

  let last = source;
  if (layer.filter) {
    last = createFilter(context, layer.filter, startTime, layer.duration);
    source.connect(last);
  }
  last.connect(envelope);
  envelope.connect(output);

  source.start(startTime);
  source.stop(startTime + layer.duration + STOP_PADDING);
}

function createOscillator(context, wave, frequency) {
  const oscillator = context.createOscillator();
  oscillator.type = wave;
  oscillator.frequency.value = frequency;
  return oscillator;
}

export function createHum(context, output, hum, frequency) {
  const oscillators = [createOscillator(context, hum.wave, frequency), createOscillator(context, hum.wave, frequency * hum.detune)];
  const filter = context.createBiquadFilter();
  const gain = context.createGain();
  const panner = context.createStereoPanner();

  filter.type = 'lowpass';
  filter.frequency.value = hum.cutoff;
  gain.gain.value = 0;
  for (const oscillator of oscillators) {
    oscillator.connect(filter);
    oscillator.start();
  }
  filter.connect(gain);
  gain.connect(panner);
  panner.connect(output);

  const setTarget = (param, value) => param.setTargetAtTime(value, context.currentTime, hum.smoothing);

  return {
    setMode(level, cutoff, pitch) {
      setTarget(gain.gain, level);
      setTarget(filter.frequency, cutoff);
      setTarget(oscillators[0].frequency, frequency * pitch);
      setTarget(oscillators[1].frequency, frequency * hum.detune * pitch);
    },
    setPan(value) {
      panner.pan.value = value;
    },
    stop() {
      setTarget(gain.gain, 0);
      for (const oscillator of oscillators) {
        oscillator.stop(context.currentTime + hum.releaseTime);
      }
    },
  };
}

export function createMusic(context, output, music) {
  const gain = context.createGain();
  const filter = context.createBiquadFilter();
  const lfo = createOscillator(context, 'sine', music.lfoRate);
  const lfoGain = context.createGain();

  filter.type = 'lowpass';
  filter.frequency.value = music.cutoff;
  lfoGain.gain.value = music.lfoDepth;
  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);
  lfo.start();

  for (const note of music.notes) {
    const oscillator = createOscillator(context, note.wave, note.frequency);
    const noteGain = context.createGain();
    noteGain.gain.value = note.gain;
    oscillator.connect(noteGain);
    noteGain.connect(filter);
    oscillator.start();
  }

  const tension = music.tension;
  const tensionOscillator = createOscillator(context, tension.wave, tension.frequency);
  const tensionGain = context.createGain();
  tensionGain.gain.value = 0;
  tensionOscillator.connect(tensionGain);
  tensionGain.connect(filter);
  tensionOscillator.start();

  filter.connect(gain);
  gain.connect(output);
  gain.gain.setValueAtTime(0, context.currentTime);
  gain.gain.linearRampToValueAtTime(music.level, context.currentTime + music.fadeIn);

  return {
    setTension(amount) {
      const now = context.currentTime;
      filter.frequency.setTargetAtTime(music.cutoff + tension.cutoff * amount, now, tension.smoothing);
      tensionGain.gain.setTargetAtTime(tension.gain * amount, now, tension.smoothing);
    },
    duck(duration) {
      const now = context.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setTargetAtTime(0, now, music.duckFade);
      gain.gain.setTargetAtTime(music.level, now + duration, music.returnFade);
    },
  };
}

export function playSound(context, output, layers, { pan = 0, intensity = 1, envelopeFloor }) {
  const startTime = context.currentTime;
  const panner = context.createStereoPanner();
  panner.pan.value = pan;
  panner.connect(output);

  for (const layer of layers) {
    playLayer(context, panner, layer, startTime, intensity, envelopeFloor);
  }
}

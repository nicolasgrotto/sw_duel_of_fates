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

export function playSound(context, output, layers, { pan = 0, intensity = 1, envelopeFloor }) {
  const startTime = context.currentTime;
  const panner = context.createStereoPanner();
  panner.pan.value = pan;
  panner.connect(output);

  for (const layer of layers) {
    playLayer(context, panner, layer, startTime, intensity, envelopeFloor);
  }
}

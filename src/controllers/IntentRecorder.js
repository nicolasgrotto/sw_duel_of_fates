const FLAGS = ['jump', 'lightAttack', 'heavyAttack', 'block', 'blockPressed', 'dodge', 'special', 'specialHeld', 'evade', 'power', 'powerHeld', 'fourthPower', 'fourthPowerHeld'];

const DIRECTION_SHIFT = FLAGS.length + 2;
const ORDER_SHIFT = DIRECTION_SHIFT + 2;
export const ENCODED_INTENT_RANGE = 1 << (ORDER_SHIFT + 2);

export function encodeIntent(intent, facing) {
  let value = Math.sign(intent.moveX) * facing + 1;
  for (let index = 0; index < FLAGS.length; index += 1) {
    if (intent[FLAGS[index]]) {
      value |= 1 << (index + 2);
    }
  }
  if (intent.actionMoveX != null) value |= (Math.sign(intent.actionMoveX) * facing + 2) << DIRECTION_SHIFT;
  value |= (intent.resolvedAction === 'power' ? 1 : intent.resolvedAction === 'special' ? 2 : 0) << ORDER_SHIFT;
  return value;
}

export function decodeIntent(value, intent, facing) {
  intent.moveX = ((value & 3) - 1) * facing;
  const direction = (value >> DIRECTION_SHIFT) & 3;
  intent.actionMoveX = direction === 0 ? null : (direction - 2) * facing;
  const order = (value >> ORDER_SHIFT) & 3;
  intent.resolvedAction = order === 1 ? 'power' : order === 2 ? 'special' : null;
  for (let index = 0; index < FLAGS.length; index += 1) {
    intent[FLAGS[index]] = (value & (1 << (index + 2))) !== 0;
  }
}

export class IntentRecorder {
  constructor(capacity) {
    this.frames = new Uint32Array(capacity);
    this.length = 0;
    this.cursor = 0;
    this.mode = 'idle';
  }

  toggleRecording() {
    if (this.mode === 'recording') {
      this.stop();
      return;
    }
    this.length = 0;
    this.cursor = 0;
    this.mode = 'recording';
  }

  startPlayback() {
    if (this.length === 0) {
      return false;
    }
    this.cursor = 0;
    this.mode = 'playing';
    return true;
  }

  stop() {
    this.mode = 'idle';
    this.cursor = 0;
  }

  record(intent, facing) {
    if (this.mode !== 'recording') {
      return;
    }
    this.frames[this.length] = encodeIntent(intent, facing);
    this.length += 1;
    if (this.length >= this.frames.length) {
      this.stop();
    }
  }

  play(intent, facing) {
    if (this.mode !== 'playing') {
      return false;
    }
    decodeIntent(this.frames[this.cursor], intent, facing);
    this.cursor = (this.cursor + 1) % this.length;
    return true;
  }

  rewind() {
    this.cursor = 0;
  }
}

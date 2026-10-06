const UINT32_RANGE = 4294967296;

export function createRandom(seed) {
  let state = seed >>> 0;

  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_RANGE;
  };
}

export function createRandomSeed() {
  return Math.floor(Math.random() * UINT32_RANGE);
}

export function randomRange(random, [min, max]) {
  return min + (max - min) * random();
}

export function randomInt(random, [min, max]) {
  return min + Math.floor(random() * (max - min + 1));
}

export function pick(random, items) {
  return items[Math.floor(random() * items.length)];
}

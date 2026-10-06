export const TAU = Math.PI * 2;

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

export function lerp(from, to, amount) {
  return from + (to - from) * amount;
}

export function approach(current, target, maxDelta) {
  if (current < target) {
    return Math.min(current + maxDelta, target);
  }
  return Math.max(current - maxDelta, target);
}

export function smoothTowards(current, target, rate, dt) {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

export function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

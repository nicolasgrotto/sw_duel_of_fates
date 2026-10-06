export function easeOutCubic(t) {
  return 1 - (1 - t) ** 3;
}

export function easeOutQuad(t) {
  return 1 - (1 - t) ** 2;
}

export function easeInQuad(t) {
  return t * t;
}

export function easeInOutSine(t) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

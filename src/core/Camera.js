export class Camera {
  constructor({ maxShakeAmplitude, maxShakeDuration, maxPunchZoom, maxPunchDuration }, random) {
    this.maxShakeAmplitude = maxShakeAmplitude;
    this.maxShakeDuration = maxShakeDuration;
    this.maxPunchZoom = maxPunchZoom;
    this.maxPunchDuration = maxPunchDuration;
    this.punchAmount = 0;
    this.punchDuration = 0;
    this.punchTime = 0;
    this.focusX = 0;
    this.focusY = 0;
    this.random = random;
    this.shakeAmplitude = 0;
    this.shakeDuration = 0;
    this.shakeTime = 0;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  get shakeStrength() {
    if (this.shakeTime >= this.shakeDuration) {
      return 0;
    }
    return this.shakeAmplitude * (1 - this.shakeTime / this.shakeDuration);
  }

  shake(amplitude, duration) {
    const limitedAmplitude = Math.min(amplitude, this.maxShakeAmplitude);
    if (limitedAmplitude < this.shakeStrength) {
      return;
    }
    this.shakeAmplitude = limitedAmplitude;
    this.shakeDuration = Math.min(duration, this.maxShakeDuration);
    this.shakeTime = 0;
  }

  get zoom() {
    if (this.punchDuration <= 0 || this.punchTime >= this.punchDuration) {
      return 1;
    }
    const remaining = 1 - this.punchTime / this.punchDuration;
    return 1 + this.punchAmount * remaining * remaining;
  }

  punch(zoom, duration, x, y) {
    const amount = Math.max(0, Math.min(zoom, this.maxPunchZoom));
    if (amount < this.zoom - 1) {
      return;
    }
    this.punchAmount = amount;
    this.punchDuration = Math.max(0, Math.min(duration, this.maxPunchDuration));
    this.punchTime = 0;
    this.focusX = x;
    this.focusY = y;
  }

  update(dt) {
    this.punchTime = Math.min(this.punchTime + dt, this.punchDuration);
    this.shakeTime = Math.min(this.shakeTime + dt, this.shakeDuration);
    const strength = this.shakeStrength;

    this.offsetX = (this.random() * 2 - 1) * strength;
    this.offsetY = (this.random() * 2 - 1) * strength;
  }
}

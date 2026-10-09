export class Camera {
  constructor({ maxShakeAmplitude, maxShakeDuration, maxPunchZoom, maxPunchDuration, framing }, random) {
    this.maxShakeAmplitude = maxShakeAmplitude;
    this.maxShakeDuration = maxShakeDuration;
    this.framing = framing;
    this.centerX = 0;
    this.anchorY = 0;
    this.framingZoom = 1;
    this.isFramed = false;
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

  frame(left, right, width, anchorY, dt) {
    const { maxZoom, margin, smoothing } = this.framing;
    const targetZoom = Math.max(1, Math.min(maxZoom, width / (right - left + margin)));
    const blend = 1 - Math.exp(-smoothing * dt);
    this.framingZoom += (targetZoom - this.framingZoom) * blend;
    const halfView = width / (2 * this.framingZoom);
    const targetX = Math.max(halfView, Math.min(width - halfView, (left + right) / 2));
    this.centerX = this.isFramed ? this.centerX + (targetX - this.centerX) * blend : targetX;
    this.centerX = Math.max(halfView, Math.min(width - halfView, this.centerX));
    this.anchorY = anchorY;
    this.isFramed = true;
  }

  applyTransform(renderer) {
    renderer.translate(this.offsetX, this.offsetY);
    if (this.isFramed) {
      const zoom = this.framingZoom * (renderer.viewScale ?? 1);
      renderer.translate(renderer.width / 2, this.anchorY);
      renderer.scale(zoom, zoom);
      renderer.translate(-this.centerX, -this.anchorY);
    }
    renderer.translate(this.focusX, this.focusY);
    renderer.scale(this.zoom, this.zoom);
    renderer.translate(-this.focusX, -this.focusY);
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

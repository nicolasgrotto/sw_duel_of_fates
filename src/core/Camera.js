export class Camera {
  constructor({ maxShakeAmplitude, maxShakeDuration }, random) {
    this.maxShakeAmplitude = maxShakeAmplitude;
    this.maxShakeDuration = maxShakeDuration;
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

  update(dt) {
    this.shakeTime = Math.min(this.shakeTime + dt, this.shakeDuration);
    const strength = this.shakeStrength;

    this.offsetX = (this.random() * 2 - 1) * strength;
    this.offsetY = (this.random() * 2 - 1) * strength;
  }
}

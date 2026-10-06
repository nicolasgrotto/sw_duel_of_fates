export class TimeControl {
  constructor() {
    this.hitStopTime = 0;
    this.slowMotionTime = 0;
    this.slowMotionScale = 1;
  }

  get isFrozen() {
    return this.hitStopTime > 0;
  }

  hitStop(duration) {
    this.hitStopTime = Math.max(this.hitStopTime, duration);
  }

  slowMotion(duration, scale) {
    this.slowMotionTime = Math.max(this.slowMotionTime, duration);
    this.slowMotionScale = scale;
  }

  scale(dt) {
    if (this.hitStopTime > 0) {
      this.hitStopTime = Math.max(0, this.hitStopTime - dt);
      return 0;
    }
    if (this.slowMotionTime > 0) {
      this.slowMotionTime = Math.max(0, this.slowMotionTime - dt);
      return dt * this.slowMotionScale;
    }
    return dt;
  }
}

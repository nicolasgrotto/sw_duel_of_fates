const defaultNow = () => performance.now();
const defaultSchedule = (callback) => requestAnimationFrame(callback);
const defaultCancel = (frameId) => cancelAnimationFrame(frameId);

export class GameLoop {
  constructor({
    fixedStep,
    maxFrameTime,
    update,
    render,
    now = defaultNow,
    schedule = defaultSchedule,
    cancel = defaultCancel,
  }) {
    this.fixedStep = fixedStep;
    this.maxFrameTime = maxFrameTime;
    this.update = update;
    this.render = render;
    this.now = now;
    this.schedule = schedule;
    this.cancel = cancel;
    this.accumulator = 0;
    this.lastTime = 0;
    this.running = false;
    this.frameId = null;
    this.tick = this.tick.bind(this);
  }

  start() {
    if (this.running) {
      return;
    }

    this.running = true;
    this.accumulator = 0;
    this.lastTime = this.now();
    this.frameId = this.schedule(this.tick);
  }

  stop() {
    if (!this.running) {
      return;
    }

    this.running = false;
    this.cancel(this.frameId);
    this.frameId = null;
  }

  tick() {
    if (!this.running) {
      return;
    }

    const currentTime = this.now();
    this.advance((currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;
    this.frameId = this.schedule(this.tick);
  }

  advance(frameTime) {
    this.accumulator += Math.min(Math.max(frameTime, 0), this.maxFrameTime);

    let steps = 0;
    while (this.accumulator >= this.fixedStep) {
      this.update(this.fixedStep);
      this.accumulator -= this.fixedStep;
      steps += 1;
    }

    this.render(this.accumulator / this.fixedStep);
    return steps;
  }
}

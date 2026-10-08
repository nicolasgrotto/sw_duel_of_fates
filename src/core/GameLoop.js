const defaultNow = () => performance.now();
const defaultSchedule = (callback) => requestAnimationFrame(callback);
const defaultCancel = (frameId) => cancelAnimationFrame(frameId);

export class GameLoop {
  constructor({
    fixedStep,
    maxFrameTime,
    update,
    render,
    timingSampleFrames = 60,
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
    this.timingSampleFrames = timingSampleFrames;
    this.timings = { updateMs: 0, renderMs: 0 };
    this.timingFrames = 0;
    this.updateTotal = 0;
    this.renderTotal = 0;
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

    const updateStart = this.now();
    let steps = 0;
    while (this.accumulator >= this.fixedStep) {
      this.update(this.fixedStep);
      this.accumulator -= this.fixedStep;
      steps += 1;
    }

    const renderStart = this.now();
    this.render(this.accumulator / this.fixedStep);
    this.updateTotal += renderStart - updateStart;
    this.renderTotal += this.now() - renderStart;
    this.timingFrames += 1;
    if (this.timingFrames >= this.timingSampleFrames) {
      this.timings.updateMs = this.updateTotal / this.timingFrames;
      this.timings.renderMs = this.renderTotal / this.timingFrames;
      this.timingFrames = 0;
      this.updateTotal = 0;
      this.renderTotal = 0;
    }
    return steps;
  }
}

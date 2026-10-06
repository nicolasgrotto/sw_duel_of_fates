import { colors, textStyles } from '../config/themeConfig.js';

const MILLISECONDS_PER_SECOND = 1000;

export class FpsCounter {
  constructor(sampleWindow) {
    this.sampleWindow = sampleWindow;
    this.fps = 0;
    this.frames = 0;
    this.windowStart = null;
  }

  tick(timeInMilliseconds) {
    if (this.windowStart === null) {
      this.windowStart = timeInMilliseconds;
      return;
    }

    this.frames += 1;
    const elapsed = (timeInMilliseconds - this.windowStart) / MILLISECONDS_PER_SECOND;

    if (elapsed >= this.sampleWindow) {
      this.fps = this.frames / elapsed;
      this.frames = 0;
      this.windowStart = timeInMilliseconds;
    }
  }
}

export class DebugOverlay {
  constructor({ enabled, fpsSampleWindow, x, y, padding, lineHeight, width }, now = () => performance.now()) {
    this.enabled = enabled;
    this.layout = { x, y, padding, lineHeight, width };
    this.now = now;
    this.fpsCounter = new FpsCounter(fpsSampleWindow);
  }

  toggle() {
    this.enabled = !this.enabled;
  }

  collectLines(stateMachine) {
    const lines = [
      `fps: ${Math.round(this.fpsCounter.fps)}`,
      `states: ${stateMachine.stack.map((state) => state.name).join(' > ')}`,
    ];

    for (const state of stateMachine.stack) {
      lines.push(...state.getDebugInfo());
    }

    return lines;
  }

  render(renderer, stateMachine) {
    this.fpsCounter.tick(this.now());

    if (!this.enabled) {
      return;
    }

    const { x, y, padding, lineHeight, width } = this.layout;
    const lines = this.collectLines(stateMachine);
    const height = lines.length * lineHeight + padding * 2;

    renderer.fillRect(x, y, width, height, colors.debugBackground);
    lines.forEach((line, index) => {
      renderer.text(line, x + padding, y + padding + index * lineHeight, textStyles.debug);
    });
  }
}

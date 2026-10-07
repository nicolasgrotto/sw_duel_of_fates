import { colors } from '../config/themeConfig.js';
import { approach } from '../utils/math.js';

export class Letterbox {
  constructor({ height, speed }) {
    this.height = height;
    this.speed = speed;
    this.amount = 0;
    this.target = 0;
    this.pulseAmount = 0;
    this.pulseTime = 0;
  }

  setTarget(target) {
    this.target = target;
  }

  pulse(amount, duration) {
    this.pulseAmount = amount;
    this.pulseTime = duration;
  }

  update(dt) {
    this.pulseTime = Math.max(0, this.pulseTime - dt);
    const goal = Math.max(this.target, this.pulseTime > 0 ? this.pulseAmount : 0);
    this.amount = approach(this.amount, goal, this.speed * dt);
  }

  render(renderer) {
    if (this.amount <= 0) {
      return;
    }
    const barHeight = this.height * this.amount;
    renderer.fillRect(0, 0, renderer.width, barHeight, colors.letterbox);
    renderer.fillRect(0, renderer.height - barHeight, renderer.width, barHeight, colors.letterbox);
  }
}

import { textStyles } from '../config/themeConfig.js';
import { layout } from '../config/uiConfig.js';

export class CombatMessage {
  constructor() {
    this.text = '';
    this.duration = 0;
    this.time = 0;
  }

  get isVisible() {
    return this.time < this.duration;
  }

  get alpha() {
    if (!this.isVisible) {
      return 0;
    }
    const { fadeTime } = layout.messages;
    const fadeIn = Math.min(1, this.time / fadeTime);
    const fadeOut = Math.min(1, (this.duration - this.time) / fadeTime);
    return Math.min(fadeIn, fadeOut);
  }

  show(text, duration) {
    this.text = text;
    this.duration = duration;
    this.time = 0;
  }

  update(dt) {
    if (this.isVisible) {
      this.time = Math.min(this.time + dt, this.duration);
    }
  }

  render(renderer) {
    if (!this.isVisible) {
      return;
    }
    renderer.save();
    renderer.setAlpha(this.alpha);
    renderer.text(this.text, renderer.width / 2, layout.messages.y, textStyles.message);
    renderer.restore();
  }
}

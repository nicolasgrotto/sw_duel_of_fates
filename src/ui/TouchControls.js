import { colors, textStyles } from '../config/themeConfig.js';
import { texts } from '../config/uiConfig.js';

export class TouchControls {
  constructor(source) { this.source = source; }

  button(renderer, button, label) {
    const { style } = this.source.config;
    renderer.save();
    renderer.setAlpha(style.backgroundAlpha);
    renderer.fillCircle(button.x, button.y, button.radius, colors.background);
    renderer.setAlpha(this.source.actions.has(button.action) ? style.activeAlpha : style.idleAlpha);
    renderer.strokeCircle(button.x, button.y, button.radius, colors.accent, style.lineWidth);
    renderer.text(label, button.x, button.y, this.source.actions.has(button.action) ? textStyles.touchActive : textStyles.touchLabel);
    renderer.restore();
  }

  render(renderer, visible) {
    if (!visible) return;
    const source = this.source;
    if (source.mode !== 'duel') {
      if (source.hasBack) this.button(renderer, source.config.back, texts.touch.back);
      return;
    }
    for (const button of source.config.buttons) {
      if (source.hasButton(button)) this.button(renderer, button, texts.touch.buttons[button.action]);
    }
    const { joystick: config, style } = source.config;
    const joystick = source.joystick;
    const x = joystick?.originX ?? config.idleX;
    const y = joystick?.originY ?? config.idleY;
    renderer.save();
    renderer.setAlpha(style.idleAlpha);
    renderer.strokeCircle(x, y, config.radius, colors.accent, style.lineWidth);
    if (joystick) {
      const dx = joystick.x - x;
      const dy = joystick.y - y;
      const scale = Math.min(1, config.radius / (Math.hypot(dx, dy) || 1));
      renderer.strokeCircle(x + dx * scale, y + dy * scale, config.knobRadius, colors.text, style.lineWidth);
    } else {
      renderer.text(texts.touch.move, x, y, textStyles.touchLabel);
    }
    renderer.restore();
  }
}

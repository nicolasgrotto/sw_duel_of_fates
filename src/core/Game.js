import { gameConfig } from '../config/gameConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { GameLoop } from './GameLoop.js';
import { Renderer } from './Renderer.js';

export class Game {
  constructor(canvas) {
    this.renderer = new Renderer(canvas, gameConfig.canvas);
    this.loop = new GameLoop({
      ...gameConfig.loop,
      update: (dt) => this.update(dt),
      render: (alpha) => this.render(alpha),
    });
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.elapsedTime = 0;
  }

  start() {
    this.resizeObserver.observe(this.renderer.canvas);
    this.handleResize();
    this.loop.start();
  }

  handleResize() {
    this.renderer.fitToDisplay(window.devicePixelRatio || 1);
  }

  update(dt) {
    this.elapsedTime += dt;
  }

  render() {
    const { width, height } = this.renderer;

    this.renderer.clear(colors.background);
    this.renderer.text(gameConfig.title, width / 2, height / 2, textStyles.title);
    this.renderer.text(`${this.elapsedTime.toFixed(1)}s`, width / 2, height / 2 + 80, textStyles.hint);
  }
}

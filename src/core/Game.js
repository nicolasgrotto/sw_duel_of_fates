import { gameConfig } from '../config/gameConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { Renderer } from './Renderer.js';

export class Game {
  constructor(canvas) {
    this.renderer = new Renderer(canvas, gameConfig.canvas);
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
  }

  start() {
    this.resizeObserver.observe(this.renderer.canvas);
    this.handleResize();
  }

  handleResize() {
    this.renderer.fitToDisplay(window.devicePixelRatio || 1);
    this.render();
  }

  render() {
    const { width, height } = this.renderer;

    this.renderer.clear(colors.background);
    this.renderer.text(gameConfig.title, width / 2, height / 2, textStyles.title);
  }
}

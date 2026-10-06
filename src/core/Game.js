import { keyBindings } from '../config/controlsConfig.js';
import { gameConfig } from '../config/gameConfig.js';
import { colors } from '../config/themeConfig.js';
import { createState } from '../states/stateFactory.js';
import { StateId } from '../states/stateIds.js';
import { GameLoop } from './GameLoop.js';
import { Input } from './Input.js';
import { Renderer } from './Renderer.js';
import { StateMachine } from './StateMachine.js';

export class Game {
  constructor(canvas) {
    this.renderer = new Renderer(canvas, gameConfig.canvas);
    this.input = new Input({ bindings: keyBindings, target: window });
    this.states = new StateMachine();
    this.loop = new GameLoop({
      ...gameConfig.loop,
      update: (dt) => this.update(dt),
      render: (alpha) => this.render(alpha),
    });
    this.resizeObserver = new ResizeObserver(() => this.handleResize());
  }

  start() {
    this.resizeObserver.observe(this.renderer.canvas);
    this.handleResize();
    this.renderer.canvas.focus();
    this.changeState(StateId.MENU);
    this.loop.start();
  }

  changeState(id) {
    this.states.change(createState(id, this));
  }

  pushState(id) {
    this.states.push(createState(id, this));
  }

  popState() {
    this.states.pop();
  }

  handleResize() {
    this.renderer.fitToDisplay(window.devicePixelRatio || 1);
  }

  update(dt) {
    this.states.update(dt);
    this.input.endFrame();
  }

  render() {
    this.renderer.clear(colors.background);
    this.states.render(this.renderer);
  }
}

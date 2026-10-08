import { arenas } from '../arenas/arenaData.js';
import { Action, keyBindings } from '../config/controlsConfig.js';
import { effectsConfig } from '../config/effectsConfig.js';
import { animation as animationStyle } from '../config/fighterVisualConfig.js';
import { gameConfig } from '../config/gameConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { layout, texts } from '../config/uiConfig.js';
import { Camera } from '../core/Camera.js';
import { Fighter } from '../entities/Fighter.js';
import { DuelRenderer } from '../rendering/DuelRenderer.js';
import { createArenaBounds } from '../simulation/arenaBounds.js';
import { DuelSimulation } from '../simulation/DuelSimulation.js';
import { restoreFighter } from '../simulation/ReplayBuffer.js';
import { EffectsSystem } from '../systems/EffectsSystem.js';
import { TimeControl } from '../systems/TimeControl.js';
import { formatText } from '../ui/formatText.js';
import { formatActionKeys } from '../ui/keyLabels.js';
import { Letterbox } from '../ui/Letterbox.js';
import { createRandom } from '../utils/random.js';
import { GameState } from './GameState.js';

function cloneFighter(original, snapshot) {
  const clone = new Fighter({
    id: original.id,
    name: original.name,
    stats: original.stats,
    appearance: original.appearance,
    sound: original.sound,
    x: snapshot.x,
    y: original.floorY,
    facing: snapshot.facing,
  });
  restoreFighter(clone, snapshot);
  return clone;
}

export class ReplayState extends GameState {
  enter() {
    const { playback, fighters, arenaId, rules = {} } = this.params;
    this.playback = playback;
    this.step = playback.firstStep;
    this.pending = 0;
    this.arena = createArenaBounds(gameConfig);
    this.fighters = fighters.map((fighter, index) => cloneFighter(fighter, playback.snapshot.fighters[index]));
    this.simulation = new DuelSimulation({
      arena: this.arena,
      fighters: this.fighters,
      physicsConfig: gameConfig.physics,
      combatConfig: gameConfig.combat,
      animationConfig: animationStyle,
      rules,
    });
    const random = createRandom(playback.firstStep + 1);
    this.camera = new Camera(effectsConfig, random);
    this.timeControl = new TimeControl();
    this.effects = new EffectsSystem(effectsConfig, this.camera, random, this.timeControl);
    this.effects.setReduced(this.game.settings.reducedEffects);
    this.view = new DuelRenderer(arenas[arenaId]);
    this.letterbox = new Letterbox(layout.letterbox);
    this.letterbox.setTarget(1);
    this.time = 0;
    this.skipLine = formatText(texts.replay.skip, { confirm: formatActionKeys(this.game.input.bindings ?? keyBindings, Action.CONFIRM) });
  }

  get isFinished() {
    return this.step >= this.playback.lastStep;
  }

  update(dt) {
    const { input } = this.game;
    if (input.wasPressed(Action.CONFIRM) || input.wasPressed(Action.BACK) || input.wasPressed(Action.PAUSE)) {
      this.game.popState();
      return;
    }
    this.time += dt;
    this.pending += this.timeControl.scale(dt * gameConfig.replay.speed);
    while (!this.isFinished && this.pending > 0) {
      const stepDt = this.playback.buffer.readStep(this.step, this.fighters);
      if (this.pending < stepDt) {
        break;
      }
      this.pending -= stepDt;
      this.simulation.step(stepDt);
      this.effects.handleEvents(this.simulation.events);
      this.step += 1;
    }
    this.effects.update(dt);
    this.camera.frame(
      Math.min(this.fighters[0].left, this.fighters[1].left),
      Math.max(this.fighters[0].right, this.fighters[1].right),
      gameConfig.canvas.width, this.arena.floorY, dt,
    );
    this.camera.update(dt);
    this.letterbox.update(dt);
    if (this.isFinished && this.time >= gameConfig.replay.minDuration) {
      this.game.popState();
    }
  }

  render(renderer) {
    renderer.clear(colors.background);
    this.view.render(renderer, this.arena, this.fighters, this.effects, this.camera, []);
    this.letterbox.render(renderer);
    renderer.text(texts.replay.label, layout.hud.margin, layout.replay.labelY, textStyles.replayLabel);
    renderer.text(this.skipLine, renderer.width - layout.hud.margin, layout.replay.labelY, textStyles.replaySkip);
  }
}

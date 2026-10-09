import { arenas } from '../arenas/arenaData.js';
import { Action, keyBindings } from '../config/controlsConfig.js';
import { gameConfig } from '../config/gameConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { layout, texts } from '../config/uiConfig.js';
import { ArenaRenderer } from '../rendering/arenaRenderer.js';
import { createArenaBounds } from '../simulation/arenaBounds.js';
import { formatText } from '../ui/formatText.js';
import { formatActionKeys } from '../ui/keyLabels.js';
import { clamp } from '../utils/math.js';
import { GameState } from './GameState.js';

export class DialogueState extends GameState {
  enter() {
    this.lines = this.params.lines ?? [];
    this.index = 0;
    this.lineTime = 0;
    this.arenaView = this.params.arena ? new ArenaRenderer(arenas[this.params.arena]) : null;
    this.arenaBounds = createArenaBounds(gameConfig);
    const bindings = this.game.input.bindings ?? keyBindings;
    this.hint = this.game.input.lastInputKind === 'touch'
      ? texts.dialogue.touchHint
      : formatText(texts.dialogue.hint, { confirm: formatActionKeys(bindings, Action.CONFIRM), back: formatActionKeys(bindings, Action.BACK) });
  }

  get line() {
    return this.lines[this.index];
  }

  update(dt) {
    const { input } = this.game;
    this.lineTime += dt;
    if (this.lines.length === 0) {
      this.finish();
      return;
    }
    if (input.wasPressed(Action.BACK)) {
      this.finish();
      return;
    }
    if (input.wasPressed(Action.CONFIRM) || (input.touchTaps?.length ?? 0) > 0) {
      this.advance();
    }
  }

  advance() {
    if (this.index >= this.lines.length - 1) {
      this.finish();
      return;
    }
    this.index += 1;
    this.lineTime = 0;
  }

  finish() {
    const { next } = this.params;
    if (this.finished || !next) {
      return;
    }
    this.finished = true;
    this.game.changeState(next.state, next.params);
  }

  render(renderer) {
    const { boxY, boxHeight, speakerY, textY, hintY, titleY, fadeTime, dimAlpha } = layout.dialogue;
    if (this.arenaView) {
      renderer.clear(colors.background);
      const { floorY } = this.arenaBounds;
      const fill = renderer.viewScale ?? 1;
      renderer.save();
      renderer.translate(renderer.width / 2, floorY);
      renderer.scale(fill, fill);
      renderer.translate(-renderer.width / 2, -floorY);
      this.arenaView.renderBackground(renderer, this.arenaBounds, [], []);
      this.arenaView.renderFloor(renderer, this.arenaBounds);
      renderer.restore();
    }
    renderer.save();
    renderer.setAlpha(dimAlpha);
    renderer.overlay(colors.background);
    renderer.restore();
    if (this.params.title) {
      renderer.text(this.params.title, renderer.width / 2, titleY, textStyles.heading);
    }
    renderer.fillRect(0, boxY, renderer.width, boxHeight, colors.overlay);
    if (!this.line) {
      return;
    }
    renderer.save();
    renderer.setAlpha(clamp(this.lineTime / fadeTime, 0, 1));
    renderer.text(this.line.speaker, renderer.width / 2, speakerY, textStyles.dialogueSpeaker);
    renderer.text(this.line.text, renderer.width / 2, textY, textStyles.dialogueLine);
    renderer.restore();
    renderer.text(this.hint, renderer.width / 2, hintY, textStyles.hint);
  }
}

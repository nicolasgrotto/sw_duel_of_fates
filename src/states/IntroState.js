import { SoundName } from '../audio/soundNames.js';
import { Action } from '../config/controlsConfig.js';
import { gameConfig } from '../config/gameConfig.js';
import { introConfig } from '../config/introConfig.js';
import { SecretToken, secretsConfig } from '../config/secretsConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { layout, texts } from '../config/uiConfig.js';
import { SecretUnlockSystem } from '../modes/SecretUnlockSystem.js';
import { clamp } from '../utils/math.js';
import { GameState } from './GameState.js';
import { StateId } from './stateIds.js';

function fadeIn(time, { start, duration }) {
  return clamp((time - start) / duration, 0, 1);
}

export function isInTitleArea(point, width) {
  const { titleArea } = introConfig;
  return Math.abs(point.x - width / 2) <= titleArea.width / 2 && Math.abs(point.y - layout.intro.titleY) <= titleArea.height / 2;
}

export class IntroState extends GameState {
  enter() {
    this.time = 0;
    this.ignited = false;
    this.secrets = new SecretUnlockSystem(secretsConfig);
    this.message = '';
    this.messageTime = 0;
  }

  get isReady() {
    return this.time >= introConfig.prompt.start;
  }

  update(dt) {
    this.time += dt;
    this.messageTime = Math.max(0, this.messageTime - dt);
    this.secrets.update(dt);
    if (!this.ignited && this.time >= introConfig.ignite.start) {
      this.ignited = true;
      this.game.audio.play(SoundName.IGNITE);
    }
    const { input } = this.game;
    let start = input.wasPressed(Action.CONFIRM);
    for (const tap of input.touchTaps ?? []) {
      if (isInTitleArea(tap, gameConfig.canvas.width)) {
        this.feed(SecretToken.tap('title'));
      } else {
        start = true;
      }
    }
    if (input.lastPressedCode) {
      this.feed(SecretToken.key(input.lastPressedCode));
    }
    for (const action of secretsConfig.watchedActions) {
      if (input.wasPressed(action)) {
        this.feed(SecretToken.action(action));
      }
    }
    if (!start) {
      return;
    }
    if (this.isReady) {
      this.game.changeState(StateId.MENU);
    } else {
      this.time = introConfig.prompt.start;
    }
  }

  feed(token) {
    const sequence = this.secrets.feed(token);
    if (sequence) {
      this.reward(secretsConfig.rewards[sequence.reward]);
    }
  }

  reward({ unlocks }) {
    const { settings } = this.game;
    const current = settings.unlockedCharacters ?? [];
    const fresh = unlocks.filter((id) => !current.includes(id));
    if (fresh.length > 0) {
      settings.unlockedCharacters = [...current, ...fresh];
      this.game.saveSettings();
    }
    this.message = fresh.length > 0 ? texts.intro.secretUnlocked : texts.intro.secretKnown;
    this.messageTime = introConfig.secret.messageDuration;
    this.time = Math.max(this.time, introConfig.prompt.start);
    this.game.audio.play(SoundName.SECRET);
  }

  render(renderer) {
    const centerX = renderer.width / 2;
    const { titleY, taglineY, bladeY, promptY, messageY } = layout.intro;
    renderer.clear(colors.background);
    this.renderBlade(renderer, centerX, bladeY);

    renderer.save();
    renderer.setAlpha(fadeIn(this.time, introConfig.title));
    renderer.text(gameConfig.title.toUpperCase(), centerX, titleY, textStyles.title);
    renderer.setAlpha(fadeIn(this.time, introConfig.tagline));
    renderer.text(texts.menu.tagline, centerX, taglineY, textStyles.tagline);
    renderer.restore();

    if (this.messageTime > 0) {
      renderer.text(this.message, centerX, messageY, textStyles.introSecret);
    } else if (this.isReady && this.time % introConfig.prompt.blinkPeriod < introConfig.prompt.blinkPeriod * 0.7) {
      renderer.text(this.game.input.lastInputKind === 'touch' ? texts.intro.touchPrompt : texts.intro.prompt, centerX, promptY, textStyles.hint);
    }
  }

  renderBlade(renderer, centerX, y) {
    const { blade, secret } = introConfig;
    const extension = fadeIn(this.time, introConfig.ignite);
    if (extension <= 0) {
      return;
    }
    const halfLength = blade.halfLength * extension;
    renderer.save();
    renderer.setBlendMode('lighter');
    if (this.messageTime > 0) {
      renderer.drawGlow(centerX, y, secret.glowRadius, colors.powerTierApex, secret.glowAlpha * (this.messageTime / secret.messageDuration));
    }
    renderer.drawGlow(centerX, y, blade.centerGlowRadius, colors.introBlade, blade.centerGlowAlpha * extension);
    renderer.setAlpha(blade.glowAlpha);
    renderer.line(centerX - halfLength, y, centerX + halfLength, y, colors.introBlade, blade.glowWidth);
    renderer.setAlpha(1);
    renderer.line(centerX - halfLength, y, centerX + halfLength, y, colors.saberCore, blade.coreWidth);
    renderer.restore();
  }
}

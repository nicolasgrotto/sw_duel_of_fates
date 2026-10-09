import { SoundName } from '../audio/soundNames.js';
import { Action } from '../config/controlsConfig.js';
import { gameConfig } from '../config/gameConfig.js';
import { introConfig } from '../config/introConfig.js';
import { SecretToken, secretsConfig } from '../config/secretsConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { layout, texts } from '../config/uiConfig.js';
import { characters } from '../characters/characterData.js';
import { SecretUnlockSystem } from '../modes/SecretUnlockSystem.js';
import { unlockAllSkins } from '../modes/unlocks.js';
import { clamp } from '../utils/math.js';
import { GameState } from './GameState.js';
import { StateId } from './stateIds.js';

function fadeIn(time, { start, duration }) {
  return clamp((time - start) / duration, 0, 1);
}

const TAP_AREA_Y = { title: 'titleY', tagline: 'taglineY' };

export function findTapArea(point, width) {
  for (const [name, area] of Object.entries(introConfig.tapAreas)) {
    if (Math.abs(point.x - width / 2) <= area.width / 2 && Math.abs(point.y - layout.intro[TAP_AREA_Y[name]]) <= area.height / 2) {
      return name;
    }
  }
  return null;
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
      const area = findTapArea(tap, gameConfig.canvas.width);
      if (area) {
        this.feed(SecretToken.tap(area));
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

  reward({ unlocks = [], allSkins = false, message }) {
    const { settings } = this.game;
    const current = settings.unlockedCharacters ?? [];
    const fresh = unlocks.filter((id) => !current.includes(id));
    const skins = allSkins ? unlockAllSkins(settings.unlocks, Object.values(characters)) : settings.unlocks;
    const changed = fresh.length > 0 || JSON.stringify(skins) !== JSON.stringify(settings.unlocks ?? {});
    if (changed) {
      settings.unlockedCharacters = [...current, ...fresh];
      settings.unlocks = skins;
      this.game.saveSettings();
    }
    this.message = texts.intro.secrets[message][changed ? 'unlocked' : 'known'];
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

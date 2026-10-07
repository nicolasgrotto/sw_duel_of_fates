import { aiConfig } from '../config/aiConfig.js';
import { Action, keyboardPresetOrder } from '../config/controlsConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { difficultyNames, layout, texts } from '../config/uiConfig.js';
import { formatText } from '../ui/formatText.js';
import { MenuList } from '../ui/MenuList.js';
import { GameState } from './GameState.js';

export const OptionId = Object.freeze({
  DIFFICULTY: 'difficulty',
  EFFECTS: 'effects',
  SOUND: 'sound',
  MUSIC: 'music',
  KEYBOARD: 'keyboard',
  BACK: 'back',
});

function nextDifficulty(current) {
  const { difficultyOrder } = aiConfig;
  return difficultyOrder[(difficultyOrder.indexOf(current) + 1) % difficultyOrder.length];
}

export class OptionsState extends GameState {
  enter() {
    this.items = {
      [OptionId.DIFFICULTY]: { id: OptionId.DIFFICULTY, label: '' },
      [OptionId.EFFECTS]: { id: OptionId.EFFECTS, label: '' },
      [OptionId.SOUND]: { id: OptionId.SOUND, label: '' },
      [OptionId.MUSIC]: { id: OptionId.MUSIC, label: '' },
      [OptionId.KEYBOARD]: { id: OptionId.KEYBOARD, label: '' },
      [OptionId.BACK]: { id: OptionId.BACK, label: texts.options.back },
    };
    this.menu = new MenuList(Object.values(this.items), layout.options, this.game.audio);
    this.refreshLabels();
  }

  refreshLabels() {
    const { settings } = this.game;
    const { options } = texts;

    this.items.difficulty.label = formatText(options.difficulty, { level: difficultyNames[settings.difficulty] });
    this.items.effects.label = formatText(options.effects, { value: settings.reducedEffects ? options.reduced : options.full });
    this.items.sound.label = formatText(options.sound, { value: settings.sound ? options.on : options.off });
    this.items.keyboard.label = formatText(options.keyboard, { preset: options.keyboardPresets[settings.keyboardPreset ?? keyboardPresetOrder[0]] });
    this.items.music.label = formatText(options.music, { value: settings.music ? options.onFeminine : options.offFeminine });
  }

  update() {
    if (this.game.input.wasPressed(Action.BACK)) {
      this.game.popState();
      return;
    }

    const choice = this.menu.update(this.game.input);
    if (choice === OptionId.BACK) {
      this.game.popState();
    } else if (choice) {
      this.toggle(choice);
    }
  }

  toggle(option) {
    const { settings } = this.game;

    switch (option) {
      case OptionId.DIFFICULTY:
        settings.difficulty = nextDifficulty(settings.difficulty);
        break;
      case OptionId.EFFECTS:
        settings.reducedEffects = !settings.reducedEffects;
        break;
      case OptionId.SOUND:
        settings.sound = !settings.sound;
        break;
      case OptionId.MUSIC:
        settings.music = !settings.music;
        break;
      case OptionId.KEYBOARD: {
        const index = keyboardPresetOrder.indexOf(settings.keyboardPreset ?? keyboardPresetOrder[0]);
        settings.keyboardPreset = keyboardPresetOrder[(index + 1) % keyboardPresetOrder.length];
        break;
      }
      default:
        return;
    }

    this.game.applySettings();
    this.game.saveSettings();
    this.refreshLabels();
  }

  render(renderer) {
    const centerX = renderer.width / 2;

    renderer.clear(colors.background);
    renderer.text(texts.options.title, centerX, layout.options.titleY, textStyles.heading);
    this.menu.render(renderer, centerX);
  }
}

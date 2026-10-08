import { Action } from '../config/controlsConfig.js';
import { textStyles } from '../config/themeConfig.js';
import { layout, texts } from '../config/uiConfig.js';
import { formatText } from './formatText.js';
import { formatActionKeys } from './keyLabels.js';

export const BannerKind = Object.freeze({
  TUTORIAL: 'tutorial',
  CHALLENGE: 'challenge',
  ARCADE: 'arcade',
});

function createKeyNames(bindings) {
  return {
    light: formatActionKeys(bindings, Action.LIGHT_ATTACK),
    heavy: formatActionKeys(bindings, Action.HEAVY_ATTACK),
    block: formatActionKeys(bindings, Action.BLOCK),
    dodge: formatActionKeys(bindings, Action.DODGE),
    special: formatActionKeys(bindings, Action.SPECIAL),
    left: formatActionKeys(bindings, Action.MOVE_LEFT),
    right: formatActionKeys(bindings, Action.MOVE_RIGHT),
  };
}

export class ModeBanner {
  constructor(kind, director, bindings) {
    this.kind = kind;
    this.director = director;
    this.keys = createKeyNames(bindings);
    this.signature = '';
    this.title = '';
    this.detail = '';
  }

  update() {
    if (this.kind === BannerKind.ARCADE) {
      this.describeArcade();
      return;
    }
    const signature = this.kind === BannerKind.TUTORIAL
      ? `${this.director.index}:${this.director.progress}`
      : `${Math.ceil(this.director.timeLeft)}:${this.director.score}`;
    if (signature === this.signature) {
      return;
    }
    this.signature = signature;
    if (this.kind === BannerKind.TUTORIAL) {
      this.describeTutorial();
    } else {
      this.describeChallenge();
    }
  }

  describeTutorial() {
    const { step, progress } = this.director;
    if (!step) {
      this.title = '';
      this.detail = '';
      return;
    }
    this.title = formatText(texts.tutorial.steps[step.id], this.keys);
    this.detail = formatText(texts.tutorial.progress, {
      step: this.director.index + 1,
      steps: this.director.steps.length,
      done: progress,
      count: step.count,
    });
  }

  describeArcade() {
    if (this.signature) {
      return;
    }
    const stage = this.director;
    this.signature = 'arcade';
    this.title = formatText(stage.isBoss ? texts.arcade.bossBanner : texts.arcade.banner, {
      number: stage.number,
      total: stage.total - 1,
      name: stage.opponentName.toUpperCase(),
    });
    this.detail = '';
  }

  describeChallenge() {
    this.title = formatText(texts.tutorial.challengeTitle, { block: this.keys.block });
    this.detail = formatText(texts.tutorial.challengeStatus, {
      time: Math.ceil(this.director.timeLeft),
      score: this.director.score,
    });
  }

  render(renderer) {
    const { titleY, detailY } = layout.banner;
    renderer.text(this.title, renderer.width / 2, titleY, textStyles.subtitle);
    renderer.text(this.detail, renderer.width / 2, detailY, textStyles.hint);
  }
}

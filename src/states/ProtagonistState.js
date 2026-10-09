import { SoundName } from '../audio/soundNames.js';
import { createFighterFromCharacter } from '../characters/characterFactory.js';
import { createProtagonistCharacter } from '../characters/protagonist.js';
import { Action } from '../config/controlsConfig.js';
import { storyConfig } from '../config/storyConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { difficultyNames, layout, texts } from '../config/uiConfig.js';
import { attributeOrder } from '../config/attributesConfig.js';
import { powersConfig } from '../config/powersConfig.js';
import { canRaiseAttribute, createStoryRun, getAttributeTotal, raiseAttribute } from '../modes/story/storyRun.js';
import { createPose } from '../rendering/fighterPose.js';
import { drawFighterPreview } from '../rendering/fighterPreview.js';
import { drawAttributeBars } from '../ui/attributeBars.js';
import { formatText } from '../ui/formatText.js';
import { MenuList } from '../ui/MenuList.js';
import { GameState } from './GameState.js';
import { StateId } from './stateIds.js';

export const ProtagonistMode = Object.freeze({
  CREATE: 'create',
  UPGRADE: 'upgrade',
});

export const CreationStep = Object.freeze({
  NAME: 'name',
  ALIGNMENT: 'alignment',
  STYLE: 'style',
  COLOR: 'saberColor',
  DIFFICULTY: 'difficulty',
});

export function getPowerNames(alignment) {
  return Object.values(powersConfig.loadouts[alignment]).map((id) => texts.powers[id]).join(' · ');
}

const STEPS = [CreationStep.NAME, CreationStep.ALIGNMENT, CreationStep.STYLE, CreationStep.COLOR, CreationStep.DIFFICULTY];

function getStepOptions(step) {
  const { protagonist, difficulties, ratingCaps } = storyConfig;
  switch (step) {
    case CreationStep.NAME:
      return protagonist.names.map((name) => ({ id: name, label: name }));
    case CreationStep.ALIGNMENT:
      return protagonist.alignments.map((id) => ({ id, label: texts.story.alignments[id] }));
    case CreationStep.STYLE:
      return Object.keys(protagonist.styles).map((id) => ({ id, label: texts.story.styles[id] }));
    case CreationStep.COLOR:
      return protagonist.saberColors.map((color, index) => ({ id: color, label: texts.story.colorNames[index] }));
    default:
      return difficulties.map((id) => ({ id, label: formatText(texts.story.difficultyOption, { level: difficultyNames[id], cap: ratingCaps[id] }) }));
  }
}

export class ProtagonistState extends GameState {
  enter() {
    this.mode = this.params.mode ?? ProtagonistMode.CREATE;
    this.pose = createPose();
    this.previewTime = 0;
    if (this.mode === ProtagonistMode.UPGRADE) {
      this.run = this.game.story;
      this.profile = this.run.protagonist;
      this.menu = new MenuList(attributeOrder.map((id) => ({ id, label: '' })), layout.story.list, this.game.audio);
      this.refreshUpgradeLabels();
    } else {
      const { protagonist, startAttributes, difficulties } = storyConfig;
      this.profile = {
        name: protagonist.names[0],
        alignment: protagonist.alignments[0],
        style: Object.keys(protagonist.styles)[0],
        saberColor: protagonist.saberColors[0],
        attributes: { ...startAttributes },
      };
      this.difficulty = difficulties.includes(this.game.settings.difficulty) ? this.game.settings.difficulty : difficulties[1];
      this.stepIndex = 0;
      this.openStep();
    }
    this.refreshPreview();
  }

  get step() {
    return STEPS[this.stepIndex];
  }

  openStep() {
    const options = getStepOptions(this.step);
    this.menu = new MenuList(options, layout.story.list, this.game.audio);
    const current = this.step === CreationStep.DIFFICULTY ? this.difficulty : this.profile[this.step];
    this.menu.selectedIndex = Math.max(0, options.findIndex((option) => option.id === current));
  }

  refreshUpgradeLabels() {
    const { attributes } = this.run.protagonist;
    for (const item of this.menu.items) {
      item.label = formatText(texts.story.attributeOption, { name: texts.attributes[item.id], value: attributes[item.id] });
    }
    this.budgetLine = formatText(texts.story.budget, {
      points: this.run.points,
      cap: storyConfig.ratingCaps[this.run.difficulty],
      total: getAttributeTotal(attributes),
      budget: storyConfig.budgets[this.run.difficulty],
    });
  }

  refreshPreview() {
    const character = createProtagonistCharacter(this.profile, storyConfig);
    this.preview = createFighterFromCharacter(character, { x: 0, y: 0, facing: 1 });
  }

  update(dt) {
    this.previewTime += dt;
    this.preview.animation.time = this.previewTime;
    if (this.mode === ProtagonistMode.UPGRADE) {
      this.updateUpgrade();
    } else {
      this.updateCreation();
    }
  }

  updateUpgrade() {
    if (this.game.input.wasPressed(Action.BACK)) {
      this.game.changeState(StateId.STORY);
      return;
    }
    const choice = this.menu.update(this.game.input);
    if (!choice) {
      return;
    }
    if (!canRaiseAttribute(this.run, choice, storyConfig)) {
      this.game.audio.play(SoundName.DENIED);
      return;
    }
    this.run = raiseAttribute(this.run, choice, storyConfig);
    this.profile = this.run.protagonist;
    this.game.story = this.run;
    this.game.saveSettings();
    this.refreshUpgradeLabels();
    this.refreshPreview();
  }

  updateCreation() {
    if (this.game.input.wasPressed(Action.BACK)) {
      this.goBack();
      return;
    }
    const before = this.menu.selected.id;
    const choice = this.menu.update(this.game.input);
    if (this.menu.selected.id !== before) {
      this.applySelection(this.menu.selected.id);
    }
    if (choice) {
      this.applySelection(choice);
      this.confirmStep();
    }
  }

  applySelection(value) {
    if (this.step === CreationStep.DIFFICULTY) {
      this.difficulty = value;
      return;
    }
    this.profile = { ...this.profile, [this.step]: value };
    this.refreshPreview();
  }

  goBack() {
    if (this.stepIndex === 0) {
      this.game.changeState(StateId.STORY);
      return;
    }
    this.stepIndex -= 1;
    this.openStep();
  }

  confirmStep() {
    if (this.stepIndex < STEPS.length - 1) {
      this.stepIndex += 1;
      this.openStep();
      return;
    }
    this.game.story = createStoryRun(this.profile, this.difficulty, storyConfig);
    this.game.saveSettings();
    this.game.changeState(StateId.PROTAGONIST, { mode: ProtagonistMode.UPGRADE });
  }

  render(renderer) {
    const { titleY, stepY, infoY, infoSpacing, previewX, figureX, previewY, previewScale, attributes } = layout.story;
    renderer.clear(colors.background);
    const isUpgrade = this.mode === ProtagonistMode.UPGRADE;
    renderer.text(isUpgrade ? texts.story.upgradeTitle : texts.story.createTitle, renderer.width / 2, titleY, textStyles.heading);
    const stepLine = isUpgrade
      ? this.budgetLine
      : formatText(texts.story.step, { step: this.stepIndex + 1, total: STEPS.length, name: texts.story.steps[this.step] });
    renderer.text(stepLine, renderer.width / 2, stepY, textStyles.subtitle);
    this.menu.render(renderer, layout.story.list.listX);
    renderer.text(this.profile.name, previewX, infoY, textStyles.subtitle);
    renderer.text(formatText(texts.story.summary, {
      alignment: texts.story.alignments[this.profile.alignment],
      style: texts.story.styles[this.profile.style],
    }), previewX, infoY + infoSpacing, textStyles.hint);
    renderer.text(formatText(texts.story.powers, { list: getPowerNames(this.profile.alignment) }), previewX, infoY + infoSpacing * 2, textStyles.hint);
    drawAttributeBars(renderer, this.profile.attributes, attributes);
    drawFighterPreview(renderer, this.preview, this.pose, figureX, previewY, previewScale);
    renderer.text(texts.story.footer, renderer.width / 2, layout.story.footerY, textStyles.hint);
  }
}

import { characters } from '../characters/characterData.js';
import { createFighterFromCharacter } from '../characters/characterFactory.js';
import { createProtagonistCharacter } from '../characters/protagonist.js';
import { Action } from '../config/controlsConfig.js';
import { storyConfig } from '../config/storyConfig.js';
import { storyTexts } from '../config/storyTexts.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { difficultyNames, layout, texts } from '../config/uiConfig.js';
import { resolveDialogue } from '../modes/story/dialogue.js';
import { getEncounter, getStoryStage, isStoryFinished } from '../modes/story/storyRun.js';
import { createPose } from '../rendering/fighterPose.js';
import { drawFighterPreview } from '../rendering/fighterPreview.js';
import { drawAttributeBars } from '../ui/attributeBars.js';
import { formatText } from '../ui/formatText.js';
import { MenuList } from '../ui/MenuList.js';
import { DuelMode } from './duelModes.js';
import { GameState } from './GameState.js';
import { ProtagonistMode, getPowerNames } from './ProtagonistState.js';
import { StateId } from './stateIds.js';
import { aiConfig } from '../config/aiConfig.js';

export const StoryOption = Object.freeze({
  CONTINUE: 'continue',
  UPGRADE: 'upgrade',
  NEW: 'new',
  BACK: 'back',
});

export function getCharacterNames() {
  return Object.fromEntries(Object.entries(characters).map(([id, character]) => [id, character.name]));
}

export class StoryState extends GameState {
  enter() {
    this.pose = createPose();
    this.time = 0;
    this.refresh();
  }

  resume() {
    this.refresh();
  }

  refresh() {
    this.run = this.game.story;
    const active = this.run && !isStoryFinished(this.run);
    const items = [];
    if (active) {
      const stage = getStoryStage(this.run, storyConfig, aiConfig.difficultyOrder);
      items.push({ id: StoryOption.CONTINUE, label: formatText(texts.story.continue, { number: stage.number, title: storyTexts.encounters[stage.encounterId].title }) });
    }
    if (this.run) {
      items.push({ id: StoryOption.UPGRADE, label: formatText(texts.story.upgrade, { points: this.run.points }) });
    }
    items.push({ id: StoryOption.NEW, label: this.run ? texts.story.restart : texts.story.start });
    items.push({ id: StoryOption.BACK, label: texts.story.back });
    this.menu = new MenuList(items, layout.story.list, this.game.audio);
    this.preview = this.run
      ? createFighterFromCharacter(createProtagonistCharacter(this.run.protagonist, storyConfig, this.run.slots), { x: 0, y: 0, facing: 1 })
      : null;
  }

  update(dt) {
    this.time += dt;
    if (this.preview) {
      this.preview.animation.time = this.time;
    }
    if (this.game.input.wasPressed(Action.BACK)) {
      this.game.changeState(StateId.MENU);
      return;
    }
    switch (this.menu.update(this.game.input)) {
      case StoryOption.CONTINUE:
        this.startEncounter();
        break;
      case StoryOption.UPGRADE:
        this.game.changeState(StateId.PROTAGONIST, { mode: ProtagonistMode.UPGRADE });
        break;
      case StoryOption.NEW:
        this.game.changeState(StateId.PROTAGONIST, { mode: ProtagonistMode.CREATE });
        break;
      case StoryOption.BACK:
        this.game.changeState(StateId.MENU);
        break;
      default:
        break;
    }
  }

  startEncounter() {
    const { run } = this;
    const encounter = getEncounter(run, storyConfig);
    const encounterTexts = storyTexts.encounters[encounter.id];
    this.game.changeState(StateId.DIALOGUE, {
      lines: resolveDialogue(encounterTexts.before, run.protagonist, getCharacterNames()),
      arena: encounter.arena,
      title: encounterTexts.title,
      next: { state: StateId.DUEL, params: { mode: DuelMode.STORY, story: run, rules: storyConfig.rules } },
    });
  }

  getStatusLine() {
    const { run } = this;
    if (isStoryFinished(run)) {
      return run.ending ? formatText(texts.story.finished, { ending: storyTexts.endings[run.ending]?.title ?? '' }) : '';
    }
    return formatText(texts.story.status, {
      difficulty: difficultyNames[run.difficulty],
      done: run.completed.length,
    });
  }

  render(renderer) {
    const { titleY, stepY, infoY, infoSpacing, previewX, figureX, previewY, previewScale, attributes } = layout.story;
    renderer.clear(colors.background);
    renderer.text(texts.story.title, renderer.width / 2, titleY, textStyles.heading);
    this.menu.render(renderer, layout.story.list.listX);
    if (!this.run) {
      renderer.text(texts.story.empty, renderer.width / 2, stepY, textStyles.subtitle);
      return;
    }
    const { protagonist } = this.run;
    renderer.text(this.getStatusLine(), renderer.width / 2, stepY, textStyles.subtitle);
    renderer.text(protagonist.name, previewX, infoY, textStyles.subtitle);
    renderer.text(formatText(texts.story.summary, {
      alignment: texts.story.alignments[protagonist.alignment],
      style: texts.story.styles[protagonist.style],
    }), previewX, infoY + infoSpacing, textStyles.hint);
    renderer.text(formatText(texts.story.powers, { list: getPowerNames(protagonist.alignment) }), previewX, infoY + infoSpacing * 2, textStyles.hint);
    drawAttributeBars(renderer, protagonist.attributes, attributes);
    drawFighterPreview(renderer, this.preview, this.pose, figureX, previewY, previewScale);
    renderer.text(texts.story.footer, renderer.width / 2, layout.story.footerY, textStyles.hint);
  }
}

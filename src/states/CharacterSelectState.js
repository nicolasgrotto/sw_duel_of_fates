import { drawAttributeBars } from '../ui/attributeBars.js';
import { containsTouch } from '../core/TouchInput.js';
import { touchLayoutConfig } from '../config/touchLayoutConfig.js';
import { arenas } from '../arenas/arenaData.js';
import { characters } from '../characters/characterData.js';
import { createFighter } from '../characters/characterFactory.js';
import { Action, keyBindings } from '../config/controlsConfig.js';
import { gameConfig } from '../config/gameConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { layout, texts } from '../config/uiConfig.js';
import { ArenaRenderer } from '../rendering/arenaRenderer.js';
import { computePose, createPose } from '../rendering/fighterPose.js';
import { createArenaBounds } from '../simulation/arenaBounds.js';
import { drawFighterBody } from '../rendering/fighterRenderer.js';
import { drawSaber } from '../rendering/saberRenderer.js';
import { formatText } from '../ui/formatText.js';
import { formatActionKeys } from '../ui/keyLabels.js';
import { createArcadeRun } from '../modes/arcade.js';
import { createSurvivalRun } from '../modes/survival.js';
import { getSaberOptions } from '../modes/unlocks.js';
import { createRandomSeed } from '../utils/random.js';
import { MenuList } from '../ui/MenuList.js';
import { DuelMode } from './duelModes.js';
import { GameState } from './GameState.js';
import { StateId } from './stateIds.js';

export const SelectStep = Object.freeze({
  PLAYER: 'player',
  OPPONENT: 'opponent',
  ARENA: 'arena',
});

export class CharacterSelectState extends GameState {
  enter() {
    this.characterIds = Object.keys(characters).filter((id) => characters[id].selectable);
    this.step = SelectStep.PLAYER;
    this.playerChoice = null;
    this.opponentChoice = null;
    this.characterMenu = new MenuList(this.characterIds.map((id) => ({ id, label: characters[id].name })), layout.characterSelect, this.game.audio);
    this.arenaMenu = new MenuList(gameConfig.duel.arenaOrder.map((id) => ({ id, label: texts.arenas[id] })), layout.characterSelect, this.game.audio);
    this.menu = this.characterMenu;
    this.arenaBounds = createArenaBounds(gameConfig);
    this.arenaViews = new Map(gameConfig.duel.arenaOrder.map((id) => [id, new ArenaRenderer(arenas[id])]));
    this.previews = new Map(this.characterIds.map((id) => [id, createFighter(id, { x: 0, y: 0, facing: -1 })]));
    this.colorChoices = new Map();
    this.playerSaberColor = null;
    this.pose = createPose();
    const bindings = this.game.input.bindings ?? keyBindings;
    this.footer = formatText(texts.characterSelect.footer, {
      up: formatActionKeys(bindings, Action.MENU_UP),
      down: formatActionKeys(bindings, Action.MENU_DOWN),
      confirm: formatActionKeys(bindings, Action.CONFIRM),
      back: formatActionKeys(bindings, Action.BACK),
    });
  }

  get isLocal() {
    return this.params.mode === DuelMode.LOCAL;
  }

  get activeInput() {
    return this.isLocal && this.step === SelectStep.OPPONENT ? this.game.secondInput : this.game.input;
  }

  getTitle() {
    if (this.isLocal && this.step !== SelectStep.ARENA) {
      return texts.characterSelect.localTitles[this.step];
    }
    return texts.characterSelect.titles[this.step];
  }

  update(dt) {
    const input = this.activeInput;
    if (input.wasPressed(Action.BACK)) {
      this.goBack();
      return;
    }
    const choice = this.menu.update(input);
    if (choice) {
      this.choose(choice);
      return;
    }
    if (this.step !== SelectStep.ARENA) {
      this.updateColorChoice(input);
    }
    if (this.step !== SelectStep.ARENA) {
      this.previews.get(this.menu.selected.id).animation.time += dt;
    }
  }

  updateColorChoice(input) {
    const taps = input.touchTaps ?? [];
    const step = (input.wasPressed(Action.MOVE_RIGHT) || taps.some((tap) => containsTouch(tap, touchLayoutConfig.colorRight)) ? 1 : 0) - (input.wasPressed(Action.MOVE_LEFT) || taps.some((tap) => containsTouch(tap, touchLayoutConfig.colorLeft)) ? 1 : 0);
    if (step === 0) {
      return;
    }
    const id = this.menu.selected.id;
    const unlocked = getSaberOptions(characters[id], this.game.settings).filter((option) => option.unlocked);
    const current = unlocked.findIndex((option) => option.color === this.getChosenColor(id));
    const next = unlocked[(Math.max(0, current) + step + unlocked.length) % unlocked.length];
    this.colorChoices.set(id, next.color);
    const preview = createFighter(id, { x: 0, y: 0, facing: -1 }, { saberColor: next.color });
    preview.animation.time = this.previews.get(id).animation.time;
    this.previews.set(id, preview);
  }

  getChosenColor(id) {
    return this.colorChoices.get(id) ?? characters[id].appearance.saberColor;
  }

  getChosenColorParam(id) {
    const color = this.getChosenColor(id);
    return color === characters[id].appearance.saberColor ? null : color;
  }

  goBack() {
    if (this.step === SelectStep.ARENA) {
      this.step = SelectStep.OPPONENT;
      this.menu = this.characterMenu;
      this.menu.selectedIndex = this.characterIds.indexOf(this.opponentChoice);
      return;
    }
    if (this.step === SelectStep.OPPONENT) {
      this.step = SelectStep.PLAYER;
      this.menu.selectedIndex = this.characterIds.indexOf(this.playerChoice);
      return;
    }
    this.game.changeState(StateId.MENU);
  }

  choose(choice) {
    if (this.step === SelectStep.PLAYER && this.params.mode === DuelMode.ARCADE) {
      const run = createArcadeRun(choice, this.characterIds, gameConfig.arcade);
      this.game.changeState(StateId.DUEL, { mode: DuelMode.ARCADE, arcade: { ...run, playerSaberColor: this.getChosenColorParam(choice) } });
      return;
    }
    if (this.step === SelectStep.PLAYER && this.params.mode === DuelMode.SURVIVAL) {
      const run = createSurvivalRun(choice, this.getChosenColorParam(choice), createRandomSeed());
      this.game.changeState(StateId.DUEL, { mode: DuelMode.SURVIVAL, survival: run });
      return;
    }
    if (this.step === SelectStep.PLAYER) {
      this.playerChoice = choice;
      this.playerSaberColor = this.getChosenColorParam(choice);
      this.step = SelectStep.OPPONENT;
      this.menu.selectedIndex = (this.characterIds.indexOf(choice) + 1) % this.characterIds.length;
      return;
    }
    if (this.step === SelectStep.OPPONENT) {
      this.opponentChoice = choice;
      this.opponentSaberColor = this.getChosenColorParam(choice);
      this.step = SelectStep.ARENA;
      this.menu = this.arenaMenu;
      return;
    }
    this.game.changeState(StateId.DUEL, {
      ...this.params,
      playerCharacter: this.playerChoice,
      opponentCharacter: this.opponentChoice,
      playerSaberColor: this.playerSaberColor,
      opponentSaberColor: this.opponentSaberColor,
      arena: choice,
    });
  }

  render(renderer) {
    renderer.clear(colors.background);
    renderer.text(this.getTitle(), renderer.width / 2, layout.characterSelect.titleY, textStyles.heading);
    this.menu.render(renderer, layout.characterSelect.listX);
    if (this.step === SelectStep.ARENA) {
      this.renderArenaPreview(renderer);
    } else {
      this.renderCharacterPreview(renderer);
    }
    renderer.text(this.game.input.lastInputKind === 'touch' ? texts.touch.navigation : this.isLocal ? texts.characterSelect.localControls : this.footer, renderer.width / 2, layout.characterSelect.footerY, textStyles.hint);
  }

  renderArenaPreview(renderer) {
    const { previewX, arenaPreviewY, arenaPreviewScale, infoY } = layout.characterSelect;
    const id = this.menu.selected.id;
    const width = renderer.width * arenaPreviewScale;
    const height = renderer.height * arenaPreviewScale;
    const left = previewX - width / 2;

    renderer.text(texts.arenaDescriptions[id], previewX, infoY, textStyles.hint);
    renderer.save();
    renderer.clipRect(left, arenaPreviewY, width, height);
    renderer.translate(left, arenaPreviewY);
    renderer.scale(arenaPreviewScale, arenaPreviewScale);
    this.arenaViews.get(id).renderBackground(renderer, this.arenaBounds, [], []);
    this.arenaViews.get(id).renderFloor(renderer, this.arenaBounds);
    renderer.restore();
    renderer.strokeRect(left, arenaPreviewY, width, height, colors.accent, 1);
  }

  renderColorArrow(renderer, circle, label) {
    renderer.strokeCircle(circle.x, circle.y, circle.radius, colors.accent);
    renderer.text(label, circle.x, circle.y, textStyles.subtitle);
  }

  renderColorInfo(renderer, character, x, y) {
    if (this.game.input.lastInputKind === 'touch') {
      this.renderColorArrow(renderer, touchLayoutConfig.colorLeft, texts.touch.colorLeft);
      this.renderColorArrow(renderer, touchLayoutConfig.colorRight, texts.touch.colorRight);
    }
    const options = getSaberOptions(character, this.game.settings);
    const chosen = this.getChosenColor(character.id);
    const index = options.findIndex((option) => option.color === chosen);
    const locked = options.find((option) => !option.unlocked);
    renderer.text(formatText(texts.unlocks.blade, { name: options[index].name, index: index + 1, total: options.length }), x, y, textStyles.accentHint);
    const requirement = locked
      ? formatText(texts.unlocks.next, { text: locked.alt.challenge ? locked.alt.challenge.text : texts.unlocks.arcadeChallenge })
      : texts.unlocks.allUnlocked;
    renderer.text(requirement, x, y + layout.characterSelect.infoLineSpacing * 0.8, textStyles.hint);
  }

  renderCharacterPreview(renderer) {
    const { previewX, previewY, infoY, infoLineSpacing } = layout.characterSelect;
    const character = characters[this.menu.selected.id];

    renderer.text(character.info.style, previewX, infoY, textStyles.subtitle);
    renderer.text(character.info.trait, previewX, infoY + infoLineSpacing, textStyles.hint);
    renderer.text(character.info.ability, previewX, infoY + infoLineSpacing * 2, textStyles.hint);
    this.renderColorInfo(renderer, character, previewX, infoY + infoLineSpacing * 3);

    const fighter = this.previews.get(character.id);
    computePose(fighter, this.pose);
    renderer.save();
    drawAttributeBars(renderer, fighter.stats.attributes);
    renderer.translate(layout.attributes.previewX, previewY);
    renderer.scale(layout.attributes.previewScale, layout.attributes.previewScale);
    drawFighterBody(renderer, fighter, this.pose, 0);
    drawSaber(renderer, fighter, this.pose);
    renderer.restore();
  }
}

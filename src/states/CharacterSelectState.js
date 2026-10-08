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
    this.pose = createPose();
    const bindings = this.game.input.bindings ?? keyBindings;
    this.footer = formatText(texts.characterSelect.footer, {
      up: formatActionKeys(bindings, Action.MENU_UP),
      down: formatActionKeys(bindings, Action.MENU_DOWN),
      confirm: formatActionKeys(bindings, Action.CONFIRM),
      back: formatActionKeys(bindings, Action.BACK),
    });
  }

  update(dt) {
    if (this.game.input.wasPressed(Action.BACK)) {
      this.goBack();
      return;
    }
    const choice = this.menu.update(this.game.input);
    if (choice) {
      this.choose(choice);
      return;
    }
    if (this.step !== SelectStep.ARENA) {
      this.previews.get(this.menu.selected.id).animation.time += dt;
    }
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
      this.game.changeState(StateId.DUEL, { mode: DuelMode.ARCADE, arcade: createArcadeRun(choice, this.characterIds, gameConfig.arcade) });
      return;
    }
    if (this.step === SelectStep.PLAYER) {
      this.playerChoice = choice;
      this.step = SelectStep.OPPONENT;
      this.menu.selectedIndex = (this.characterIds.indexOf(choice) + 1) % this.characterIds.length;
      return;
    }
    if (this.step === SelectStep.OPPONENT) {
      this.opponentChoice = choice;
      this.step = SelectStep.ARENA;
      this.menu = this.arenaMenu;
      return;
    }
    this.game.changeState(StateId.DUEL, {
      ...this.params,
      playerCharacter: this.playerChoice,
      opponentCharacter: this.opponentChoice,
      arena: choice,
    });
  }

  render(renderer) {
    renderer.clear(colors.background);
    renderer.text(texts.characterSelect.titles[this.step], renderer.width / 2, layout.characterSelect.titleY, textStyles.heading);
    this.menu.render(renderer, layout.characterSelect.listX);
    if (this.step === SelectStep.ARENA) {
      this.renderArenaPreview(renderer);
    } else {
      this.renderCharacterPreview(renderer);
    }
    renderer.text(this.footer, renderer.width / 2, layout.characterSelect.footerY, textStyles.hint);
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

  renderCharacterPreview(renderer) {
    const { previewX, previewY, previewScale, infoY, infoLineSpacing } = layout.characterSelect;
    const character = characters[this.menu.selected.id];

    renderer.text(character.info.style, previewX, infoY, textStyles.subtitle);
    renderer.text(character.info.trait, previewX, infoY + infoLineSpacing, textStyles.hint);
    renderer.text(character.info.ability, previewX, infoY + infoLineSpacing * 2, textStyles.hint);

    const fighter = this.previews.get(character.id);
    computePose(fighter, this.pose);
    renderer.save();
    renderer.translate(previewX, previewY);
    renderer.scale(previewScale, previewScale);
    drawFighterBody(renderer, fighter, this.pose, 0);
    drawSaber(renderer, fighter, this.pose);
    renderer.restore();
  }
}

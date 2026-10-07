import { characters } from '../characters/characterData.js';
import { createFighter } from '../characters/characterFactory.js';
import { Action, keyBindings } from '../config/controlsConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { layout, texts } from '../config/uiConfig.js';
import { computePose, createPose } from '../rendering/fighterPose.js';
import { drawFighterBody } from '../rendering/fighterRenderer.js';
import { drawSaber } from '../rendering/saberRenderer.js';
import { formatText } from '../ui/formatText.js';
import { formatActionKeys } from '../ui/keyLabels.js';
import { MenuList } from '../ui/MenuList.js';
import { GameState } from './GameState.js';
import { StateId } from './stateIds.js';

export const SelectStep = Object.freeze({
  PLAYER: 'player',
  OPPONENT: 'opponent',
});

export class CharacterSelectState extends GameState {
  enter() {
    this.characterIds = Object.keys(characters);
    this.step = SelectStep.PLAYER;
    this.playerChoice = null;
    this.menu = new MenuList(this.characterIds.map((id) => ({ id, label: characters[id].name })), layout.characterSelect, this.game.audio);
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
    this.previews.get(this.menu.selected.id).animation.time += dt;
  }

  goBack() {
    if (this.step === SelectStep.OPPONENT) {
      this.step = SelectStep.PLAYER;
      this.menu.selectedIndex = this.characterIds.indexOf(this.playerChoice);
      return;
    }
    this.game.changeState(StateId.MENU);
  }

  choose(choice) {
    if (this.step === SelectStep.PLAYER) {
      this.playerChoice = choice;
      this.step = SelectStep.OPPONENT;
      this.menu.selectedIndex = (this.characterIds.indexOf(choice) + 1) % this.characterIds.length;
      return;
    }
    this.game.changeState(StateId.DUEL, {
      ...this.params,
      playerCharacter: this.playerChoice,
      opponentCharacter: choice,
    });
  }

  render(renderer) {
    const { titleY, listX, previewX, previewY, previewScale, infoY, infoLineSpacing, footerY } = layout.characterSelect;
    const title = this.step === SelectStep.PLAYER ? texts.characterSelect.title : texts.characterSelect.opponentTitle;
    const character = characters[this.menu.selected.id];

    renderer.clear(colors.background);
    renderer.text(title, renderer.width / 2, titleY, textStyles.heading);
    this.menu.render(renderer, listX);

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
    renderer.text(this.footer, renderer.width / 2, footerY, textStyles.hint);
  }
}

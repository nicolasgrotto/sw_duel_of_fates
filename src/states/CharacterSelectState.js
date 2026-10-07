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

export class CharacterSelectState extends GameState {
  enter() {
    this.characterIds = Object.keys(characters);
    this.menu = new MenuList(this.characterIds.map((id) => ({ id, label: characters[id].name })), layout.characterSelect, this.game.audio);
    this.previews = new Map(this.characterIds.map((id) => [id, createFighter(id, { x: 0, y: 0, facing: 1 })]));
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
      this.game.changeState(StateId.MENU);
      return;
    }
    const choice = this.menu.update(this.game.input);
    if (choice) {
      this.game.changeState(StateId.DUEL, {
        ...this.params,
        playerCharacter: choice,
        opponentCharacter: this.characterIds.find((id) => id !== choice),
      });
      return;
    }
    this.previews.get(this.menu.selected.id).animation.time += dt;
  }

  render(renderer) {
    const centerX = renderer.width / 2;
    const { titleY, previewY, previewScale, footerY } = layout.characterSelect;
    renderer.clear(colors.background);
    renderer.text(texts.characterSelect.title, centerX, titleY, textStyles.heading);
    this.menu.render(renderer, centerX);
    const fighter = this.previews.get(this.menu.selected.id);
    computePose(fighter, this.pose);
    renderer.save();
    renderer.translate(centerX, previewY);
    renderer.scale(previewScale, previewScale);
    drawFighterBody(renderer, fighter, this.pose, 0);
    drawSaber(renderer, fighter, this.pose);
    renderer.restore();
    renderer.text(this.footer, centerX, footerY, textStyles.hint);
  }
}

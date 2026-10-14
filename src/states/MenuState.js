import { Action, keyBindings } from '../config/controlsConfig.js';
import { gameConfig } from '../config/gameConfig.js';
import { textStyles } from '../config/themeConfig.js';
import { layout, texts } from '../config/uiConfig.js';
import { formatText } from '../ui/formatText.js';
import { formatActionKeys } from '../ui/keyLabels.js';
import { MenuList } from '../ui/MenuList.js';
import { DuelMode } from './duelModes.js';
import { GameState } from './GameState.js';
import { StateId } from './stateIds.js';

export const MenuOption = Object.freeze({
  PLAY: 'play',
  LEARN: 'learn',
  EXTRAS: 'extras',
  STORY: 'story',
  DUEL: 'duel',
  ARCADE: 'arcade',
  SURVIVAL: 'survival',
  LOCAL: 'local',
  TUTORIAL: 'tutorial',
  CHALLENGE: 'challenge',
  TRAINING: 'training',
  GALLERY: 'gallery',
  DRILLS: 'drills',
  TRIALS: 'trials',
  STORY_GALLERY: 'storyGallery',
  OPTIONS: 'options',
  CONTROLS: 'controls',
  BACK: 'back',
});

const ROOT = 'root';

export const MENU_GROUPS = Object.freeze({
  [ROOT]: [MenuOption.PLAY, MenuOption.LEARN, MenuOption.EXTRAS, MenuOption.OPTIONS],
  [MenuOption.PLAY]: [MenuOption.DUEL, MenuOption.STORY, MenuOption.ARCADE, MenuOption.SURVIVAL, MenuOption.LOCAL, MenuOption.BACK],
  [MenuOption.LEARN]: [MenuOption.TUTORIAL, MenuOption.DRILLS, MenuOption.TRAINING, MenuOption.CHALLENGE, MenuOption.CONTROLS, MenuOption.BACK],
  [MenuOption.EXTRAS]: [MenuOption.GALLERY, MenuOption.TRIALS, MenuOption.STORY_GALLERY, MenuOption.BACK],
});

const STATE_TARGETS = {
  [MenuOption.STORY]: [StateId.STORY, {}],
  [MenuOption.DUEL]: [StateId.CHARACTER_SELECT, { mode: DuelMode.VERSUS }],
  [MenuOption.SURVIVAL]: [StateId.CHARACTER_SELECT, { mode: DuelMode.SURVIVAL }],
  [MenuOption.LOCAL]: [StateId.CHARACTER_SELECT, { mode: DuelMode.LOCAL }],
  [MenuOption.ARCADE]: [StateId.CHARACTER_SELECT, { mode: DuelMode.ARCADE }],
  [MenuOption.TRAINING]: [StateId.CHARACTER_SELECT, { mode: DuelMode.TRAINING }],
  [MenuOption.TUTORIAL]: [StateId.DUEL, { mode: DuelMode.TUTORIAL }],
  [MenuOption.CHALLENGE]: [StateId.DUEL, { mode: DuelMode.CHALLENGE }],
  [MenuOption.GALLERY]: [StateId.DUEL, { mode: DuelMode.GALLERY }],
  [MenuOption.DRILLS]: [StateId.DRILL_SELECT, {}],
  [MenuOption.TRIALS]: [StateId.TRIAL_SELECT, {}],
  [MenuOption.STORY_GALLERY]: [StateId.STORY_GALLERY, {}],
};

const OVERLAYS = {
  [MenuOption.OPTIONS]: StateId.OPTIONS,
  [MenuOption.CONTROLS]: StateId.CONTROLS,
};

export class MenuState extends GameState {
  enter() {
    const memory = this.game.menuMemory ?? { group: ROOT, index: 0 };
    this.openGroup(memory.group, memory.index);
    this.refreshFooter();
  }

  resume() {
    this.openGroup(this.group, this.menu.selectedIndex);
    this.refreshFooter();
  }

  openGroup(group, index = 0) {
    this.group = group;
    this.menu = new MenuList(
      MENU_GROUPS[group]
        .filter((id) => !this.game.coarsePointer || id !== MenuOption.LOCAL)
        .map((id) => ({ id, label: texts.menu[id] })),
      layout.menu,
      this.game.audio,
    );
    this.menu.selectedIndex = Math.min(index, this.menu.items.length - 1);
    this.remember();
  }

  remember() {
    this.game.menuMemory = { group: this.group, index: this.menu.selectedIndex };
  }

  refreshFooter() {
    this.bindings = this.game.input.bindings ?? keyBindings;
    this.footer = formatText(texts.menu.navigation, {
      up: formatActionKeys(this.game.input.bindings ?? keyBindings, Action.MENU_UP),
      down: formatActionKeys(this.game.input.bindings ?? keyBindings, Action.MENU_DOWN),
      confirm: formatActionKeys(this.game.input.bindings ?? keyBindings, Action.CONFIRM),
    });
  }

  closeGroup() {
    const index = MENU_GROUPS[ROOT].indexOf(this.group);
    this.openGroup(ROOT, Math.max(0, index));
  }

  update() {
    if (this.bindings !== (this.game.input.bindings ?? keyBindings)) {
      this.refreshFooter();
    }
    if (this.game.input.wasPressed(Action.BACK) && this.group !== ROOT) {
      this.closeGroup();
      return;
    }
    const choice = this.menu.update(this.game.input);
    this.remember();
    if (!choice) return;
    if (MENU_GROUPS[choice]) {
      this.openGroup(choice);
    } else if (choice === MenuOption.BACK) {
      this.closeGroup();
    } else if (OVERLAYS[choice]) {
      this.game.pushState(OVERLAYS[choice]);
    } else if (STATE_TARGETS[choice]) {
      const [state, params] = STATE_TARGETS[choice];
      this.game.changeState(state, params);
    }
  }

  render(renderer) {
    const centerX = renderer.width / 2;

    renderer.text(gameConfig.title.toUpperCase(), centerX, layout.menu.titleY, textStyles.title);
    renderer.text(texts.menu.tagline, centerX, layout.menu.taglineY, textStyles.tagline);
    if (this.group !== ROOT) {
      renderer.text(texts.menu[this.group].toUpperCase(), centerX, layout.menu.groupY, textStyles.menuGroup);
    }
    this.menu.render(renderer, centerX);
    renderer.text(this.game.input.lastInputKind === 'touch' ? texts.touch.navigation : this.footer, centerX, layout.menu.footerY, textStyles.hint);
  }
}

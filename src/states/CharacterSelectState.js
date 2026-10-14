import { drawAttributeBars } from '../ui/attributeBars.js';
import { containsTouch } from '../core/TouchInput.js';
import { touchLayoutConfig } from '../config/touchLayoutConfig.js';
import { arenas } from '../arenas/arenaData.js';
import { getUnlockedVariants, resolveCharacterVariant } from '../characters/variants.js';
import { characters } from '../characters/characterData.js';
import { createFighter } from '../characters/characterFactory.js';
import { POWER_SLOTS, getCustomPowerCatalog, isValidCustomPowers } from '../characters/powers.js';
import { Action, keyBindings } from '../config/controlsConfig.js';
import { gameConfig } from '../config/gameConfig.js';
import { powersConfig } from '../config/powersConfig.js';
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
import { getSkinOptions, getSaberOptions } from '../modes/unlocks.js';
import { createRandom, createRandomSeed, pick } from '../utils/random.js';
import { MenuList } from '../ui/MenuList.js';
import { DuelMode } from './duelModes.js';
import { GameState } from './GameState.js';
import { StateId } from './stateIds.js';
import { drawFitted } from '../ui/fittedText.js';

export const SelectStep = Object.freeze({
  PLAYER: 'player',
  OPPONENT: 'opponent',
  ARENA: 'arena',
});

export const RANDOM_CHOICE = 'random';
const LOADOUT_MODE = 'loadoutMode';
const VARIANT_STYLES = { light: textStyles.galleryCategoryAurora, dark: textStyles.galleryCategoryEclipse };
const SIDE_CATEGORIES = { light: 'aurora', dark: 'eclipse' };
const SINGLE_PICK_MODES = new Set([DuelMode.ARCADE, DuelMode.SURVIVAL, DuelMode.TRAINING]);
const CUSTOM_LOADOUT_MODES = new Set([DuelMode.VERSUS, DuelMode.LOCAL, DuelMode.TRAINING]);

export function getLoadoutKey(id, variant) {
  return variant ? `${id}.${variant}` : id;
}

export class CharacterSelectState extends GameState {
  enter() {
    this.rosterIds = Object.keys(characters).filter((id) => characters[id].selectable);
    const unlocked = this.game.settings.unlockedCharacters ?? [];
    this.characterIds = [...this.rosterIds, ...Object.keys(characters).filter((id) => characters[id].secret && unlocked.includes(id)).sort((a, b) => characters[a].potential - characters[b].potential)];
    const listLayout = layout.characterSelect.list;
    this.step = SelectStep.PLAYER;
    this.playerChoice = null;
    this.opponentChoice = null;
    this.seed = createRandomSeed();
    this.random = createRandom(this.seed);
    this.characterMenu = new MenuList([{ id: RANDOM_CHOICE, label: texts.characterSelect.random }, ...this.characterIds.map((id) => ({ id, label: characters[id].name }))], listLayout, this.game.audio);
    this.arenaMenu = new MenuList([{ id: RANDOM_CHOICE, label: texts.characterSelect.randomArena }, ...gameConfig.duel.arenaOrder.map((id) => ({ id, label: texts.arenas[id] }))], listLayout, this.game.audio);
    this.menu = this.characterMenu;
    this.lastSelection = this.game.settings.lastSelection?.[this.params.mode] ?? {};
    if (typeof this.lastSelection !== 'object') this.lastSelection = {};
    this.selectId(this.characterMenu, this.lastSelection.player ?? this.characterIds[0]);
    this.arenaBounds = createArenaBounds(gameConfig);
    this.arenaViews = new Map(gameConfig.duel.arenaOrder.map((id) => [id, new ArenaRenderer(arenas[id])]));
    this.colorChoices = new Map();
    this.skinChoices = new Map();
    this.variantChoices = new Map();
    this.previews = new Map(this.characterIds.map((id) => [id, this.createPreview(id)]));
    this.playerVariant = null;
    this.opponentVariant = null;
    this.playerSaberColor = null;
    this.editor = null;
    this.pose = createPose();
    const bindings = this.game.input.bindings ?? keyBindings;
    this.footer = formatText(texts.characterSelect.footer, {
      up: formatActionKeys(bindings, Action.MENU_UP),
      down: formatActionKeys(bindings, Action.MENU_DOWN),
      confirm: formatActionKeys(bindings, Action.CONFIRM),
      back: formatActionKeys(bindings, Action.BACK),
    });
  }

  selectId(menu, id) {
    const index = menu.items.findIndex((item) => item.id === id);
    menu.selectedIndex = index >= 0 ? index : Math.min(1, menu.items.length - 1);
  }

  get isLocal() {
    return this.params.mode === DuelMode.LOCAL;
  }

  get activeInput() {
    return this.isLocal && this.step === SelectStep.OPPONENT ? this.game.secondInput : this.game.input;
  }

  get selectedId() {
    return this.menu.selected.id;
  }

  get canEditPowers() {
    return CUSTOM_LOADOUT_MODES.has(this.params.mode) && this.game.settings.powers !== false && this.step !== SelectStep.ARENA;
  }

  getTitle() {
    if (this.isLocal && this.step !== SelectStep.ARENA) {
      return texts.characterSelect.localTitles[this.step];
    }
    return texts.characterSelect.titles[this.step];
  }

  update(dt) {
    const input = this.activeInput;
    if (this.editor) {
      this.updateEditor(input);
      return;
    }
    if (input.wasPressed(Action.BACK)) {
      this.goBack();
      return;
    }
    const choice = this.menu.update(input);
    if (choice) {
      this.choose(choice);
      return;
    }
    if (this.step === SelectStep.ARENA || this.selectedId === RANDOM_CHOICE) return;
    if (this.canEditPowers && (input.wasPressed(Action.HEAVY_ATTACK) || (input.touchTaps ?? []).some((tap) => containsTouch(tap, touchLayoutConfig.powersButton)))) {
      this.openEditor();
      return;
    }
    this.updateColorChoice(input);
    this.updateSkinChoice(input);
    this.updateVariantChoice(input);
    this.previews.get(this.selectedId).animation.time += dt;
  }

  updateColorChoice(input) {
    const taps = input.touchTaps ?? [];
    const step = (input.wasPressed(Action.MOVE_RIGHT) || taps.some((tap) => containsTouch(tap, touchLayoutConfig.colorRight)) ? 1 : 0) - (input.wasPressed(Action.MOVE_LEFT) || taps.some((tap) => containsTouch(tap, touchLayoutConfig.colorLeft)) ? 1 : 0);
    if (step === 0) {
      return;
    }
    const id = this.selectedId;
    const unlocked = getSaberOptions(characters[id], this.game.settings).filter((option) => option.unlocked);
    const current = unlocked.findIndex((option) => option.color === this.getChosenColor(id));
    const next = unlocked[(Math.max(0, current) + step + unlocked.length) % unlocked.length];
    this.colorChoices.set(id, next.color);
    this.refreshPreview(id);
  }

  createPreview(id) {
    return createFighter(id, { x: 0, y: 0, facing: -1 }, { saberColor: this.getChosenColor(id), skin: this.getChosenSkin(id), variant: this.getChosenVariant(id), powers: this.getChosenPowers(id) });
  }

  refreshPreview(id) {
    const preview = this.createPreview(id);
    preview.animation.time = this.previews.get(id)?.animation.time ?? 0;
    this.previews.set(id, preview);
  }

  getChosenVariant(id) {
    return this.variantChoices.get(id) ?? getUnlockedVariants(characters[id], this.game.settings)[0] ?? null;
  }

  getVariantCharacter(id) {
    return resolveCharacterVariant(characters[id], this.getChosenVariant(id) ?? characters[id].defaultVariant ?? null).character;
  }

  getLoadoutState(id) {
    const key = getLoadoutKey(id, this.getChosenVariant(id));
    const loadoutModes = this.game.settings.loadoutModes ?? {};
    const customLoadouts = this.game.settings.customLoadouts ?? {};
    const character = this.getVariantCharacter(id);
    const custom = isValidCustomPowers(customLoadouts[key], character, powersConfig) ? customLoadouts[key] : null;
    return { key, character, custom, active: custom && loadoutModes[key] === 'custom' ? custom : null };
  }

  getChosenPowers(id) {
    if (!CUSTOM_LOADOUT_MODES.has(this.params.mode) || this.game.settings.powers === false) return null;
    return this.getLoadoutState(id).active;
  }

  updateVariantChoice(input) {
    const character = characters[this.selectedId];
    const options = getUnlockedVariants(character, this.game.settings);
    if (options.length < 2) return;
    const taps = input.touchTaps ?? [];
    const step = (input.wasPressed(Action.POWER) || taps.some(tap => containsTouch(tap, touchLayoutConfig.variantRight) && this.isVariantTap(tap)) ? 1 : 0)
      - (taps.some(tap => containsTouch(tap, touchLayoutConfig.variantLeft) && this.isVariantTap(tap)) ? 1 : 0);
    if (!step) return;
    const current = options.indexOf(this.getChosenVariant(character.id));
    this.variantChoices.set(character.id, options[(Math.max(0, current) + step + options.length) % options.length]);
    this.refreshPreview(character.id);
  }

  isVariantTap(tap) {
    const character = characters[this.selectedId];
    if (getUnlockedVariants(character, this.game.settings).length < 2) return false;
    const { variantLeft, variantRight, skinLeft, skinRight } = touchLayoutConfig;
    const variantDistance = Math.min(Math.hypot(tap.x - variantLeft.x, tap.y - variantLeft.y), Math.hypot(tap.x - variantRight.x, tap.y - variantRight.y));
    const skinDistance = Math.min(Math.hypot(tap.x - skinLeft.x, tap.y - skinLeft.y), Math.hypot(tap.x - skinRight.x, tap.y - skinRight.y));
    return variantDistance <= variantLeft.radius && variantDistance <= skinDistance;
  }

  getChosenSkin(id) {
    return this.skinChoices.get(id) ?? 'base';
  }

  updateSkinChoice(input) {
    const taps = input.touchTaps ?? [];
    const step = (input.wasPressed(Action.SPECIAL) || taps.some((tap) => containsTouch(tap, touchLayoutConfig.skinRight) && !this.isVariantTap(tap)) ? 1 : 0)
      - (input.wasPressed(Action.BLOCK) || taps.some((tap) => containsTouch(tap, touchLayoutConfig.skinLeft) && !this.isVariantTap(tap)) ? 1 : 0);
    if (!step) return;
    const id = this.selectedId;
    const options = getSkinOptions(characters[id], this.game.settings).filter((skin) => skin.unlocked);
    const current = options.findIndex((skin) => skin.id === this.getChosenSkin(id));
    if (!options.length) return;
    this.skinChoices.set(id, options[(Math.max(0, current) + step + options.length) % options.length].id);
    this.refreshPreview(id);
  }

  getChosenColor(id) {
    return this.colorChoices?.get(id) ?? characters[id].appearance.saberColor;
  }

  getChosenColorParam(id) {
    const color = this.getChosenColor(id);
    return color === characters[id].appearance.saberColor ? null : color;
  }

  openEditor() {
    const id = this.selectedId;
    const { character } = this.getLoadoutState(id);
    const slots = POWER_SLOTS.filter((slot) => character.loadout?.powers?.[slot]);
    if (slots.length === 0) return;
    this.editor = { id, menu: new MenuList([{ id: LOADOUT_MODE, label: '' }, ...slots.map((slot) => ({ id: slot, label: '' }))], layout.characterSelect.editor, this.game.audio) };
    this.refreshEditorLabels();
  }

  getEditorPowers() {
    const { custom, character } = this.getLoadoutState(this.editor.id);
    return custom ?? { ...character.loadout.powers };
  }

  refreshEditorLabels() {
    const { active } = this.getLoadoutState(this.editor.id);
    const powers = active ?? this.getLoadoutState(this.editor.id).character.loadout.powers;
    for (const item of this.editor.menu.items) {
      item.label = item.id === LOADOUT_MODE
        ? formatText(texts.characterSelect.loadoutMode, { mode: texts.characterSelect.loadoutModes[active ? 'custom' : 'base'] })
        : formatText(texts.characterSelect.slotLine, { slot: texts.characterSelect.slotNames[item.id], name: texts.powers[powers[item.id]] });
    }
  }

  saveLoadout(mode, powers) {
    const { key } = this.getLoadoutState(this.editor.id);
    const { settings } = this.game;
    settings.loadoutModes = { ...settings.loadoutModes, [key]: mode };
    if (powers) settings.customLoadouts = { ...settings.customLoadouts, [key]: powers };
    this.game.saveSettings();
    this.refreshEditorLabels();
    this.refreshPreview(this.editor.id);
  }

  updateEditor(input) {
    if (input.wasPressed(Action.BACK)) {
      this.editor = null;
      return;
    }
    const before = this.editor.menu.selected.id;
    const confirmed = this.editor.menu.update(input);
    const step = confirmed || input.wasPressed(Action.MOVE_RIGHT) ? 1 : input.wasPressed(Action.MOVE_LEFT) ? -1 : 0;
    if (!step || this.editor.menu.selected.id !== before && !confirmed) return;
    const row = this.editor.menu.selected.id;
    const { active } = this.getLoadoutState(this.editor.id);
    if (row === LOADOUT_MODE) {
      this.saveLoadout(active ? 'base' : 'custom', this.getEditorPowers());
      return;
    }
    this.saveLoadout('custom', this.cyclePower(this.getEditorPowers(), row, step));
  }

  cyclePower(powers, slot, step) {
    const catalog = getCustomPowerCatalog(this.getLoadoutState(this.editor.id).character, powersConfig);
    const index = catalog.indexOf(powers[slot]);
    const next = catalog[(index + step + catalog.length) % catalog.length];
    const swapped = Object.keys(powers).find((other) => other !== slot && powers[other] === next);
    const result = { ...powers, [slot]: next };
    if (swapped) result[swapped] = powers[slot];
    return result;
  }

  goBack() {
    if (this.step === SelectStep.ARENA) {
      this.step = SelectStep.OPPONENT;
      this.menu = this.characterMenu;
      this.selectId(this.menu, this.opponentPick);
      this.restoreChoice(this.opponentChoice, this.opponentSkin, this.opponentSaberColor, this.opponentVariant);
      return;
    }
    if (this.step === SelectStep.OPPONENT) {
      this.step = SelectStep.PLAYER;
      this.selectId(this.menu, this.playerPick);
      this.restoreChoice(this.playerChoice, this.playerSkin, this.playerSaberColor, this.playerVariant);
      return;
    }
    this.game.changeState(StateId.MENU);
  }

  restoreChoice(id, skin, saberColor, variant) {
    this.variantChoices.set(id, variant ?? characters[id].defaultVariant ?? null);
    this.skinChoices.set(id, skin ?? 'base');
    this.colorChoices.set(id, saberColor ?? characters[id].appearance.saberColor);
    this.refreshPreview(id);
  }

  resolveCharacter(choice) {
    if (choice !== RANDOM_CHOICE) {
      return { id: choice, variant: this.getChosenVariant(choice), skin: this.getChosenSkin(choice), saberColor: this.getChosenColorParam(choice), powers: this.getChosenPowers(choice) };
    }
    const id = pick(this.random, this.characterIds);
    const variants = getUnlockedVariants(characters[id], this.game.settings);
    return { id, variant: variants.length ? pick(this.random, variants) : null, skin: 'base', saberColor: null, powers: null };
  }

  rememberSelection(fields) {
    const { settings } = this.game;
    settings.lastSelection = { ...settings.lastSelection, [this.params.mode]: { ...this.lastSelection, ...fields } };
    this.lastSelection = settings.lastSelection[this.params.mode];
    this.game.saveSettings();
  }

  choose(choice) {
    if (this.step === SelectStep.PLAYER) {
      const player = this.resolveCharacter(choice);
      this.playerPick = choice;
      this.rememberSelection({ player: choice });
      if (SINGLE_PICK_MODES.has(this.params.mode)) {
        this.startSinglePick(player);
        return;
      }
      Object.assign(this, { playerChoice: player.id, playerVariant: player.variant, playerSkin: player.skin, playerSaberColor: player.saberColor, playerPowers: player.powers });
      this.step = SelectStep.OPPONENT;
      this.selectId(this.menu, this.lastSelection.opponent ?? this.characterIds[(this.characterIds.indexOf(player.id) + 1) % this.characterIds.length]);
      return;
    }
    if (this.step === SelectStep.OPPONENT) {
      const opponent = this.resolveCharacter(choice);
      this.opponentPick = choice;
      this.rememberSelection({ opponent: choice });
      Object.assign(this, { opponentChoice: opponent.id, opponentVariant: opponent.variant, opponentSkin: opponent.skin, opponentSaberColor: opponent.saberColor, opponentPowers: this.isLocal ? opponent.powers : null });
      this.step = SelectStep.ARENA;
      this.menu = this.arenaMenu;
      this.selectId(this.menu, this.lastSelection.arena ?? gameConfig.duel.arenaOrder[0]);
      return;
    }
    this.rememberSelection({ arena: choice });
    this.game.changeState(StateId.DUEL, {
      ...this.params,
      playerCharacter: this.playerChoice,
      opponentCharacter: this.opponentChoice,
      playerVariant: this.playerVariant,
      opponentVariant: this.opponentVariant,
      playerSkin: this.playerSkin,
      opponentSkin: this.opponentSkin,
      playerSaberColor: this.playerSaberColor,
      opponentSaberColor: this.opponentSaberColor,
      playerPowers: this.playerPowers,
      opponentPowers: this.opponentPowers,
      arena: choice === RANDOM_CHOICE ? pick(this.random, gameConfig.duel.arenaOrder) : choice,
      selectionSeed: this.seed,
    });
  }

  startSinglePick(player) {
    const { mode } = this.params;
    if (mode === DuelMode.ARCADE) {
      const run = createArcadeRun(player.id, this.rosterIds, gameConfig.arcade);
      this.game.changeState(StateId.DUEL, { mode, selectionSeed: this.seed, arcade: { ...run, playerVariant: player.variant, playerSaberColor: player.saberColor, playerSkin: player.skin } });
      return;
    }
    if (mode === DuelMode.SURVIVAL) {
      const run = createSurvivalRun(player.id, player.saberColor, createRandomSeed());
      this.game.changeState(StateId.DUEL, { mode, selectionSeed: this.seed, survival: { ...run, playerVariant: player.variant, playerSkin: player.skin } });
      return;
    }
    this.game.changeState(StateId.DUEL, { mode, selectionSeed: this.seed, playerCharacter: player.id, playerVariant: player.variant, playerSkin: player.skin, playerSaberColor: player.saberColor, playerPowers: player.powers });
  }

  render(renderer) {
    const config = layout.characterSelect;
    renderer.clear(colors.background);
    renderer.text(this.getTitle(), renderer.width / 2, config.titleY, textStyles.heading);
    renderer.save();
    if (this.editor) renderer.setAlpha(config.dimmedListAlpha);
    this.menu.render(renderer, config.list.listX);
    renderer.restore();
    if (this.step === SelectStep.ARENA) {
      this.renderArenaPreview(renderer);
    } else if (this.selectedId === RANDOM_CHOICE) {
      renderer.text(texts.characterSelect.randomInfo, config.infoX, config.styleY, textStyles.subtitle);
    } else {
      this.renderCharacterPreview(renderer);
    }
    const footer = this.game.input.lastInputKind === 'touch' ? texts.touch.navigation : this.isLocal ? texts.characterSelect.localControls : this.footer;
    drawFitted(renderer, footer, renderer.width / 2, config.footerY, textStyles.hint, config.footerWidth);
  }

  renderArenaPreview(renderer) {
    const { arenaPreviewX, arenaPreviewY, arenaPreviewScale, styleY } = layout.characterSelect;
    const id = this.selectedId;
    if (id === RANDOM_CHOICE) {
      renderer.text(texts.characterSelect.randomArenaInfo, arenaPreviewX, styleY, textStyles.hint);
      return;
    }
    const width = renderer.width * arenaPreviewScale;
    const height = renderer.height * arenaPreviewScale;
    const left = arenaPreviewX - width / 2;

    renderer.text(texts.arenaDescriptions[id], arenaPreviewX, styleY, textStyles.hint);
    renderer.save();
    renderer.clipRect(left, arenaPreviewY, width, height);
    renderer.translate(left, arenaPreviewY);
    renderer.scale(arenaPreviewScale, arenaPreviewScale);
    this.arenaViews.get(id).renderBackground(renderer, this.arenaBounds, [], []);
    this.arenaViews.get(id).renderFloor(renderer, this.arenaBounds);
    this.arenaViews.get(id).renderShade(renderer, this.arenaBounds);
    renderer.restore();
    renderer.strokeRect(left, arenaPreviewY, width, height, colors.accent, 1);
  }

  renderArrow(renderer, circle, label) {
    renderer.strokeCircle(circle.x, circle.y, circle.radius, colors.accent);
    renderer.text(label, circle.x, circle.y, textStyles.subtitle);
  }

  renderArrows(renderer, left, right) {
    if (this.activeInput.lastInputKind !== 'touch') return;
    this.renderArrow(renderer, left, texts.touch.colorLeft);
    this.renderArrow(renderer, right, texts.touch.colorRight);
  }

  renderColorInfo(renderer, character) {
    const { cosmeticX, bladeY, bladeRequirementY } = layout.characterSelect;
    this.renderArrows(renderer, touchLayoutConfig.colorLeft, touchLayoutConfig.colorRight);
    const options = getSaberOptions(character, this.game.settings);
    const chosen = this.getChosenColor(character.id);
    const index = options.findIndex((option) => option.color === chosen);
    const locked = options.find((option) => !option.unlocked);
    renderer.text(formatText(texts.unlocks.blade, { name: options[index].name, index: index + 1, total: options.length }), cosmeticX, bladeY, textStyles.accentHint);
    const requirement = locked
      ? formatText(texts.unlocks.next, { text: locked.alt.challenge ? locked.alt.challenge.text : texts.unlocks.arcadeChallenge })
      : texts.unlocks.allUnlocked;
    drawFitted(renderer, requirement, cosmeticX, bladeRequirementY, textStyles.hint, layout.characterSelect.cosmeticWidth);
  }

  renderSkinInfo(renderer, character) {
    const options = getSkinOptions(character, this.game.settings);
    const index = options.findIndex((skin) => skin.id === this.getChosenSkin(character.id));
    if (index < 0) return;
    const { cosmeticX, cosmeticWidth, skinY, skinRequirementY, skinControlsY } = layout.characterSelect;
    renderer.text(formatText(texts.characterSelect.skin, { name: options[index].name, index: index + 1, total: options.length }), cosmeticX, skinY, textStyles.accentHint);
    const locked = options.find((skin) => !skin.unlocked);
    drawFitted(renderer, locked ? formatText(texts.characterSelect.skinNext, { text: texts.characterSelect.skinRequirements[locked.unlock] }) : texts.characterSelect.skinsUnlocked, cosmeticX, skinRequirementY, textStyles.hint, cosmeticWidth);
    if (this.activeInput.lastInputKind === 'touch') {
      this.renderArrows(renderer, touchLayoutConfig.skinLeft, touchLayoutConfig.skinRight);
      if (this.canEditPowers) this.renderArrow(renderer, touchLayoutConfig.powersButton, texts.characterSelect.powersTouch);
      return;
    }
    const bindings = this.activeInput.bindings ?? keyBindings;
    const controls = getUnlockedVariants(character, this.game.settings).length > 1 ? texts.characterSelect.variantControls : texts.characterSelect.skinControls;
    drawFitted(renderer, formatText(controls, { previous: formatActionKeys(bindings, Action.BLOCK), next: formatActionKeys(bindings, Action.SPECIAL), power: formatActionKeys(bindings, Action.POWER) }), cosmeticX, skinControlsY, textStyles.hint, cosmeticWidth);
  }

  renderVariantInfo(renderer, character) {
    const variant = this.getChosenVariant(character.id);
    if (!variant) return;
    const { cosmeticX, variantY } = layout.characterSelect;
    const style = VARIANT_STYLES[character.variants[variant].alignment];
    renderer.text(formatText(texts.characterSelect.variant, { name: texts.characterSelect.variantNames[variant] }), cosmeticX, variantY, style);
    if (getUnlockedVariants(character, this.game.settings).length > 1) this.renderArrows(renderer, touchLayoutConfig.variantLeft, touchLayoutConfig.variantRight);
  }

  renderLoadout(renderer, id) {
    const config = layout.characterSelect;
    const { character, active } = this.getLoadoutState(id);
    const powers = active ?? character.loadout?.powers ?? {};
    let y = config.powersY;
    renderer.text(texts.characterSelect.powersTitle, config.infoX, y, textStyles.accentHint);
    for (const slot of POWER_SLOTS.filter((id) => powers[id])) {
      y += config.powerSpacing;
      drawFitted(renderer, formatText(texts.characterSelect.slotLine, { slot: texts.characterSelect.slotNames[slot], name: texts.powers[powers[slot]] }), config.infoX, y, textStyles.hint, config.infoWidth);
    }
    for (const [slot, technique] of Object.entries(character.loadout?.techniques ?? {})) {
      y += config.powerSpacing;
      drawFitted(renderer, formatText(texts.characterSelect.slotLine, { slot: texts.characterSelect.techniqueSlots[slot], name: texts.powers[technique] }), config.infoX, y, textStyles.hint, config.infoWidth);
    }
    if (!this.canEditPowers) return;
    const key = formatActionKeys(this.activeInput.bindings ?? keyBindings, Action.HEAVY_ATTACK);
    y += config.powerSpacing;
    drawFitted(renderer, formatText(texts.characterSelect.loadoutLine, { mode: texts.characterSelect.loadoutModes[active ? 'custom' : 'base'], key }), config.infoX, y, textStyles.accentHint, config.infoWidth);
  }

  renderEditor(renderer) {
    const config = layout.characterSelect;
    const { id, menu } = this.editor;
    renderer.text(formatText(texts.characterSelect.editorTitle, { name: characters[id].name }), config.infoX, config.styleY, textStyles.subtitle);
    menu.render(renderer, config.infoX);
    const row = menu.selected.id;
    const powers = this.getLoadoutState(id).active ?? this.getLoadoutState(id).character.loadout.powers;
    const detail = row === LOADOUT_MODE ? texts.characterSelect.editorModeHint : `${formatText(texts.story.powerDetail, { power: texts.powers[powers[row]], cost: powersConfig.powers[powers[row]].cost })} · ${texts.gallery.descriptions[powers[row]] ?? ''}`;
    drawFitted(renderer, detail, config.infoX, config.editorDetailY, textStyles.hint, config.infoWidth);
    drawFitted(renderer, texts.characterSelect.editorFooter, config.infoX, config.editorFooterY, textStyles.hint, config.infoWidth);
  }

  renderCharacterPreview(renderer) {
    const config = layout.characterSelect;
    const id = this.selectedId;
    const character = characters[id];
    const variantCharacter = this.getVariantCharacter(id);
    const fighter = this.previews.get(id);

    if (this.editor) {
      this.renderEditor(renderer);
    } else {
      renderer.text(character.info.style, config.infoX, config.styleY, textStyles.subtitle);
      renderer.text(texts.gallery.categories[SIDE_CATEGORIES[variantCharacter.alignment]], config.infoX, config.sideY, VARIANT_STYLES[variantCharacter.alignment]);
      drawFitted(renderer, character.info.trait, config.infoX, config.traitY, textStyles.hint, config.infoWidth);
      drawFitted(renderer, character.info.ability, config.infoX, config.abilityY, textStyles.hint, config.infoWidth);
      this.renderLoadout(renderer, id);
      drawAttributeBars(renderer, fighter.stats.attributes, config.attributes, fighter.stats.potential ?? 0);
    }
    this.renderVariantInfo(renderer, character);
    this.renderSkinInfo(renderer, character);
    this.renderColorInfo(renderer, character);
    computePose(fighter, this.pose);
    renderer.save();
    renderer.translate(config.cosmeticX, config.previewY);
    renderer.scale(config.previewScale, config.previewScale);
    drawFighterBody(renderer, fighter, this.pose, 0);
    drawSaber(renderer, fighter, this.pose);
    renderer.restore();
  }
}

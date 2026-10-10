import { Action, keyBindings } from '../config/controlsConfig.js';
import { galleryConfig } from '../config/galleryConfig.js';
import { powersConfig } from '../config/powersConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { layout, texts } from '../config/uiConfig.js';
import { characters } from '../characters/characterData.js';
import { galleryCatalog, galleryCasters } from '../modes/galleryCatalog.js';
import { formatText } from './formatText.js';
import { formatKey } from './keyLabels.js';

function pickFooterCode(codes) {
  return codes.find((code) => code.startsWith('Arrow')) ?? codes[0] ?? '';
}

export class GalleryPanel {
  constructor(scene, input, onChange) {
    this.scene = scene;
    this.input = input;
    this.onChange = onChange;
  }

  select(field, value) {
    this.scene.changeSelection(field, value);
    this.onChange();
  }

  cycle(field, direction = 1) {
    const values = field === 'ability' ? galleryCatalog.map((item) => item.id)
      : field === 'caster' ? galleryCasters : field === 'target' ? galleryConfig.targets : galleryConfig.levels.map((_, index) => index);
    const index = values.indexOf(this.scene.director.selection[field]);
    this.select(field, values[(index + direction + values.length) % values.length]);
  }

  update() {
    const input = this.input;
    if (input.wasPressed(Action.MENU_UP)) this.cycle('ability', -1);
    if (input.wasPressed(Action.MENU_DOWN)) this.cycle('ability');
    if (input.wasPressed(Action.MOVE_LEFT)) this.cycle('tier', -1);
    if (input.wasPressed(Action.MOVE_RIGHT)) this.cycle('tier');
    if (input.wasPressed(Action.BLOCK)) this.cycle('target');
    if (input.wasPressed(Action.LIGHT_ATTACK)) this.scene.requestCast();
    if (input.wasPressed(Action.HEAVY_ATTACK)) this.select('repeat', !this.scene.director.selection.repeat);
    if (input.wasPressed(Action.SPECIAL)) this.cycle('caster');
    for (const tap of input.touchTaps ?? []) this.handleTap(tap);
  }

  handleTap({ x, y }) {
    const config = layout.gallery;
    if (Math.abs(y - layout.banner.titleY) <= config.tapHeight / 2) {
      if (Math.abs(x - config.previousX) <= config.arrowWidth / 2) this.cycle('ability', -1);
      if (Math.abs(x - config.nextX) <= config.arrowWidth / 2) this.cycle('ability');
    }
    if (this.showsTiers && Math.abs(y - config.tiersY) <= config.tapHeight / 2) {
      for (let index = 0; index < powersConfig.tiers.length; index += 1) {
        if (Math.abs(x - (config.firstTierX + index * config.tierSpacing)) <= config.tierWidth / 2) this.select('tier', index);
      }
    }
    if (Math.abs(y - config.footerY) > config.tapHeight / 2) return;
    if (Math.abs(x - config.targetX) <= config.footerChipWidth / 2) this.cycle('target');
    if (Math.abs(x - config.castX) <= config.footerChipWidth / 2) this.scene.requestCast();
    if (Math.abs(x - config.repeatX) <= config.footerChipWidth / 2) this.select('repeat', !this.scene.director.selection.repeat);
    if (Math.abs(x - config.casterX) <= config.footerChipWidth / 2) this.cycle('caster');
  }

  get showsTiers() {
    return this.scene.director.item.kind === 'power';
  }

  get detail() {
    const { director } = this.scene;
    if (!director.allowed) return formatText(texts.gallery.required, { level: director.item.data.minFlowLevel });
    const { selection } = director;
    const repeat = texts.gallery.repeat[selection.repeat ? 'on' : 'off'];
    if (!this.showsTiers) return formatText(texts.gallery.techniqueDetail, { target: texts.gallery.targets[selection.target], repeat });
    return formatText(texts.gallery.detail, {
      tier: texts.gallery.tiers[powersConfig.tiers[selection.tier].id], level: director.level,
      target: texts.gallery.targets[selection.target], repeat: texts.gallery.repeat[selection.repeat ? 'on' : 'off'],
    });
  }

  footer() {
    const keys = {};
    const bindings = this.input.bindings ?? keyBindings;
    for (const [name, action] of Object.entries({ up: Action.MENU_UP, down: Action.MENU_DOWN, left: Action.MOVE_LEFT, right: Action.MOVE_RIGHT,
      block: Action.BLOCK, light: Action.LIGHT_ATTACK, heavy: Action.HEAVY_ATTACK, special: Action.SPECIAL, back: Action.BACK })) {
      keys[name] = this.input.lastInputKind === 'gamepad' ? texts.gallery.gamepad[name] : formatKey(pickFooterCode(bindings[action] ?? []));
    }
    return formatText(texts.gallery.footer, keys);
  }

  render(renderer) {
    const { director } = this.scene;
    const config = layout.gallery;
    renderer.text(texts.touch.colorLeft, config.previousX, layout.banner.titleY, textStyles.subtitle);
    renderer.text(texts.powers[director.item.id], renderer.width / 2, layout.banner.titleY, textStyles.subtitle);
    renderer.text(texts.touch.colorRight, config.nextX, layout.banner.titleY, textStyles.subtitle);
    renderer.text(this.detail, renderer.width / 2, layout.banner.detailY, director.allowed ? textStyles.hint : textStyles.galleryDanger);
    for (let index = 0; this.showsTiers && index < powersConfig.tiers.length; index += 1) {
      const tier = powersConfig.tiers[index];
      const x = config.firstTierX + index * config.tierSpacing;
      renderer.text(texts.gallery.tiers[tier.id], x, config.tiersY, textStyles.hint);
      if (index === director.selection.tier) renderer.line(x - config.underlineWidth / 2, config.underlineY, x + config.underlineWidth / 2, config.underlineY, tier.color, config.underlineThickness);
    }
    if (this.input.lastInputKind === 'touch') {
      this.renderChip(renderer, config.targetX, formatText(texts.gallery.targetChip, { target: texts.gallery.targets[director.selection.target] }));
      this.renderChip(renderer, config.castX, texts.gallery.cast);
      this.renderChip(renderer, config.repeatX, formatText(texts.gallery.repeatChip, { repeat: texts.gallery.repeat[director.selection.repeat ? 'on' : 'off'] }));
      this.renderChip(renderer, config.casterX, formatText(texts.gallery.casterChip, { name: characters[director.selection.caster].name }));
    } else {
      const footer = this.footer();
      const scale = Math.min(1, (renderer.width - config.footerMargin * 2) / renderer.measureText(footer, textStyles.hint));
      renderer.save();
      renderer.translate(renderer.width / 2, config.footerY);
      renderer.scale(scale, 1);
      renderer.text(footer, 0, 0, textStyles.hint);
      renderer.restore();
    }
  }

  renderChip(renderer, x, label) {
    const config = layout.gallery;
    renderer.strokeRect(x - config.footerChipWidth / 2, config.footerY - config.tapHeight / 2, config.footerChipWidth, config.tapHeight, colors.textMuted);
    renderer.text(label, x, config.footerY, textStyles.hint);
  }
}

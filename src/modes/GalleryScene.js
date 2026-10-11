import { createFighterFromCharacter } from '../characters/characterFactory.js';
import { characters } from '../characters/characterData.js';
import { resolvePowerStats } from '../characters/powers.js';
import { galleryConfig } from '../config/galleryConfig.js';
import { powersConfig } from '../config/powersConfig.js';
import { GalleryController } from '../controllers/GalleryController.js';
import { GalleryTargetController } from '../controllers/GalleryTargetController.js';

export class GalleryScene {
  constructor(director, simulation, onReset = () => {}) {
    this.director = director;
    this.simulation = simulation;
    this.fighters = simulation.fighters;
    this.onReset = onReset;
    this.controllers = [new GalleryController(this, 0), new GalleryTargetController(this)];
    this.launchPending = false;
    this.delay = 0;
    this.configure();
    this.reset();
  }

  configure() {
    const { item, selection, level } = this.director;
    const character = characters[selection.caster];
    const loadout = { powers: item.kind === 'power' ? { neutral: item.id } : {}, techniques: item.kind === 'technique' ? { forward: item.id } : {} };
    this.fighters[0] = createFighterFromCharacter({ ...character, loadout, powerSlots: null }, {
      x: this.fighters[0].x, y: this.simulation.arena.floorY, facing: 1,
    });
    this.applyLevel(this.fighters[0], level, loadout.powers);
    this.configureTarget(level);
  }

  configureTarget(level) {
    this.applyLevel(this.fighters[1], level, this.targetLoadout);
  }

  get targetLoadout() {
    const { target } = this.director.selection;
    if (target === 'barrier' || target === 'redirect') return { neutral: target };
    return target === 'attacking' ? { neutral: galleryConfig.attackPower } : {};
  }

  get waitsForIncoming() {
    const { item, selection } = this.director;
    return selection.target === 'attacking' && item.kind === 'power' && !item.data.range;
  }

  applyLevel(fighter, level, loadout) {
    fighter.stats.flowLevel = level;
    fighter.stats.power = resolvePowerStats(level, powersConfig, loadout);
  }

  get range() {
    const { item } = this.director;
    const move = this.fighters[0].moves[item.id];
    return item.kind === 'power' ? item.data.range ?? 0 : move.throwRange ?? move.hitbox.reach;
  }

  get gap() {
    const { item } = this.director;
    if (this.waitsForIncoming) return powersConfig.powers[galleryConfig.attackPower].range * galleryConfig.distanceRatio;
    if (item.kind === 'power' && !item.data.range) return galleryConfig.selfGap;
    return Math.max(this.range * galleryConfig.distanceRatio, item.data.around ? 0 : galleryConfig.minGap);
  }

  changeSelection(field, value) {
    this.director.select(field, value);
    if (field === 'repeat') return;
    if (field === 'target') {
      this.configureTarget(this.director.level);
      this.reset();
      return;
    }
    if (field === 'tier') {
      this.applyLevel(this.fighters[0], this.director.level, this.director.item.kind === 'power' ? { neutral: this.director.item.id } : {});
      this.configureTarget(this.director.level);
      return;
    }
    this.configure();
    this.reset();
  }

  reset() {
    const { arena } = this.simulation;
    const center = (arena.left + arena.right) / 2;
    const gap = this.director.item.data.around ? this.gap : this.gap + (this.fighters[0].width + this.fighters[1].width) / 2;
    this.simulation.bladeLocks.reset();
    this.simulation.projectiles.clear();
    this.simulation.events.length = 0;
    this.fighters[0].resetForRound(center - gap / 2, 1);
    this.fighters[1].resetForRound(center + gap / 2, -1);
    this.launchPending = false;
    this.controllers[1].reset();
    this.delay = 0;
    this.director.phase = 'ready';
    this.director.lastEvents = '';
    this.refill();
    this.onReset();
  }

  requestCast() {
    if (!this.director.allowed) return false;
    this.reset();
    this.launchPending = true;
    this.director.phase = 'active';
    return true;
  }

  beforeStep() {
    this.refill();
    if (this.director.phase === 'ready' && this.director.selection.repeat) this.requestCast();
  }

  refill() {
    for (const fighter of this.fighters) {
      fighter.health = fighter.stats.maxHealth;
      fighter.flowMeter = fighter.stats.power.max;
    }
  }

  hasEffects() {
    if (this.simulation.projectiles.activeCount > 0) return true;
    for (const { combat } of this.fighters) {
      if (combat.power || combat.attack || combat.chokeTime > 0 || combat.freezeTime > 0
        || combat.focusTime > 0 || combat.healTime > 0 || combat.wrathTime > 0 || combat.redirectTime > 0) return true;
    }
    return false;
  }

  afterStep(dt) {
    const { director } = this;
    if (this.simulation.events.length) director.lastEvents = this.simulation.events.map((event) => `${event.type}:${event.attackType ?? '-'}`).join(', ');
    if (director.phase === 'active' && !this.launchPending && !this.hasEffects()) {
      director.phase = 'waiting';
      this.delay = 0;
      return;
    }
    if (director.phase === 'waiting') {
      this.delay += dt;
      if (this.delay >= galleryConfig.cycleDelay) {
        if (director.selection.repeat) this.reset();
        else director.phase = 'ready';
      }
    }
  }
}

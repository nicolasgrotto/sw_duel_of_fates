import { createFighterFromCharacter } from '../characters/characterFactory.js';
import { characters } from '../characters/characterData.js';
import { resolvePowerStats } from '../characters/powers.js';
import { galleryConfig } from '../config/galleryConfig.js';
import { powersConfig } from '../config/powersConfig.js';
import { GalleryController } from '../controllers/GalleryController.js';

export class GalleryScene {
  constructor(director, simulation, onReset = () => {}) {
    this.director = director;
    this.simulation = simulation;
    this.fighters = simulation.fighters;
    this.onReset = onReset;
    this.controllers = [new GalleryController(this, 0), new GalleryController(this, 1)];
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
    this.applyLevel(this.fighters[1], level, {});
  }

  applyLevel(fighter, level, loadout) {
    fighter.stats.flowLevel = level;
    fighter.stats.power = resolvePowerStats(level, powersConfig, loadout);
  }

  get range() {
    const { item } = this.director;
    return item.kind === 'power' ? item.data.range ?? 0 : this.fighters[0].moves[item.id].hitbox.reach;
  }

  changeSelection(field, value) {
    this.director.select(field, value);
    if (field === 'repeat') return;
    if (field === 'tier') {
      this.applyLevel(this.fighters[0], this.director.level, this.director.item.kind === 'power' ? { neutral: this.director.item.id } : {});
      this.applyLevel(this.fighters[1], this.director.level, {});
      return;
    }
    this.configure();
    this.reset();
  }

  reset() {
    const { arena } = this.simulation;
    const center = (arena.left + arena.right) / 2;
    const distance = this.range * galleryConfig.distanceRatio + (this.fighters[0].width + this.fighters[1].width) / 2;
    const gap = this.director.item.data.around ? this.range * galleryConfig.distanceRatio : distance;
    this.simulation.bladeLocks.reset();
    this.simulation.projectiles.clear();
    this.simulation.events.length = 0;
    this.fighters[0].resetForRound(center - gap / 2, 1);
    this.fighters[1].resetForRound(center + gap / 2, -1);
    this.launchPending = false;
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

import { galleryConfig } from '../config/galleryConfig.js';
import { galleryCatalog, galleryCasters, sanitizeGallery } from './galleryCatalog.js';

export class GalleryDirector {
  constructor(selection, onSelection = () => {}) {
    this.selection = sanitizeGallery(selection);
    this.onSelection = onSelection;
    this.phase = 'ready';
    this.lastEvents = '';
  }

  get item() {
    return galleryCatalog.find((item) => item.id === this.selection.ability);
  }

  get level() {
    return galleryConfig.levels[this.selection.tier];
  }

  get allowed() {
    return this.level >= (this.item.data.minFlowLevel ?? 0);
  }

  select(field, value) {
    this.selection = sanitizeGallery({ ...this.selection, [field]: value });
    this.onSelection({ ...this.selection });
  }

  cycle(field, direction = 1) {
    const values = field === 'ability' ? galleryCatalog.map((item) => item.id)
      : field === 'caster' ? galleryCasters : field === 'target' ? galleryConfig.targets : galleryConfig.levels.map((_, index) => index);
    const index = values.indexOf(this.selection[field]);
    this.select(field, values[(index + direction + values.length) % values.length]);
  }
}

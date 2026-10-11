import { galleryConfig } from '../config/galleryConfig.js';

export class GalleryController {
  constructor(scene, role) {
    this.scene = scene;
    this.role = role;
  }

  isReady(dt) {
    if (!this.scene.waitsForIncoming) return true;
    const incoming = this.scene.fighters[1];
    const power = incoming.combat.power;
    return power !== null && incoming.stateTime + dt + Number.EPSILON >= power.startup - this.scene.director.item.data.startup - galleryConfig.reactionLead;
  }

  updateIntent(intent, dt) {
    this.scene.fighters[this.role].clearIntent();
    if (this.role === 0) {
      if (this.scene.launchPending && this.isReady(dt)) {
        const technique = this.scene.director.item.kind === 'technique';
        intent.power = !technique;
        intent.special = technique;
        intent.moveX = technique ? this.scene.fighters[0].facing : 0;
        this.scene.launchPending = false;
      }
      intent.powerHeld = this.scene.director.item.data.channel === true && this.scene.director.phase === 'active';
    }
  }
}

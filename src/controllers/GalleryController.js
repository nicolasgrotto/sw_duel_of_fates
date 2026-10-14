import { getPowerMode } from '../combat/PowerSystem.js';
import { galleryConfig } from '../config/galleryConfig.js';

export class GalleryController {
  constructor(scene, role) {
    this.scene = scene;
    this.role = role;
    this.airDelay = 0;
  }

  isReady(dt) {
    if (this.scene.demonstratesEscape) return getPowerMode(this.scene.fighters[0], this.scene.director.item.data) === 'escape';
    if (!this.scene.waitsForIncoming) return true;
    const incoming = this.scene.fighters[1];
    const power = incoming.combat.power;
    return power !== null && incoming.stateTime + dt + Number.EPSILON >= power.startup - this.scene.director.item.data.startup - galleryConfig.reactionLead;
  }

  updateIntent(intent, dt) {
    this.scene.fighters[this.role].clearIntent();
    if (this.role === 0) {
      if (this.airDelay > 0) {
        this.airDelay -= dt;
        intent.special = this.airDelay <= 0;
        this.scene.launchPending = !intent.special;
      } else if (this.scene.launchPending && this.isReady(dt) && this.scene.director.item.data.airborne) {
        intent.jump = true;
        this.airDelay = galleryConfig.airLaunchDelay;
      } else if (this.scene.launchPending && this.isReady(dt)) {
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

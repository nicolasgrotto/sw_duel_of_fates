export class GalleryController {
  constructor(scene, role) {
    this.scene = scene;
    this.role = role;
  }

  updateIntent(intent) {
    this.scene.fighters[this.role].clearIntent();
    if (this.role === 0) {
      if (this.scene.launchPending) {
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

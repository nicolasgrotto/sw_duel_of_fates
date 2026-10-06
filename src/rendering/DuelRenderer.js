import { isAttackActive } from '../combat/hitboxes.js';
import { effectsConfig } from '../config/effectsConfig.js';
import { drawArena } from './arenaRenderer.js';
import { drawFlash, drawImpactLights, drawParticles } from './effectsRenderer.js';
import { computePose, createPose } from './fighterPose.js';
import { drawFighterBody } from './fighterRenderer.js';
import { SaberTrail } from './SaberTrail.js';
import { drawSaber, drawSaberBodyLight, drawSaberFloorLight, getBladeWorldPoints } from './saberRenderer.js';

export class DuelRenderer {
  constructor() {
    this.poses = new Map();
    this.trails = new Map();
    this.bladePoints = { baseX: 0, baseY: 0, tipX: 0, tipY: 0 };
  }

  getPose(fighter) {
    let pose = this.poses.get(fighter);
    if (!pose) {
      pose = createPose();
      this.poses.set(fighter, pose);
    }
    return pose;
  }

  getTrail(fighter) {
    let trail = this.trails.get(fighter);
    if (!trail) {
      trail = new SaberTrail();
      this.trails.set(fighter, trail);
    }
    return trail;
  }

  render(renderer, arena, fighters, effects, camera) {
    renderer.save();
    renderer.translate(camera.offsetX, camera.offsetY);

    drawArena(renderer, arena);
    this.preparePoses(fighters);

    for (const fighter of fighters) {
      drawSaberFloorLight(renderer, fighter, this.getPose(fighter), arena.floorY);
    }
    for (const fighter of fighters) {
      drawFighterBody(renderer, fighter, this.getPose(fighter), arena.floorY);
    }
    for (const fighter of fighters) {
      drawSaberBodyLight(renderer, fighter, this.getPose(fighter));
    }
    for (const fighter of fighters) {
      this.getTrail(fighter).draw(renderer, fighter.animation.time, fighter.appearance.saberColor);
    }
    for (const fighter of fighters) {
      drawSaber(renderer, fighter, this.getPose(fighter));
    }

    drawImpactLights(renderer, effects.lights);
    drawParticles(renderer, effects.particles.particles, effectsConfig.particle.streakTime);

    renderer.restore();

    drawFlash(renderer, effects.flash);
  }

  preparePoses(fighters) {
    for (const fighter of fighters) {
      const pose = computePose(fighter, this.getPose(fighter));

      if (isAttackActive(fighter)) {
        getBladeWorldPoints(fighter, pose, this.bladePoints);
        this.getTrail(fighter).record(fighter.animation.time, this.bladePoints);
      }
    }
  }
}

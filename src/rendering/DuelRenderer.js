import { effectsConfig } from '../config/effectsConfig.js';
import { drawArena } from './arenaRenderer.js';
import { drawFlash, drawImpactLights, drawParticles } from './effectsRenderer.js';
import { computePose, createPose } from './fighterPose.js';
import { drawFighterBody } from './fighterRenderer.js';
import { drawSaber, drawSaberFloorLight } from './saberRenderer.js';

export class DuelRenderer {
  constructor() {
    this.poses = new Map();
  }

  getPose(fighter) {
    let pose = this.poses.get(fighter);
    if (!pose) {
      pose = createPose();
      this.poses.set(fighter, pose);
    }
    return pose;
  }

  render(renderer, arena, fighters, effects, camera) {
    renderer.save();
    renderer.translate(camera.offsetX, camera.offsetY);

    drawArena(renderer, arena);

    for (const fighter of fighters) {
      computePose(fighter, this.getPose(fighter));
    }
    for (const fighter of fighters) {
      drawSaberFloorLight(renderer, fighter, this.getPose(fighter), arena.floorY);
    }
    for (const fighter of fighters) {
      drawFighterBody(renderer, fighter, this.getPose(fighter), arena.floorY);
    }
    for (const fighter of fighters) {
      drawSaber(renderer, fighter, this.getPose(fighter));
    }

    drawImpactLights(renderer, effects.lights);
    drawParticles(renderer, effects.particles.particles, effectsConfig.particle.streakTime);

    renderer.restore();

    drawFlash(renderer, effects.flash);
  }
}

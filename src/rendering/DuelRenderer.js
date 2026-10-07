import { isSaberStrikeActive } from '../combat/hitboxes.js';
import { colors } from '../config/themeConfig.js';
import { effectsConfig } from '../config/effectsConfig.js';
import { arenas } from '../arenas/arenaData.js';
import { gameConfig } from '../config/gameConfig.js';
import { ArenaRenderer } from './arenaRenderer.js';
import { DodgeAfterimage } from './DodgeAfterimage.js';
import { drawDesaturation, drawFlash, drawImpactLights, drawParticles, drawRings } from './effectsRenderer.js';
import { computePose, createPose } from './fighterPose.js';
import { drawFighterBody } from './fighterRenderer.js';
import { SaberTrail } from './SaberTrail.js';
import { drawSaber, drawSaberBodyLight, drawSaberFloorLight, getBladeWorldPoints } from './saberRenderer.js';

export class DuelRenderer {
  constructor() {
    this.arenaView = new ArenaRenderer(arenas[gameConfig.duel.arena]);
    this.poses = new Map();
    this.trails = new Map();
    this.afterimages = new Map();
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

  getAfterimage(fighter) {
    let afterimage = this.afterimages.get(fighter);
    if (!afterimage) {
      afterimage = new DodgeAfterimage();
      this.afterimages.set(fighter, afterimage);
    }
    return afterimage;
  }

  render(renderer, arena, fighters, effects, camera, ambient = null) {
    renderer.save();
    camera.applyTransform(renderer);

    this.arenaView.render(renderer, arena, ambient);
    this.preparePoses(fighters);

    for (const fighter of fighters) {
      drawSaberFloorLight(renderer, fighter, this.getPose(fighter), arena.floorY);
    }
    for (const fighter of fighters) {
      this.getAfterimage(fighter).draw(renderer, fighter.animation.time, arena.floorY);
    }
    for (const fighter of fighters) {
      renderer.save();
      renderer.translate(effects.getTremor(fighter), 0);
      drawFighterBody(renderer, fighter, this.getPose(fighter), arena.floorY, true, effects.hasHitFlash(fighter) ? colors.hitFlash : null);
      renderer.restore();
    }
    for (const fighter of fighters) {
      renderer.save();
      renderer.translate(effects.getTremor(fighter), 0);
      drawSaberBodyLight(renderer, fighter, this.getPose(fighter));
      renderer.restore();
    }
    drawDesaturation(renderer, effects.desaturation, effectsConfig.desaturationDim, arena.overscan);
    for (const fighter of fighters) {
      this.getTrail(fighter).draw(renderer, fighter.animation.time, fighter.appearance.saberColor);
    }
    for (const fighter of fighters) {
      renderer.save();
      renderer.translate(effects.getTremor(fighter), 0);
      drawSaber(renderer, fighter, this.getPose(fighter), effects.getSaberFlare(fighter));
      renderer.restore();
    }

    drawImpactLights(renderer, effects.lights);
    drawRings(renderer, effects.rings);
    drawParticles(renderer, effects.particles.particles, effectsConfig.particle.streakTime);

    renderer.restore();

    drawFlash(renderer, effects.flash);
    renderer.drawVignette(effectsConfig.vignette);
  }

  preparePoses(fighters) {
    for (const fighter of fighters) {
      const pose = computePose(fighter, this.getPose(fighter));
      this.getAfterimage(fighter).record(fighter, pose);

      if (isSaberStrikeActive(fighter)) {
        getBladeWorldPoints(fighter, pose, this.bladePoints);
        this.getTrail(fighter).record(fighter.animation.time, this.bladePoints);
      }
    }
  }
}

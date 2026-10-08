import { AttackPhase, getAttackPhase, getChargeRatio } from '../combat/attackPhases.js';
import { isSaberStrikeActive } from '../combat/hitboxes.js';
import { colors } from '../config/themeConfig.js';
import { effectsConfig } from '../config/effectsConfig.js';
import { ArenaRenderer } from './arenaRenderer.js';
import { DodgeAfterimage } from './DodgeAfterimage.js';
import { drawDesaturation, drawFlash, drawImpactLights, drawParticles, drawRings } from './effectsRenderer.js';
import { computePose, createPose } from './fighterPose.js';
import { drawFighterBody } from './fighterRenderer.js';
import { SaberTrail } from './SaberTrail.js';
import { drawSaber, drawSaberBodyLight, drawSaberFloorLight, getBladeWorldPoints } from './saberRenderer.js';

function getChargeGlow(fighter) {
  const { attack, chargeTime } = fighter.combat;
  if (!attack?.charge || getAttackPhase(attack, fighter.stateTime) !== AttackPhase.STARTUP) {
    return 0;
  }
  return getChargeRatio(attack, chargeTime);
}

export class DuelRenderer {
  constructor(arenaDefinition) {
    this.arenaView = new ArenaRenderer(arenaDefinition);
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

  render(renderer, arena, fighters, effects, camera, ambients = [], bladeExtension = 1) {
    renderer.save();
    camera.applyTransform(renderer);

    this.preparePoses(fighters, bladeExtension);
    this.arenaView.renderBackground(renderer, arena, ambients, fighters);
    this.arenaView.renderFloor(renderer, arena);
    if (this.arenaView.definition.reflection) {
      this.drawReflections(renderer, fighters, arena.floorY);
      this.arenaView.renderReflectionCover(renderer, arena);
    }
    this.arenaView.renderFloorAmbient(renderer, ambients);

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
      drawSaber(renderer, fighter, this.getPose(fighter), Math.max(effects.getSaberFlare(fighter), getChargeGlow(fighter)));
      renderer.restore();
    }

    drawImpactLights(renderer, effects.lights);
    drawRings(renderer, effects.rings);
    drawParticles(renderer, effects.particles.particles, effectsConfig.particle.streakTime);

    renderer.restore();

    drawFlash(renderer, effects.flash);
    renderer.drawVignette(effectsConfig.vignette);
  }

  drawReflections(renderer, fighters, floorY) {
    renderer.save();
    renderer.translate(0, floorY * 2);
    renderer.scale(1, -1);
    for (const fighter of fighters) {
      drawFighterBody(renderer, fighter, this.getPose(fighter), floorY, false);
    }
    for (const fighter of fighters) {
      drawSaber(renderer, fighter, this.getPose(fighter));
    }
    renderer.restore();
  }

  preparePoses(fighters, bladeExtension) {
    for (const fighter of fighters) {
      const pose = computePose(fighter, this.getPose(fighter));
      pose.bladeExtension = bladeExtension;
      this.getAfterimage(fighter).record(fighter, pose);

      if (isSaberStrikeActive(fighter)) {
        getBladeWorldPoints(fighter, pose, this.bladePoints);
        this.getTrail(fighter).record(fighter.animation.time, this.bladePoints);
      }
    }
  }
}

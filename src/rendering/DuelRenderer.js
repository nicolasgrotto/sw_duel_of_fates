import { AttackPhase, getAttackPhase, getChargeRatio } from '../combat/attackPhases.js';
import { isSaberStrikeActive } from '../combat/hitboxes.js';
import { colors } from '../config/themeConfig.js';
import { effectsConfig } from '../config/effectsConfig.js';
import { ArenaRenderer } from './arenaRenderer.js';
import { DodgeAfterimage } from './DodgeAfterimage.js';
import { PowerRenderer, getStormDarkness } from './PowerRenderer.js';
import { ProjectileRenderer } from './ProjectileRenderer.js';
import { drawDebris, drawDesaturation, drawFlash, drawStormDarkness, drawStormStrikes, drawImpactLights, drawParticles, drawRings, drawShockwaves } from './effectsRenderer.js';
import { applyWind, computePose, createPose, getBladeLockAdvantage } from './fighterPose.js';
import { drawFighterBody } from './fighterRenderer.js';
import { drawFinisherPiece, getSeveredLimb } from './finisherRenderer.js';
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
    this.showFinishers = true;
    this.poses = new Map();
    this.trails = new Map();
    this.afterimages = new Map();
    this.powerView = new PowerRenderer();
    this.projectileView = new ProjectileRenderer();
    this.bladePoints = { baseX: 0, baseY: 0, tipX: 0, tipY: 0 };
    this.lockContext = { advantage: 0, victory: false, flourish: false };
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

  render(renderer, arena, fighters, effects, camera, ambients = [], bladeExtension = 1, projectiles = null) {
    renderer.save();
    camera.applyTransform(renderer);

    this.preparePoses(fighters, bladeExtension, effects);
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
      this.drawPulseOutline(renderer, fighter, effects.getPulseOutline?.(fighter) ?? 0, arena.floorY);
      this.powerView.drawAura(renderer, fighter, this.getPose(fighter), arena.floorY);
      drawFighterBody(renderer, fighter, this.getPose(fighter), arena.floorY, true, effects.hasHitFlash(fighter) ? colors.hitFlash : null, getSeveredLimb(fighter, this.showFinishers));
      drawFinisherPiece(renderer, fighter, arena.floorY, this.showFinishers);
      this.powerView.drawFrozenEchoes(renderer, fighter, this.getPose(fighter), arena.floorY);
      renderer.restore();
    }
    this.arenaView.renderShade(renderer, arena);
    for (const fighter of fighters) {
      renderer.save();
      renderer.translate(effects.getTremor(fighter), 0);
      drawSaberBodyLight(renderer, fighter, this.getPose(fighter));
      renderer.restore();
    }
    drawDesaturation(renderer, effects.desaturation, effectsConfig.desaturationDim, arena.overscan);
    drawStormDarkness(renderer, getStormDarkness(fighters), arena.overscan);
    for (const fighter of fighters) {
      this.getTrail(fighter).draw(renderer, fighter.animation.time, fighter.appearance.saberColor);
    }
    for (const fighter of fighters) {
      renderer.save();
      renderer.translate(effects.getTremor(fighter), 0);
      if (!this.holdsSeveredSaber(fighter)) drawSaber(renderer, fighter, this.getPose(fighter), Math.max(effects.getSaberFlare(fighter), getChargeGlow(fighter)));
      renderer.restore();
    }

    this.projectileView.draw(renderer, projectiles, fighters);
    this.powerView.draw(renderer, fighters, this.poses, arena.floorY);
    if (effects.stormStrikes) drawStormStrikes(renderer, effects.stormStrikes, effectsConfig.stormStrike);
    drawImpactLights(renderer, effects.lights);
    drawRings(renderer, effects.rings);
    drawShockwaves(renderer, effects.shockwaves, effectsConfig.shockwave);
    if (effects.debris) drawDebris(renderer, effects.debris.particles);
    drawParticles(renderer, effects.particles.particles, effectsConfig.particle.streakTime);

    renderer.restore();

    drawFlash(renderer, effects.flash);
    renderer.drawVignette(effectsConfig.vignette);
  }

  drawPulseOutline(renderer, fighter, amount, floorY) {
    if (amount <= 0) {
      return;
    }
    const { outlineAlpha, outlineOffset } = effectsConfig.stormSpasm;
    const pose = this.getPose(fighter);
    renderer.save();
    renderer.setAlpha(outlineAlpha * amount);
    for (let side = 0; side < 4; side += 1) {
      const offsetX = side < 2 ? (side === 0 ? outlineOffset : -outlineOffset) : 0;
      const offsetY = side < 2 ? 0 : (side === 2 ? outlineOffset : -outlineOffset);
      renderer.translate(offsetX, offsetY);
      drawFighterBody(renderer, fighter, pose, floorY, false, colors.hitFlash);
      renderer.translate(-offsetX, -offsetY);
    }
    renderer.restore();
  }

  drawReflections(renderer, fighters, floorY) {
    renderer.save();
    renderer.translate(0, floorY * 2);
    renderer.scale(1, -1);
    for (const fighter of fighters) {
      drawFighterBody(renderer, fighter, this.getPose(fighter), floorY, false, null, getSeveredLimb(fighter, this.showFinishers));
      drawFinisherPiece(renderer, fighter, floorY, this.showFinishers);
    }
    for (const fighter of fighters) {
      if (!this.holdsSeveredSaber(fighter)) drawSaber(renderer, fighter, this.getPose(fighter));
    }
    renderer.restore();
  }

  holdsSeveredSaber(fighter) {
    return getSeveredLimb(fighter, this.showFinishers) === 'frontArm';
  }

  preparePoses(fighters, bladeExtension, effects) {
    const { wind } = this.arenaView.definition;
    for (const fighter of fighters) {
      this.lockContext.advantage = getBladeLockAdvantage(fighter, fighters);
      this.lockContext.victory = effects?.isLockWinner?.(fighter) ?? false;
      this.lockContext.flourish = effects?.isCounterFlourish?.(fighter) ?? false;
      const pose = computePose(fighter, this.getPose(fighter), false, this.lockContext);
      pose.bladeExtension = bladeExtension;
      if (wind) applyWind(pose, fighter, wind);
      this.getAfterimage(fighter).record(fighter, pose, effects?.hasEvadeAfterimage?.(fighter) ?? false);

      if (isSaberStrikeActive(fighter)) {
        getBladeWorldPoints(fighter, pose, this.bladePoints);
        this.getTrail(fighter).record(fighter.animation.time, this.bladePoints);
      }
    }
  }
}

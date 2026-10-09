import { computePose } from './fighterPose.js';
import { drawFighterBody } from './fighterRenderer.js';
import { drawSaber } from './saberRenderer.js';

export function drawFighterPreview(renderer, fighter, pose, x, y, scale) {
  computePose(fighter, pose);
  renderer.save();
  renderer.translate(x, y);
  renderer.scale(scale, scale);
  drawFighterBody(renderer, fighter, pose, 0);
  drawSaber(renderer, fighter, pose);
  renderer.restore();
}

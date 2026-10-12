import { colors } from '../config/themeConfig.js';
import { projectilesConfig } from '../config/projectilesConfig.js';

const style = projectilesConfig.render.energyBlade;

export function drawEnergyBlade(renderer, x, y, angle, length, color, alpha = 1) {
  const directionX = Math.cos(angle);
  const directionY = Math.sin(angle);
  const hilt = length * style.hiltRatio;
  const baseX = x - directionX * (length / 2 - hilt);
  const baseY = y - directionY * (length / 2 - hilt);
  const tipX = x + directionX * length / 2;
  const tipY = y + directionY * length / 2;
  renderer.save();
  renderer.setAlpha(alpha);
  renderer.line(baseX - directionX * hilt, baseY - directionY * hilt, baseX, baseY, colors.saberHilt, style.hiltWidth);
  renderer.setBlendMode('lighter');
  renderer.setAlpha(style.glowAlpha * alpha);
  renderer.line(baseX, baseY, tipX, tipY, color, style.glowWidth);
  renderer.setAlpha(alpha);
  renderer.line(baseX, baseY, tipX, tipY, color, style.width);
  renderer.line(baseX, baseY, tipX, tipY, colors.saberCore, style.coreWidth);
  renderer.restore();
}

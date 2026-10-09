import { colors } from '../config/themeConfig.js';

export function drawImpactLights(renderer, lights) {
  renderer.save();
  renderer.setBlendMode('lighter');
  for (const light of lights) {
    if (light.active) {
      renderer.drawGlow(light.x, light.y, light.radius, light.color, light.alpha);
    }
  }
  renderer.restore();
}

export function drawParticles(renderer, particles, streakTime) {
  renderer.save();
  renderer.setBlendMode('lighter');
  for (const particle of particles) {
    if (!particle.active) {
      continue;
    }
    renderer.setAlpha(particle.life / particle.maxLife);
    renderer.line(
      particle.x,
      particle.y,
      particle.x - particle.vx * streakTime,
      particle.y - particle.vy * streakTime,
      particle.color,
      particle.size,
    );
  }
  renderer.restore();
}

export function drawRings(renderer, rings) {
  renderer.save();
  renderer.setBlendMode('lighter');
  for (const ring of rings) {
    if (!ring.active) {
      continue;
    }
    renderer.setAlpha(ring.alpha * (1 - ring.time / ring.duration));
    renderer.strokeCircle(ring.x, ring.y, ring.radius, ring.color, ring.lineWidth);
  }
  renderer.restore();
}

export function drawDesaturation(renderer, desaturation, dim, padding) {
  if (desaturation.amount <= 0) {
    return;
  }
  const x = -padding;
  const y = -padding;
  const width = renderer.width + padding * 2;
  const height = renderer.height + padding * 2;

  renderer.save();
  renderer.setBlendMode('saturation');
  renderer.setAlpha(desaturation.amount);
  renderer.fillRect(x, y, width, height, colors.desaturateGray);
  renderer.setBlendMode('source-over');
  renderer.setAlpha(desaturation.amount * dim);
  renderer.fillRect(x, y, width, height, colors.desaturateDim);
  renderer.restore();
}

export function drawFlash(renderer, flash) {
  if (flash.alpha <= 0) {
    return;
  }
  renderer.save();
  renderer.setBlendMode('lighter');
  renderer.setAlpha(flash.alpha);
  renderer.fillRect(renderer.viewLeft ?? 0, 0, renderer.viewWidth ?? renderer.width, renderer.height, flash.color);
  renderer.restore();
}

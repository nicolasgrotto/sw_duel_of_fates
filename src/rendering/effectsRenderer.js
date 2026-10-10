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

function drawShockwaveArc(renderer, wave, style, radius, progress) {
  const opening = Math.min((style.openingDegrees * Math.PI) / 180, Math.asin(Math.min(1, style.halfHeight / radius)));
  const center = wave.direction > 0 ? 0 : Math.PI;
  const width = style.lineWidth[0] + (style.lineWidth[1] - style.lineWidth[0]) * progress;
  const fade = 1 - progress;
  renderer.setAlpha(style.alpha * fade);
  renderer.strokeArc(wave.x, wave.y, radius, center - opening, center + opening, wave.color, width);
  renderer.setAlpha(style.coreAlpha * fade);
  renderer.strokeArc(wave.x, wave.y, radius, center - opening, center + opening, colors.shockwaveCore, width * style.coreWidthScale);
}

export function drawShockwaves(renderer, waves, style) {
  renderer.save();
  renderer.setBlendMode('lighter');
  for (const wave of waves) {
    if (!wave.active) {
      continue;
    }
    for (let arc = 0; arc < style.arcs; arc += 1) {
      const progress = (wave.time - arc * style.arcDelay) / style.duration;
      if (progress <= 0 || progress >= 1) {
        continue;
      }
      const radius = style.startRadius + (wave.range - style.startRadius) * (1 - (1 - progress) * (1 - progress));
      drawShockwaveArc(renderer, wave, style, radius, progress);
    }
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

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

const chevronPoints = [0, 0, 0, 0, 0, 0];
const bandPoints = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

function placeChevron(points, offset, wave, radius, armHeight, armBack, upward = 1) {
  const tipX = wave.x + wave.direction * radius;
  points[offset] = tipX - wave.direction * armBack;
  points[offset + 1] = wave.y - armHeight * upward;
  points[offset + 2] = tipX;
  points[offset + 3] = wave.y;
  points[offset + 4] = tipX - wave.direction * armBack;
  points[offset + 5] = wave.y + armHeight * upward;
}

function drawShockwaveChevron(renderer, wave, style, radius, progress) {
  const scale = wave.scale ?? 1;
  const armHeight = Math.min(style.halfHeight * scale, radius * style.armRatio);
  const armBack = armHeight / Math.tan((style.chevronDegrees * Math.PI) / 180);
  const width = (style.lineWidth[0] + (style.lineWidth[1] - style.lineWidth[0]) * progress) * scale;
  const fade = 1 - progress;
  placeChevron(bandPoints, 0, wave, radius, armHeight, armBack);
  placeChevron(bandPoints, 6, wave, Math.max(0, radius - style.bandDepth * scale), armHeight, armBack, -1);
  renderer.setAlpha(style.bandAlpha * fade);
  renderer.fillPolygon(bandPoints, wave.color);
  placeChevron(chevronPoints, 0, wave, radius, armHeight, armBack);
  renderer.setAlpha(style.alpha * fade);
  renderer.polyline(chevronPoints, wave.color, width, 'miter');
  renderer.setAlpha(style.coreAlpha * fade);
  renderer.polyline(chevronPoints, colors.shockwaveCore, width * style.coreWidthScale, 'miter');
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
      drawShockwaveChevron(renderer, wave, style, radius, progress);
    }
  }
  renderer.restore();
}

export function drawStormStrikes(renderer, strikes, style) {
  renderer.save();
  renderer.setBlendMode('lighter');
  for (const strike of strikes) {
    if (!strike.active) {
      continue;
    }
    const fade = 1 - strike.time / style.duration;
    renderer.setAlpha(style.glowAlpha * fade);
    renderer.polyline(strike.points, strike.color, strike.width * style.glowScale);
    renderer.setAlpha(fade);
    renderer.polyline(strike.points, strike.color, strike.width);
    renderer.polyline(strike.points, colors.saberCore, strike.width * 0.4);
    renderer.drawGlow(strike.x, strike.floorY, style.floorGlowRadius, strike.color, 0.6 * fade);
  }
  renderer.restore();
}

export function drawStormDarkness(renderer, amount, padding) {
  if (amount <= 0) {
    return;
  }
  renderer.save();
  renderer.setAlpha(amount);
  renderer.fillRect(-padding, -padding, renderer.width + padding * 2, renderer.height + padding * 2, colors.stormDarken);
  renderer.restore();
}

export function drawDebris(renderer, debris) {
  renderer.save();
  for (const piece of debris) {
    if (!piece.active) {
      continue;
    }
    renderer.setAlpha(Math.min(1, (piece.life / piece.maxLife) * 2));
    renderer.fillRect(piece.x - piece.size / 2, piece.y - piece.size / 2, piece.size, piece.size, piece.color);
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

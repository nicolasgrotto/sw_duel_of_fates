import { finisherStyle, proportions, saberStyle } from '../config/fighterVisualConfig.js';
import { colors } from '../config/themeConfig.js';
import { lerp } from '../utils/math.js';
import { drawEmber, drawSeveredHead } from './fighterRenderer.js';

const piece = { x: 0, y: 0, angle: 0, time: 0 };

export function getSeveredLimb(fighter, shown) {
  const { combat } = fighter;
  if (!shown || fighter.isAlive || !combat?.finisherLimb) return null;
  return `${combat.finisherSide}${combat.finisherLimb[0].toUpperCase()}${combat.finisherLimb.slice(1)}`;
}

function getLandingTime(startY, restY) {
  const { lift, gravity } = finisherStyle;
  return (lift + Math.sqrt(lift * lift + 2 * gravity * (restY - startY))) / gravity;
}

function placePiece(fighter, floorY) {
  const { combat, height, stateTime } = fighter;
  const limb = combat.finisherLimb;
  const direction = combat.finisherDirection;
  const startX = combat.finisherX + direction * height * finisherStyle.startOffset;
  const startY = combat.finisherY - height * finisherStyle.startHeight[limb];
  const restY = floorY - height * finisherStyle.restHeight[limb];
  const landing = getLandingTime(startY, restY);
  const time = Math.min(stateTime, landing);
  const progress = time / landing;
  piece.time = stateTime;
  piece.x = startX + direction * finisherStyle.speed * time;
  piece.y = startY - finisherStyle.lift * time + finisherStyle.gravity * time * time / 2;
  piece.angle = limb === 'head'
    ? direction * (finisherStyle.turns * Math.PI * 2 + Math.PI / 2) * progress
    : lerp(Math.PI / 2, direction * finisherStyle.turns * Math.PI * 2, progress);
  return piece;
}

export function drawFinisherPiece(renderer, fighter, floorY, shown) {
  const severed = getSeveredLimb(fighter, shown);
  if (!severed) return;
  const { height, appearance } = fighter;
  if (fighter.combat.finisherLimb === 'head') {
    const { x, y, angle } = placePiece(fighter, floorY);
    drawSeveredHead(renderer, fighter, x, y, angle);
    return;
  }
  const arm = fighter.combat.finisherLimb === 'arm';
  const front = fighter.combat.finisherSide === 'front';
  const length = height * finisherStyle.length[fighter.combat.finisherLimb];
  const { x, y, angle, time } = placePiece(fighter, floorY);
  const halfX = Math.cos(angle) * length / 2;
  const halfY = Math.sin(angle) * length / 2;
  const color = arm && front ? appearance.cloakColor : appearance.bodyColor;
  renderer.line(x - halfX, y - halfY, x + halfX, y + halfY, color, height * (arm ? proportions.armWidth : proportions.legWidth));
  if (arm) {
    renderer.fillCircle(x + halfX, y + halfY, height * proportions.handRadius, appearance.gloveColor ?? appearance.bodyColor);
  }
  if (arm && front) {
    const hilt = height * finisherStyle.hiltLength;
    const hiltX = Math.cos(angle) * hilt;
    const hiltY = Math.sin(angle) * hilt;
    renderer.line(x + halfX, y + halfY, x + halfX + hiltX, y + halfY + hiltY, colors.saberHilt, saberStyle.hiltWidth * appearance.bladeWidthScale);
  }
  drawEmber(renderer, x - halfX, y - halfY, time, height);
}

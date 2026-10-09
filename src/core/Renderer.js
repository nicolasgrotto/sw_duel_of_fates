const GLOW_SPRITE_SIZE = 128;

function toTransparent(hexColor) {
  const value = Number.parseInt(hexColor.slice(1), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, 0)`;
}

function createGlowSprite(color) {
  const sprite = document.createElement('canvas');
  sprite.width = GLOW_SPRITE_SIZE;
  sprite.height = GLOW_SPRITE_SIZE;

  const context = sprite.getContext('2d');
  const center = GLOW_SPRITE_SIZE / 2;
  const gradient = context.createRadialGradient(center, center, 0, center, center, center);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, toTransparent(color));
  context.fillStyle = gradient;
  context.fillRect(0, 0, GLOW_SPRITE_SIZE, GLOW_SPRITE_SIZE);
  return sprite;
}

function createVignette(width, height, { alpha, innerRadiusRatio, outerRadiusRatio }) {
  const sprite = document.createElement('canvas');
  sprite.width = width;
  sprite.height = height;

  const context = sprite.getContext('2d');
  const centerX = width / 2;
  const centerY = height / 2;
  const diagonal = Math.hypot(centerX, centerY);
  const gradient = context.createRadialGradient(
    centerX,
    centerY,
    diagonal * innerRadiusRatio,
    centerX,
    centerY,
    diagonal * outerRadiusRatio,
  );
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, `rgba(0, 0, 0, ${alpha})`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  return sprite;
}

export class Renderer {
  constructor(canvas, { width, height }) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.width = width;
    this.height = height;
    this.glowSprites = new Map();
    this.vignette = null;
    this.viewWidth = width;
    this.offsetX = 0;
    this.viewScale = 1;
    this.pixelScale = 1;
  }

  get viewLeft() {
    return -this.offsetX;
  }

  createLayer(draw, padding = 0) {
    const canvas = document.createElement('canvas');
    canvas.width = this.width + padding * 2;
    canvas.height = this.height + padding * 2;
    const layer = new Renderer(canvas, { width: this.width, height: this.height });
    layer.translate(padding, padding);
    draw(layer);
    return canvas;
  }

  drawLayer(layer, padding = 0) {
    this.context.drawImage(layer, -padding, -padding, this.width + padding * 2, this.height + padding * 2);
  }

  drawVignette(style) {
    if (!this.vignette || this.vignette.width !== Math.round(this.viewWidth)) {
      this.vignette = createVignette(Math.round(this.viewWidth), this.height, style);
    }
    this.context.drawImage(this.vignette, this.viewLeft, 0, this.viewWidth, this.height);
  }

  getGlowSprite(color) {
    let sprite = this.glowSprites.get(color);
    if (!sprite) {
      sprite = createGlowSprite(color);
      this.glowSprites.set(color, sprite);
    }
    return sprite;
  }

  drawGlow(x, y, radius, color, alpha) {
    this.context.globalAlpha = alpha;
    this.context.drawImage(this.getGlowSprite(color), x - radius, y - radius, radius * 2, radius * 2);
  }

  fitToDisplay(pixelRatio, maxViewWidth = this.width) {
    const displayWidth = this.canvas.clientWidth || this.width;
    const displayHeight = this.canvas.clientHeight || this.height;
    const scale = Math.min(displayWidth / this.width, displayHeight / this.height);

    this.viewWidth = Math.max(this.width, Math.min(maxViewWidth, displayWidth / scale));
    this.offsetX = (this.viewWidth - this.width) / 2;
    this.viewScale = this.viewWidth / this.width;
    this.pixelScale = scale * pixelRatio;
    this.canvas.width = Math.round(displayWidth * pixelRatio);
    this.canvas.height = Math.round(displayHeight * pixelRatio);
    this.resetView();
  }

  resetView() {
    this.context.setTransform(this.pixelScale, 0, 0, this.pixelScale, 0, 0);
  }

  clear(color) {
    this.fillRect(this.viewLeft, 0, this.viewWidth, this.height, color);
  }

  overlay(color) {
    this.fillRect(this.viewLeft, 0, this.viewWidth, this.height, color);
  }

  fillRect(x, y, width, height, color) {
    this.context.fillStyle = color;
    this.context.fillRect(x, y, width, height);
  }

  strokeRect(x, y, width, height, color, lineWidth = 1) {
    this.context.strokeStyle = color;
    this.context.lineWidth = lineWidth;
    this.context.strokeRect(x, y, width, height);
  }

  line(fromX, fromY, toX, toY, color, lineWidth = 1) {
    this.context.strokeStyle = color;
    this.context.lineWidth = lineWidth;
    this.context.lineCap = 'round';
    this.context.beginPath();
    this.context.moveTo(fromX, fromY);
    this.context.lineTo(toX, toY);
    this.context.stroke();
  }

  polyline(points, color, lineWidth = 1) {
    this.context.strokeStyle = color;
    this.context.lineWidth = lineWidth;
    this.context.lineCap = 'round';
    this.context.lineJoin = 'round';
    this.tracePath(points);
    this.context.stroke();
  }

  fillPolygon(points, color) {
    this.context.fillStyle = color;
    this.tracePath(points);
    this.context.closePath();
    this.context.fill();
  }

  fillCircle(x, y, radius, color) {
    this.context.fillStyle = color;
    this.context.beginPath();
    this.context.arc(x, y, radius, 0, Math.PI * 2);
    this.context.fill();
  }

  strokeCircle(x, y, radius, color, lineWidth = 1) {
    this.context.strokeStyle = color;
    this.context.lineWidth = lineWidth;
    this.context.beginPath();
    this.context.arc(x, y, radius, 0, Math.PI * 2);
    this.context.stroke();
  }

  strokeArc(x, y, radius, startAngle, endAngle, color, lineWidth = 1) {
    this.context.strokeStyle = color;
    this.context.lineWidth = lineWidth;
    this.context.beginPath();
    this.context.arc(x, y, radius, startAngle, endAngle);
    this.context.stroke();
  }

  clipRect(x, y, width, height) {
    this.context.beginPath();
    this.context.rect(x, y, width, height);
    this.context.clip();
  }

  strokeEllipse(x, y, radiusX, radiusY, color, lineWidth = 1) {
    this.context.strokeStyle = color;
    this.context.lineWidth = lineWidth;
    this.context.beginPath();
    this.context.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
    this.context.stroke();
  }

  fillEllipse(x, y, radiusX, radiusY, color) {
    this.context.fillStyle = color;
    this.context.beginPath();
    this.context.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
    this.context.fill();
  }

  tracePath(points) {
    this.context.beginPath();
    this.context.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) {
      this.context.lineTo(points[i], points[i + 1]);
    }
  }

  save() {
    this.context.save();
  }

  restore() {
    this.context.restore();
  }

  translate(x, y) {
    this.context.translate(x, y);
  }

  scale(x, y) {
    this.context.scale(x, y);
  }

  rotate(angle) {
    this.context.rotate(angle);
  }

  setAlpha(alpha) {
    this.context.globalAlpha = alpha;
  }

  setBlendMode(mode) {
    this.context.globalCompositeOperation = mode;
  }

  text(content, x, y, style) {
    this.context.font = style.font;
    this.context.fillStyle = style.color;
    this.context.textAlign = style.align;
    this.context.textBaseline = style.baseline;
    this.context.letterSpacing = style.letterSpacing ?? '0px';
    this.context.fillText(content, x, y);
  }

  measureText(content, style) {
    this.context.font = style.font;
    return this.context.measureText(content).width;
  }
}

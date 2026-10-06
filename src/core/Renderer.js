export class Renderer {
  constructor(canvas, { width, height }) {
    this.canvas = canvas;
    this.context = canvas.getContext('2d');
    this.width = width;
    this.height = height;
  }

  fitToDisplay(pixelRatio) {
    const displayWidth = this.canvas.clientWidth || this.width;
    const scale = (displayWidth * pixelRatio) / this.width;

    this.canvas.width = Math.round(this.width * scale);
    this.canvas.height = Math.round(this.height * scale);
    this.context.setTransform(scale, 0, 0, scale, 0, 0);
  }

  clear(color) {
    this.fillRect(0, 0, this.width, this.height, color);
  }

  overlay(color) {
    this.fillRect(0, 0, this.width, this.height, color);
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
    this.context.fillText(content, x, y);
  }

  measureText(content, style) {
    this.context.font = style.font;
    return this.context.measureText(content).width;
  }
}

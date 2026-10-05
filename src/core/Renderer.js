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
    this.context.beginPath();
    this.context.moveTo(fromX, fromY);
    this.context.lineTo(toX, toY);
    this.context.stroke();
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

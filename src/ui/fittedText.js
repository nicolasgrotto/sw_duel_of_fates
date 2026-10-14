export function drawFitted(renderer, text, x, y, style, maxWidth) {
  const scale = Math.min(1, maxWidth / renderer.measureText(text, style));
  if (scale === 1) {
    renderer.text(text, x, y, style);
    return;
  }
  renderer.save();
  renderer.translate(x, y);
  renderer.scale(scale, 1);
  renderer.text(text, 0, 0, style);
  renderer.restore();
}

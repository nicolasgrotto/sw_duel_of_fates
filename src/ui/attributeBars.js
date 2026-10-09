import { attributeOrder, attributesConfig } from '../config/attributesConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { layout, texts } from '../config/uiConfig.js';

export function drawAttributeBars(renderer, attributes, frame = layout.attributes, potential = 0) {
  const { firstRowY, rowSpacing, labelX, barX, valueX, segmentWidth, segmentHeight, segmentGap } = frame;
  let row = 0;
  for (const name of attributeOrder) {
    const value = attributes[name];
    const y = firstRowY + row * rowSpacing;
    renderer.text(texts.attributes[name], labelX, y, textStyles.attributeLabel);
    const segments = Math.max(attributesConfig.maxRating + potential, value);
    for (let index = 0; index < segments; index++) {
      const extra = index >= attributesConfig.maxRating;
      const color = index < value ? (extra ? colors.attributePotential : colors.accent) : (extra ? colors.attributePotentialTrack : colors.hudTrack);
      renderer.fillRect(barX + index * (segmentWidth + segmentGap), y - segmentHeight / 2, segmentWidth, segmentHeight, color);
    }
    const overflow = Math.max(0, segments - attributesConfig.maxRating) * (segmentWidth + segmentGap);
    renderer.text(String(value), valueX + overflow, y, textStyles.attributeValue);
    row++;
  }
}

import { attributeOrder, attributesConfig } from '../config/attributesConfig.js';
import { colors, textStyles } from '../config/themeConfig.js';
import { layout, texts } from '../config/uiConfig.js';

export function drawAttributeBars(renderer, attributes, frame = layout.attributes) {
  const { firstRowY, rowSpacing, labelX, barX, valueX, segmentWidth, segmentHeight, segmentGap } = frame;
  let row = 0;
  for (const name of attributeOrder) {
    const value = attributes[name];
    const y = firstRowY + row * rowSpacing;
    renderer.text(texts.attributes[name], labelX, y, textStyles.attributeLabel);
    for (let index = 0; index < Math.max(attributesConfig.maxRating, value); index++) {
      renderer.fillRect(barX + index * (segmentWidth + segmentGap), y - segmentHeight / 2, segmentWidth, segmentHeight, index < value ? colors.accent : colors.hudTrack);
    }
    renderer.text(String(value), valueX, y, textStyles.attributeValue);
    row++;
  }
}

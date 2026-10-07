import { texts } from '../config/uiConfig.js';

const INPUTS = ['jump', 'lightAttack', 'heavyAttack', 'block', 'dodge', 'special'];

export function formatIntent(intent) {
  const names = texts.training.inputNames;
  const parts = [];
  if (intent.moveX !== 0) {
    parts.push(intent.moveX < 0 ? names.left : names.right);
  }
  for (const action of INPUTS) {
    if (intent[action]) {
      parts.push(names[action]);
    }
  }
  return parts.length > 0 ? parts.join(' + ') : names.idle;
}

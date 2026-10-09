import { colors, textStyles } from '../config/themeConfig.js';
import { gameConfig } from '../config/gameConfig.js';
import { layout } from '../config/uiConfig.js';

export function createTextPrompt({ target, host, getBounds, maxLength, value = '', placeholder = '' }) {
  const input = target.createElement('input');
  input.type = 'text';
  input.maxLength = maxLength;
  input.value = value;
  input.placeholder = placeholder;
  input.setAttribute('aria-label', placeholder);
  input.autocomplete = 'off';
  Object.assign(input.style, { position: 'fixed', zIndex: '1', color: colors.text, background: colors.background, border: `1px solid ${colors.accent}`, outline: `1px solid ${colors.accent}`, font: textStyles.hint.font, borderRadius: '0', padding: '0 8px' });
  let submitted = false;
  let focused = false;
  const stop = (event) => event.stopPropagation();
  const keydown = (event) => {
    stop(event);
    if (event.isComposing) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      submitted = true;
    }
    if (event.key === 'Escape') input.blur();
  };
  const onFocus = () => { focused = true; };
  const onBlur = () => { focused = false; };
  const listeners = { keydown, keyup: stop, pointerdown: stop, pointerup: stop, focus: onFocus, blur: onBlur };
  for (const [event, listener] of Object.entries(listeners)) input.addEventListener(event, listener);
  host.appendChild(input);
  const prompt = {
    get value() { return input.value.trim().slice(0, maxLength); },
    get focused() { return focused; },
    consumeSubmit() {
      const result = submitted;
      submitted = false;
      return result;
    },
    reposition() {
      const bounds = getBounds();
      const scale = bounds.width / gameConfig.canvas.width;
      const box = layout.story.nameInput;
      Object.assign(input.style, { left: `${bounds.left + box.x * scale}px`, top: `${bounds.top + box.y * scale}px`, width: `${box.width}px`, height: `${box.height}px`, transform: `scale(${scale})`, transformOrigin: 'left top' });
    },
    destroy() {
      for (const [event, listener] of Object.entries(listeners)) input.removeEventListener(event, listener);
      input.remove();
    },
  };
  prompt.reposition();
  return prompt;
}

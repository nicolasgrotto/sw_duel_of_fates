const SPECIAL_LABELS = {
  Space: 'Espaço',
  Escape: 'Esc',
  Enter: 'Enter',
  NumpadEnter: null,
  Backspace: 'Backspace',
  ShiftLeft: 'Shift',
  ShiftRight: 'Shift',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
};

export function formatKey(code) {
  if (code in SPECIAL_LABELS) {
    return SPECIAL_LABELS[code];
  }
  if (/^Key[A-Z]$/.test(code)) {
    return code.slice(3);
  }
  if (/^Digit\d$/.test(code)) {
    return code.slice(5);
  }
  return code;
}

export function formatKeys(codes) {
  const labels = [];
  for (const code of codes) {
    const label = formatKey(code);
    if (label && !labels.includes(label)) {
      labels.push(label);
    }
  }
  return labels.join(' / ');
}

export function formatActionKeys(bindings, action) {
  return formatKeys(bindings[action] ?? []);
}

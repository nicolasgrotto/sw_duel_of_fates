export function formatText(template, values) {
  return template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match));
}

export function formatSeconds(seconds) {
  return seconds.toFixed(1).replace('.', ',');
}

function isTable(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function cloneTable(source) {
  return structuredClone(source);
}

export function mergeTables(base, override) {
  const merged = cloneTable(base);
  for (const [key, value] of Object.entries(override)) {
    merged[key] = isTable(value) && isTable(merged[key]) ? mergeTables(merged[key], value) : cloneTable(value);
  }
  return merged;
}

export function replaceTable(target, source) {
  for (const key of Object.keys(target)) {
    if (!(key in source)) {
      delete target[key];
    }
  }
  for (const [key, value] of Object.entries(source)) {
    if (isTable(value) && isTable(target[key])) {
      replaceTable(target[key], value);
    } else {
      target[key] = cloneTable(value);
    }
  }
  return target;
}

export function applyNames(items, names) {
  for (const item of items) {
    item.name = names[item.id] ?? item.id;
  }
}

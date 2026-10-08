export function createCustomBindings(base, custom, actions) {
  const bindings = { ...base };
  for (const action of actions) {
    if (custom[action]) {
      bindings[action] = custom[action];
    }
  }
  return bindings;
}

export function assignKey(bindings, actions, action, code) {
  const custom = {};
  for (const name of actions) {
    custom[name] = [...bindings[name]];
  }
  const previous = custom[action][0];
  for (const name of actions) {
    if (name !== action && custom[name].includes(code)) {
      custom[name] = custom[name].map((current) => (current === code ? previous : current));
    }
  }
  custom[action] = [code];
  return custom;
}

export function sanitizeCustomBindings(saved, actions) {
  const custom = {};
  if (!saved || typeof saved !== 'object') {
    return custom;
  }
  for (const action of actions) {
    const codes = saved[action];
    if (Array.isArray(codes) && codes.length > 0 && codes.every((code) => typeof code === 'string')) {
      custom[action] = codes;
    }
  }
  return custom;
}

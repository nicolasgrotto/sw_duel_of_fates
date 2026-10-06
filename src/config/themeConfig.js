const FONT_FAMILY = 'system-ui, sans-serif';
const MONO_FONT_FAMILY = 'ui-monospace, Consolas, monospace';

export const colors = {
  background: '#05070d',
  floor: '#0d1220',
  floorEdge: '#3a4a6b',
  wall: '#1b2233',
  text: '#e8ecf5',
  textMuted: '#8a94ab',
  accent: '#9fb4d9',
  overlay: 'rgba(0, 0, 0, 0.65)',
  saberHilt: '#b9bec9',
  saberCore: '#ffffff',
  groundShadow: 'rgba(0, 0, 0, 0.45)',
  debug: '#7cfc00',
  debugBackground: 'rgba(0, 0, 0, 0.55)',
  debugBody: 'rgba(124, 252, 0, 0.8)',
};

export const textStyles = {
  title: {
    font: `bold 72px ${FONT_FAMILY}`,
    color: colors.text,
    align: 'center',
    baseline: 'middle',
  },
  heading: {
    font: `bold 48px ${FONT_FAMILY}`,
    color: colors.text,
    align: 'center',
    baseline: 'middle',
  },
  subtitle: {
    font: `28px ${FONT_FAMILY}`,
    color: colors.accent,
    align: 'center',
    baseline: 'middle',
  },
  hint: {
    font: `20px ${FONT_FAMILY}`,
    color: colors.textMuted,
    align: 'center',
    baseline: 'middle',
  },
  debug: {
    font: `14px ${MONO_FONT_FAMILY}`,
    color: colors.debug,
    align: 'left',
    baseline: 'top',
  },
};

export const animation = {
  promptBlinkPeriod: 1.2,
  promptVisibleRatio: 0.65,
};

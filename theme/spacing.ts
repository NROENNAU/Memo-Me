// Einheitliche Abstände (Innen-/Außenabstände) in der ganzen App.
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// Einheitliche Eckenrundungen
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

// Mindestgröße für antippbare Elemente (Barrierefreiheit, iOS/Android-Richtlinie)
export const MIN_TOUCH_TARGET = 44;

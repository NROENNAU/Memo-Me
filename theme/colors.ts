// Zentrale Farbdefinitionen der App, abgeleitet aus den Mockups
// (siehe design/mockups/). Alle Screens nutzen ausschließlich diese Werte,
// damit das Aussehen an einer Stelle änderbar bleibt.
export const colors = {
  // Markenfarbe: Violett für Buttons, Hervorhebungen, aktive Elemente
  primary: '#7C5CE6',
  primaryDark: '#6244D0',
  // Helle Violett-Fläche als sanfter Hintergrund (z. B. Hinweiskarten)
  primarySoft: '#F1ECFD',

  // Flächen
  background: '#F7F7FA',
  surface: '#FFFFFF',
  border: '#E5E5EA',

  // Text
  textPrimary: '#1A1A2E',
  textSecondary: '#6B7280',
  textOnPrimary: '#FFFFFF',

  // Semantische Farben.
  // Wichtig für Barrierefreiheit: Diese Farben dürfen nie das einzige
  // Unterscheidungsmerkmal sein – immer zusätzlich Text oder Icon zeigen.
  success: '#22A45D',
  danger: '#E1234E',
  favorite: '#F5A623',
} as const;

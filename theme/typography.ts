// Schriftgrößen und -gewichte, damit Texte in der ganzen App einheitlich wirken.
import { TextStyle } from 'react-native';

export const typography = {
  // Große Überschrift, z. B. "Willkommen bei"
  title: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  } satisfies TextStyle,
  // Überschrift innerhalb eines Screens, z. B. die Quizfrage
  heading: {
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 28,
  } satisfies TextStyle,
  // Fließtext
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
  } satisfies TextStyle,
  // Beschriftung von Buttons
  button: {
    fontSize: 17,
    fontWeight: '600',
  } satisfies TextStyle,
  // Kleiner Zusatztext, z. B. Hinweise unter einem Foto
  caption: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 20,
  } satisfies TextStyle,
} as const;

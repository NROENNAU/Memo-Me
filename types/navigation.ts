// Liste aller Screens der App-Navigation und deren Übergabe-Parameter.
import { PhotoSource } from './PhotoSource';
import { MemoryPlayer } from './games';

export type RootStackParamList = {
  Onboarding: undefined;
  PhotoSource: undefined;
  // Nach der Fotoquellen-Auswahl: welches Spiel und mit wie vielen
  // Spielern/welchen Namen gespielt wird.
  GameSelection: { source: PhotoSource };
  MemoryGame: { source: PhotoSource; players: MemoryPlayer[] };
  // Der bisherige gemischte Quiz-Bildschirm - bleibt registriert, ist aber
  // nicht mehr über den normalen Einstieg (PhotoSource -> GameSelection)
  // erreichbar, seit die App auf einzelne, fokussierte Spiele umgestellt wurde.
  PhotoSwipe: { source: PhotoSource };
  Settings: undefined;
};

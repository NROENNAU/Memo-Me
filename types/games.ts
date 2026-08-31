// Typen rund um die Spielauswahl: welche Spiele es gibt und wie eine
// Spielerrunde (ein oder zwei Spieler mit Namen) aufgebaut ist.

// Eindeutige Kennung eines Spiels - Grundlage für die Kachelauswahl im
// GameSelectionScreen. Aktuell nur Memory, weitere Spiele werden hier ergänzt.
export type GameId = 'memory';

export interface MemoryPlayer {
  name: string;
}

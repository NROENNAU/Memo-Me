// Datenmodell für ein Foto aus der Gerätebibliothek, wie es lokal in der SQLite-Datenbank abgelegt wird.
export interface Photo {
  id: number;
  // Lokaler Datei-Pfad des Fotos (kommt aus expo-media-library)
  uri: string;
  // Aufnahmezeitpunkt als Unix-Timestamp (Millisekunden)
  timestamp: number;
  // Ort als einfacher Text (z. B. Ortsname), optional
  location: string | null;
  // Schlagwörter/Namen von Personen auf dem Foto.
  // SQLite kennt keine Array-Spalten, daher wird dieses Feld als JSON-String gespeichert.
  tags: string[];
}

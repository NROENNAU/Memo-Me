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

// Geografische Koordinaten, wie sie im Foto hinterlegt sein können.
export interface PhotoCoordinates {
  latitude: number;
  longitude: number;
}

// Ein Foto, so wie es frisch aus der Gerätemediathek gelesen wurde –
// noch bevor es in unsere Datenbank übernommen wird.
export interface LibraryPhoto {
  // ID des Fotos in der Mediathek des Geräts (nicht unsere Datenbank-ID)
  assetId: string;
  // Anzeigbarer Pfad zum Bild
  uri: string;
  // Aufnahmezeitpunkt (Unix-Millisekunden), null wenn das Gerät ihn nicht liefert
  creationTime: number | null;
  // Aufnahmeort, null wenn im Foto kein Ort hinterlegt ist
  coordinates: PhotoCoordinates | null;
}

// Normalisierte Bounding Box eines erkannten Gesichts (0-1, oben-links-Ursprung).
export interface FaceBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Ein erkanntes Gesicht in einem Foto. `embedding` ist ein plattformspezifisch
// kodierter "Fingerabdruck" des Gesichts (auf iOS: ein archiviertes
// VNFeaturePrintObservation, Base64-kodiert) - er lässt sich nicht direkt
// interpretieren, nur über compareFaceEmbeddings vergleichen. Auf Android ist
// er aktuell immer null, da dort keine eingebaute Wiedererkennungs-API
// existiert (siehe Modul-Beschreibung).
export interface DetectedFace {
  boundingBox: FaceBoundingBox;
  embedding: string | null;
}

// Filtert Screenshots, Belege und andere "Müll"-Bilder aus dem Quiz-Fotopool.
// Zweistufig: zuerst eine günstige Metadaten-Prüfung (Screenshot-Erkennung),
// danach bei Bedarf eine on-device Bildklassifikation (Ergebnis wird
// gecacht, siehe photoClassificationRepository).
import { classifyImage, ImageLabel } from '../modules/image-classifier/src';
import { getCachedClassification, saveClassification } from '../db/photoClassificationRepository';

// Schlagwörter, die in den erkannten Labels auf ein Dokument/Beleg/Screenshot
// statt auf eine "echte" Aufnahme (Menschen, Landschaft, Gebäude, ...)
// hindeuten. Bewusst als Teilstring-Vergleich, damit sich die Liste anhand
// der in FotoKlassifikation.labels gespeicherten Rohdaten leicht nachjustieren lässt.
const JUNK_LABEL_KEYWORDS = [
  'document',
  'paper',
  'receipt',
  'invoice',
  'text',
  'screenshot',
  'menu',
  'envelope',
  'web page',
  'website',
  'diagram',
  'whiteboard',
  'blackboard',
  'slide',
  'presentation',
  'business card',
  'spreadsheet',
  'form',
];

const MIN_JUNK_CONFIDENCE = 0.4;
const MAX_LABELS_CHECKED = 5;

export function isJunkLabels(labels: ImageLabel[]): boolean {
  return labels.slice(0, MAX_LABELS_CHECKED).some((label) => {
    if (label.confidence < MIN_JUNK_CONFIDENCE) return false;
    const identifier = label.identifier.toLowerCase();
    return JUNK_LABEL_KEYWORDS.some((keyword) => identifier.includes(keyword));
  });
}

// Erkennt Screenshots über vorhandene Mediathek-Metadaten - zuverlässiger
// und deutlich günstiger als eine ML-Klassifikation, deshalb als erster Filter.
export function isLikelyScreenshot(candidate: { filename?: string; mediaSubtypes?: string[] }): boolean {
  if (candidate.mediaSubtypes?.includes('screenshot')) return true;
  return candidate.filename ? /screenshot/i.test(candidate.filename) : false;
}

// Klassifiziert ein Foto on-device (mit Cache in FotoKlassifikation), damit
// dasselbe Foto nicht bei jeder Runde erneut klassifiziert werden muss.
// Wird sowohl für den Belege/Dokumente-Filter als auch für die "Eigene
// Auswahl"-Quelle (siehe customSourceFilter.ts) genutzt, damit beide
// dieselbe Klassifikation wiederverwenden statt sie doppelt zu berechnen.
export async function classifyPhoto(fotoId: number, localUri: string): Promise<ImageLabel[]> {
  const cached = await getCachedClassification(fotoId);
  if (cached) return cached.labels;

  let labels: ImageLabel[] = [];
  try {
    labels = await classifyImage(localUri);
  } catch (error) {
    console.error('Bildklassifikation fehlgeschlagen:', error);
    return [];
  }

  await saveClassification(fotoId, { isJunk: isJunkLabels(labels), labels });
  return labels;
}

// Liefert zurück, ob ein Foto als Beleg/Dokument/Screenshot gilt und daher
// nicht ins Quiz soll.
export async function isJunkPhoto(fotoId: number, localUri: string): Promise<boolean> {
  const labels = await classifyPhoto(fotoId, localUri);
  return isJunkLabels(labels);
}

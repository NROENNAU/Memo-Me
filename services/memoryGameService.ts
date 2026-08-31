// Baut das Spielfeld für das Foto-Memory: pro Paar wird genau ein Foto der
// gewählten Quelle zweimal als Karte verwendet (klassisches Memory), statt
// wie beim früheren Pärchen-Quiz zwei verschiedene Fotos mit gemeinsamem
// Merkmal zu suchen - so lässt sich jede Fotoquelle nutzen, unabhängig davon,
// ob Ort/Personen-Tags vorhanden sind.
import { CandidatePhoto, listCandidatePhotos } from './mediaLibraryService';
import { PhotoSource } from '../types/PhotoSource';
import { shuffle } from './quizService';

export interface MemoryCardItem {
  id: string;
  uri: string;
  // Zwei Karten mit derselben pairId gehören zusammen.
  pairId: string;
}

// Nur quadratische, gerade Rastergrößen (damit sich das Foto-Set exakt in
// volle Paare aufteilen lässt) - von möglichst groß (mehr Fotos, mehr
// Herausforderung) bis zur kleinsten spielbaren Größe.
const CANDIDATE_GRID_SIZES = [8, 6, 4, 2];
// Unterhalb dieser Kantenlänge pro Karte wird ein Feld zu klein zum sicheren
// Antippen bzw. zum Erkennen des Fotos. Bewusst niedriger als der übliche
// MIN_TOUCH_TARGET (44) plus Puffer: ein Fehltipp deckt hier nur die falsche
// Karte auf statt eine andere Aktion auszulösen, daher verträgt das Raster
// etwas kleinere Felder zugunsten von mehr Fotos auf einen Blick.
const MIN_CARD_SIZE = 52;
// Größtmögliches Raster (8x8 = 32 Paare) - mehr Fotos werden gar nicht erst geholt.
const MAX_PAIR_COUNT = (CANDIDATE_GRID_SIZES[0] * CANDIDATE_GRID_SIZES[0]) / 2;

// Holt einen Foto-Pool, groß genug für das größtmögliche Raster - Grundlage
// dafür, sowohl die tatsächlich verfügbare Fotoanzahl zu kennen (siehe
// chooseMemoryGridSize) als auch direkt daraus die Karten zu bauen.
export async function fetchMemoryPhotoPool(source: PhotoSource): Promise<CandidatePhoto[]> {
  return listCandidatePhotos(source, MAX_PAIR_COUNT);
}

// Wählt die größte Rastergröße (Kanten NxN), die sowohl auf den verfügbaren
// Platz passt als auch genug unterschiedliche Fotos hat - "so viele Bilder
// wie möglich", aber nie kleiner als für ein noch angenehm antippbares Feld.
// Gibt null zurück, wenn nicht einmal für die kleinste Größe (2x2) genug
// Fotos oder Platz da sind.
export function chooseMemoryGridSize(availableWidth: number, gapSize: number, availablePhotoCount: number): number | null {
  for (const gridSize of CANDIDATE_GRID_SIZES) {
    const pairCount = (gridSize * gridSize) / 2;
    if (pairCount > availablePhotoCount) continue;
    const cardSize = (availableWidth - (gridSize - 1) * gapSize) / gridSize;
    if (cardSize >= MIN_CARD_SIZE) return gridSize;
  }
  return null;
}

// Baut aus einem schon geladenen Foto-Pool die gemischten Kartenpaare für
// die gegebene Rastergröße (siehe chooseMemoryGridSize).
export function buildMemoryCards(photoPool: CandidatePhoto[], gridSize: number): MemoryCardItem[] {
  const pairCount = (gridSize * gridSize) / 2;
  const chosen = shuffle(photoPool).slice(0, pairCount);

  const cards: MemoryCardItem[] = chosen.flatMap((photo) => [
    { id: `${photo.assetId}-a`, uri: photo.uri, pairId: photo.assetId },
    { id: `${photo.assetId}-b`, uri: photo.uri, pairId: photo.assetId },
  ]);

  return shuffle(cards);
}

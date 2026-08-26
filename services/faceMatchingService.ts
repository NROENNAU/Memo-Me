// Nutzt die on-device Gesichtserkennung (modules/face-recognition), um eine
// einmal über die "Wer ist das?"-Frage benannte Person auf anderen Fotos
// wiederzufinden. Wirkt nur auf iOS (supportsFaceMatching) - auf Android
// bleibt das ein no-op, da es dort keine eingebaute Wiedererkennung
// zwischen Fotos gibt (siehe Modul-Beschreibung).
import { compareFaceEmbeddings, detectFaces, supportsFaceMatching } from '../modules/face-recognition/src';
import { getNamedFaces, NamedFace, saveNamedFace } from '../db/faceRepository';
import { extractRawWords } from './customSourceFilter';

// Empirisch gewählter Schwellenwert für "gleiche Person" bei
// VNFeaturePrintObservation.computeDistance - Apple gibt dafür keinen
// offiziellen Wert vor (kleinere Distanz = ähnlicher). Muss ggf. anhand
// echter Nutzung nachjustiert werden.
const FACE_MATCH_DISTANCE_THRESHOLD = 0.6;

export interface CaptureFacesResult {
  saved: boolean;
  facesDetected: number;
}

// Merkt sich zusätzlich zum Namen (siehe savePhotoTags) einen
// Gesichts-Fingerabdruck des größten erkannten Gesichts auf dem Foto, damit
// dieselbe Person später auf anderen Fotos wiedergefunden werden kann.
// Liefert Diagnose-Infos zurück (wie viele Gesichter erkannt wurden, ob
// gespeichert wurde), damit sich Ausbleiben eines Treffers nachvollziehen lässt.
export async function captureNamedFaces(
  fotoId: number,
  photoUri: string,
  names: string[]
): Promise<CaptureFacesResult> {
  if (!supportsFaceMatching || names.length === 0) return { saved: false, facesDetected: 0 };

  const faces = await detectFaces(photoUri);
  const largestFace = faces
    .filter((face) => face.embedding !== null)
    .sort((a, b) => b.boundingBox.width * b.boundingBox.height - a.boundingBox.width * a.boundingBox.height)[0];
  if (!largestFace?.embedding) return { saved: false, facesDetected: faces.length };

  for (const name of names) {
    await saveNamedFace(fotoId, name, largestFace.embedding);
  }
  return { saved: true, facesDetected: faces.length };
}

// Prüft, ob ein Foto ein Gesicht enthält, das zu einem der übergebenen,
// bereits bekannten Gesichter passt.
export async function matchesNamedFace(photoUri: string, targets: NamedFace[]): Promise<boolean> {
  if (!supportsFaceMatching || targets.length === 0) return false;

  const faces = await detectFaces(photoUri);
  const embeddings = faces
    .map((face) => face.embedding)
    .filter((embedding): embedding is string => embedding !== null);
  if (embeddings.length === 0) return false;

  for (const embedding of embeddings) {
    for (const target of targets) {
      const distance = await compareFaceEmbeddings(embedding, target.embedding);
      if (distance < FACE_MATCH_DISTANCE_THRESHOLD) return true;
    }
  }
  return false;
}

// Lädt alle bekannten, benannten Gesichter und filtert sie auf die, deren
// Name zur Beschreibung passt (z. B. "Daria" in "Bilder von Daria am
// Strand") - das sind die einzigen, gegen die es sich lohnt, Fotos
// abzugleichen.
export async function findTargetFacesForDescription(description: string): Promise<NamedFace[]> {
  if (!supportsFaceMatching) return [];

  const namedFaces = await getNamedFaces();
  const words = extractRawWords(description);
  return namedFaces.filter((face) => {
    const normalizedName = face.name.toLowerCase();
    return words.some((word) => normalizedName.includes(word) || word.includes(normalizedName));
  });
}

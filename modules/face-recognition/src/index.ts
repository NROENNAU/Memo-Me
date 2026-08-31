import { Platform } from 'react-native';
import FaceRecognitionModule from './FaceRecognitionModule';
import { DetectedFace } from './FaceRecognition.types';

export { DetectedFace, FaceBoundingBox } from './FaceRecognition.types';

// Erkennt Gesichter in einem Foto komplett on-device (Apple Vision auf iOS,
// Google ML Kit auf Android) und berechnet dort, wo möglich, gleich einen
// vergleichbaren "Fingerabdruck" (embedding) für jedes Gesicht. `localUri`
// muss ein lokal lesbarer Dateipfad sein (z. B. `file://...`), keine
// `ph://`-Referenz.
export async function detectFaces(localUri: string): Promise<DetectedFace[]> {
  return FaceRecognitionModule.detectFaces(localUri);
}

// Vergleicht zwei Gesichts-Fingerabdrücke: je kleiner der Rückgabewert,
// desto wahrscheinlicher dieselbe Person. Nur auf iOS sinnvoll aufrufbar -
// auf Android gibt es aktuell keine Embeddings zum Vergleichen (siehe
// Modul-Beschreibung), dort sollte diese Funktion gar nicht erst gerufen werden.
export async function compareFaceEmbeddings(embeddingA: string, embeddingB: string): Promise<number> {
  return FaceRecognitionModule.compareFaceEmbeddings(embeddingA, embeddingB);
}

// Ob auf dieser Plattform ein echter Gesichts-Fingerabdruck-Vergleich
// möglich ist. Aktuell nur iOS (Apples Vision-Framework); Android bräuchte
// dafür ein eigenes, mitgeliefertes Wiedererkennungs-Modell.
export const supportsFaceMatching = Platform.OS === 'ios';

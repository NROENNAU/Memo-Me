import ImageClassifierModule from './ImageClassifierModule';
import { ImageLabel } from './ImageClassifier.types';

export { ImageLabel };

// Klassifiziert ein einzelnes Foto komplett auf dem Gerät (Apple Vision auf
// iOS, Google ML Kit Image Labeling auf Android - beide ohne Cloud-Zugriff,
// ohne eigenes Modell). `localUri` muss ein lokal lesbarer Dateipfad sein
// (z. B. `file://...`), keine `ph://`-Referenz.
export async function classifyImage(localUri: string): Promise<ImageLabel[]> {
  return ImageClassifierModule.classifyImage(localUri);
}

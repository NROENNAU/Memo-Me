// Entscheidet, ob und wonach die App zwischendurch im Quiz fragen soll, statt
// immer dieselbe feste Frage am Anfang jeder Runde zu stellen. Die Fragen
// tauchen an zufälligen Punkten während des Quiz auf; welche Frage gestellt
// wird, hängt davon ab, was zu einem Foto noch fehlt - so "entscheidet" die
// App selbst, was sie als Nächstes lernen möchte.
import { getMemoryForPhoto } from '../db/memoryRepository';
import { getPhotoTags } from '../db/photoRepository';
import { detectFaces } from '../modules/face-recognition/src';
import { DetectedFace } from '../modules/face-recognition/src';

export type CuriosityQuestionKind = 'story' | 'who';

export interface CuriosityQuestion {
  kind: CuriosityQuestionKind;
  heading: string;
  subtitle: string;
  placeholder: string;
  allowVoice: boolean;
  // Nur bei kind "who": die einzelnen erkannten Gesichter auf dem Foto, nach
  // denen nacheinander gefragt wird (siehe PhotoSwipeScreen) - so ist immer
  // eindeutig, welcher Name zu welchem Gesicht gehört, auch wenn mehrere
  // Personen auf demselben Foto zu sehen sind.
  faces?: DetectedFace[];
}

const QUESTIONS: Record<CuriosityQuestionKind, Omit<CuriosityQuestion, 'faces'>> = {
  story: {
    kind: 'story',
    heading: 'Kurze Frage zwischendurch',
    subtitle: 'Erzähl uns etwas zu diesem Foto – ein Name, eine kleine Geschichte.',
    placeholder: 'Erzähl uns etwas …',
    allowVoice: true,
  },
  who: {
    kind: 'who',
    heading: 'Kurze Frage zwischendurch',
    subtitle: 'Wer ist das?',
    placeholder: 'Name eingeben',
    // Für die Wer-Frage werden strukturierte Namen gebraucht - eine
    // Sprachnachricht ließe sich ohne Spracherkennung nicht dafür auswerten.
    allowVoice: false,
  },
};

// Wahrscheinlichkeit, nach einer beantworteten Quizfrage eine Wissensfrage
// einzuschieben, statt direkt zum nächsten Foto zu wechseln.
const INTERJECTION_CHANCE = 0.35;

export function shouldInterject(): boolean {
  return Math.random() < INTERJECTION_CHANCE;
}

// Prüft, was zu einem Foto noch fehlt, und liefert die passende Frage dafür -
// oder null, wenn zu diesem Foto bereits alles bekannt ist, wonach die App
// aktuell fragen könnte. Für die "Wer ist das?"-Frage wird vorher geprüft,
// ob überhaupt ein Gesicht im Foto erkennbar ist - sonst käme dabei nie ein
// brauchbares Ergebnis heraus (siehe faces-Feld).
export async function pickCuriosityQuestion(fotoId: number, photoUri: string): Promise<CuriosityQuestion | null> {
  const memory = await getMemoryForPhoto(fotoId);
  if (!memory) return QUESTIONS.story;

  const tags = await getPhotoTags(fotoId);
  if (tags) return null;

  const faces = await detectFaces(photoUri).catch(() => []);
  if (faces.length === 0) return null;

  return { ...QUESTIONS.who, faces };
}

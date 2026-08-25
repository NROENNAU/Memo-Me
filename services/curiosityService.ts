// Entscheidet, ob und wonach die App zwischendurch im Quiz fragen soll, statt
// immer dieselbe feste Frage am Anfang jeder Runde zu stellen. Die Fragen
// tauchen an zufälligen Punkten während des Quiz auf; welche Frage gestellt
// wird, hängt davon ab, was zu einem Foto noch fehlt - so "entscheidet" die
// App selbst, was sie als Nächstes lernen möchte.
import { getMemoryForPhoto } from '../db/memoryRepository';
import { getPhotoTags } from '../db/photoRepository';

export type CuriosityQuestionKind = 'story' | 'who';

export interface CuriosityQuestion {
  kind: CuriosityQuestionKind;
  heading: string;
  subtitle: string;
  placeholder: string;
  allowVoice: boolean;
}

const QUESTIONS: Record<CuriosityQuestionKind, CuriosityQuestion> = {
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
    subtitle: 'Wer ist auf diesem Foto zu sehen?',
    placeholder: 'z. B. Namen durch Komma getrennt',
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
// aktuell fragen könnte.
export async function pickCuriosityQuestion(fotoId: number): Promise<CuriosityQuestion | null> {
  const memory = await getMemoryForPhoto(fotoId);
  if (!memory) return QUESTIONS.story;

  const tags = await getPhotoTags(fotoId);
  if (!tags) return QUESTIONS.who;

  return null;
}

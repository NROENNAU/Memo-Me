// Erzeugt Quizfragen aus einem Foto: "Wann" (Aufnahmejahr), "Wo" (Ortsname),
// "Wer" (hinterlegte Personen-Tags) und "Erinnerung" (welche selbst erzählte
// Geschichte zu diesem Foto gehört) - jeweils mit drei plausiblen, aber
// falschen Optionen.
import { LibraryPhoto } from '../types/Photo';

export interface WannQuestion {
  correctYear: number;
  options: number[];
}

export interface WoQuestion {
  correctPlace: string;
  options: string[];
}

export interface WerQuestion {
  correctName: string;
  options: string[];
}

export interface ErinnerungQuestion {
  correctText: string;
  options: string[];
}

// Wird nur als Auffüller genutzt, wenn eine Quizrunde zu wenige Fotos mit
// unterschiedlichen echten Orten enthält (in der Praxis häufig, da viele
// Fotos – Screenshots, Downloads – gar keinen GPS-Ort besitzen).
const FALLBACK_PLACES = [
  'Berlin, Deutschland',
  'Hamburg, Deutschland',
  'München, Deutschland',
  'Köln, Deutschland',
  'Paris, Frankreich',
  'Wien, Österreich',
  'Rom, Italien',
  'Barcelona, Spanien',
  'Amsterdam, Niederlande',
  'Zürich, Schweiz',
];

// Auffüller für die "Wer"-Frage, falls die Runde noch zu wenige echte
// Personen-Tags aus anderen Fotos für plausible Ablenker enthält.
const FALLBACK_NAMES = ['Anna', 'Max', 'Lisa', 'Tom', 'Sophie', 'Paul', 'Julia', 'Ben'];

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Gibt null zurück, wenn das Foto kein Aufnahmedatum hat – dann kann keine
// "Wann"-Frage gestellt werden.
export function buildWannQuestion(photo: LibraryPhoto): WannQuestion | null {
  if (!photo.creationTime) return null;
  const correctYear = new Date(photo.creationTime).getFullYear();

  const wrongYears: number[] = [];
  for (const offset of shuffle([-3, -2, -1, 1, 2, 3])) {
    const candidate = correctYear + offset;
    if (!wrongYears.includes(candidate)) wrongYears.push(candidate);
    if (wrongYears.length === 3) break;
  }

  return { correctYear, options: shuffle([correctYear, ...wrongYears]) };
}

// Baut die "Wo"-Frage aus dem echten Ortsnamen des Fotos, ergänzt um andere
// Ortsnamen aus derselben Quizrunde als Ablenker. Reichen die echten
// Ablenker-Orte nicht aus, wird mit plausiblen Städtenamen aufgefüllt. Gibt
// nur null zurück, wenn gar kein Ortsname für das Foto bekannt ist.
export function buildWoQuestion(correctPlace: string | null, otherPlaces: string[]): WoQuestion | null {
  if (!correctPlace) return null;

  const realDistractors = otherPlaces.filter((place) => place !== correctPlace);
  const fallbackDistractors = FALLBACK_PLACES.filter((place) => place !== correctPlace);
  const distractorPool = Array.from(new Set([...realDistractors, ...fallbackDistractors]));

  const wrongPlaces = shuffle(distractorPool).slice(0, 3);
  return { correctPlace, options: shuffle([correctPlace, ...wrongPlaces]) };
}

// Baut die "Wer"-Frage aus den zu einem Foto hinterlegten Personen-Tags
// (siehe curiosityService). Ablenker kommen zuerst aus den Tags anderer
// Fotos der Runde, bei Bedarf aufgefüllt mit plausiblen Platzhalternamen.
// Gibt null zurück, wenn das Foto noch keine Personen-Tags hat.
export function buildWerQuestion(correctNames: string[] | null, otherNames: string[]): WerQuestion | null {
  if (!correctNames || correctNames.length === 0) return null;
  const correctName = correctNames[0];

  const realDistractors = otherNames.filter((name) => !correctNames.includes(name));
  const fallbackDistractors = FALLBACK_NAMES.filter((name) => !correctNames.includes(name));
  const distractorPool = Array.from(new Set([...realDistractors, ...fallbackDistractors]));

  const wrongNames = shuffle(distractorPool).slice(0, 3);
  return { correctName, options: shuffle([correctName, ...wrongNames]) };
}

// Die Antwort-Buttons sind für kurze Antworten (Jahr, Ort, Name) gebaut,
// nicht für ganze Erinnerungstexte - deshalb wird auf eine lesbare Länge
// gekürzt, bevor eine Erinnerung als Option angezeigt wird.
const MAX_ERINNERUNG_PREVIEW_LENGTH = 40;

function previewErinnerungText(text: string): string {
  const trimmed = text.trim();
  return trimmed.length > MAX_ERINNERUNG_PREVIEW_LENGTH
    ? `${trimmed.slice(0, MAX_ERINNERUNG_PREVIEW_LENGTH - 1)}…`
    : trimmed;
}

// Baut eine Frage aus der zu einem Foto erzählten Erinnerung: welche der
// vier Geschichten passt zu diesem Foto? Nutzt bewusst nur echte Erinnerungen
// anderer Fotos als Ablenker (keine erfundenen Platzhalter-Geschichten) -
// deshalb null, wenn die Runde noch keine drei anderen Erinnerungen enthält.
export function buildErinnerungQuestion(correctText: string | null, otherTexts: string[]): ErinnerungQuestion | null {
  if (!correctText) return null;
  const correctPreview = previewErinnerungText(correctText);

  const distractorPool = Array.from(
    new Set(otherTexts.map(previewErinnerungText).filter((text) => text !== correctPreview))
  );
  if (distractorPool.length < 3) return null;

  const wrongTexts = shuffle(distractorPool).slice(0, 3);
  return { correctText: correctPreview, options: shuffle([correctPreview, ...wrongTexts]) };
}

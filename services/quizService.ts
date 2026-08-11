// Erzeugt Quizfragen aus einem Foto: "Wann" (Aufnahmejahr) und "Wo"
// (Ortsname), jeweils mit drei plausiblen, aber falschen Optionen.
import { LibraryPhoto } from '../types/Photo';

export interface WannQuestion {
  correctYear: number;
  options: number[];
}

export interface WoQuestion {
  correctPlace: string;
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

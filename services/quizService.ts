// Erzeugt Quizfragen aus einem Foto: "Wann" (Aufnahmejahr), "Wo" (Ortsname),
// "Wer" (hinterlegte Personen-Tags) und "Erinnerung" (welche selbst erzählte
// Geschichte zu diesem Foto gehört) - jeweils mit drei plausiblen, aber
// falschen Optionen. Dazu ein Puzzle (Foto in Teile zerlegt wieder
// zusammensetzen) und eine Bilderauswahl (ältestes/neuestes Foto oder das
// zu einem Ort passende/nicht passende Foto antippen).
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

export interface PuzzleQuestion {
  photoUri: string;
  gridSize: number;
}

// Das Puzzle braucht nur ein Foto - geht also praktisch immer. Die
// Raster-Größe (Zeilen/Spalten) kommt aus den Nutzereinstellungen (siehe
// db/profileRepository.ts), da 3x3 (9 Teile) für den Einstieg zu schwer ist.
export function buildPuzzleQuestion(photo: LibraryPhoto, gridSize: number): PuzzleQuestion {
  return { photoUri: photo.uri, gridSize };
}

// Eine Frage, bei der eines von mehreren Fotos angetippt werden muss (statt
// Text-Optionen) - für "ältestes/neuestes Foto" und "Foto aus/nicht aus
// einem Ort". Die Distraktor-Fotos kommen bewusst aus einem separaten
// Reservoir statt aus den anderen Fotos derselben Quizrunde (siehe
// PhotoSwipeScreen) - sonst würde ein Foto, das an anderer Stelle im Quiz
// noch als eigene Frage drankommt, hier schon vorher gezeigt.
export interface PhotoChoiceQuestion {
  prompt: string;
  // Foto-URIs in zufälliger Anzeige-Reihenfolge.
  options: string[];
  correctUri: string;
}

// Wie viele Fotos zur Auswahl stehen.
const PHOTO_CHOICE_ITEM_COUNT = 4;

interface DateCandidate {
  uri: string;
  creationTime: number | null;
}

// Baut die Frage "Welches Foto ist das älteste/neueste?" aus dem aktuellen
// Foto und ein paar weiteren, noch nirgends im Quiz gezeigten Fotos mit
// bekanntem Aufnahmedatum. Gibt null zurück, wenn noch nicht genug solcher
// Fotos zur Verfügung stehen.
export function buildDateExtremeQuestion(
  currentPhoto: DateCandidate,
  otherPhotos: DateCandidate[],
  variant: 'oldest' | 'newest'
): PhotoChoiceQuestion | null {
  if (!currentPhoto.creationTime) return null;

  const validOthers = otherPhotos.filter(
    (photo) => photo.creationTime !== null && photo.uri !== currentPhoto.uri
  );
  if (validOthers.length < PHOTO_CHOICE_ITEM_COUNT - 1) return null;

  const chosenOthers = shuffle(validOthers).slice(0, PHOTO_CHOICE_ITEM_COUNT - 1);
  const all = [currentPhoto, ...chosenOthers];
  const sorted = [...all].sort((a, b) => (a.creationTime as number) - (b.creationTime as number));
  const correct = variant === 'oldest' ? sorted[0] : sorted[sorted.length - 1];

  return {
    prompt: variant === 'oldest' ? 'Welches Foto ist das älteste?' : 'Welches Foto ist das neueste?',
    options: shuffle(all.map((photo) => photo.uri)),
    correctUri: correct.uri,
  };
}

interface LocationCandidate {
  uri: string;
  locationName: string | null;
}

// Baut die Frage "Welches Foto ist aus <Ort>?" (variant "match") bzw.
// "Welches Foto ist NICHT aus <Ort>?" (variant "mismatch"). Sucht dafür den
// unter den Kandidaten häufigsten Ort als "Mehrheitsort" und ein Foto mit
// einem anderen Ort als Ausreißer. Gibt null zurück, wenn es keine
// eindeutige Mehrheit mit mindestens einem abweichenden Ort gibt.
export function buildLocationChoiceQuestion(
  candidates: LocationCandidate[],
  variant: 'match' | 'mismatch'
): PhotoChoiceQuestion | null {
  const withLocation = candidates.filter(
    (candidate): candidate is { uri: string; locationName: string } => candidate.locationName !== null
  );
  if (withLocation.length < PHOTO_CHOICE_ITEM_COUNT) return null;

  const groups = new Map<string, { uri: string; locationName: string }[]>();
  for (const candidate of withLocation) {
    const group = groups.get(candidate.locationName) ?? [];
    group.push(candidate);
    groups.set(candidate.locationName, group);
  }

  const [majorityPlace, majorityItems] = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length)[0];
  const minorityCandidates = withLocation.filter((candidate) => candidate.locationName !== majorityPlace);
  if (majorityItems.length < PHOTO_CHOICE_ITEM_COUNT - 1 || minorityCandidates.length === 0) return null;

  const oddOne = shuffle(minorityCandidates)[0];
  const sameGroupOthers = shuffle(majorityItems).slice(0, PHOTO_CHOICE_ITEM_COUNT - 1);
  const all = shuffle([oddOne, ...sameGroupOthers]);

  return {
    prompt:
      variant === 'mismatch'
        ? `Welches Foto ist NICHT aus „${majorityPlace}“?`
        : `Welches Foto ist aus „${oddOne.locationName}“?`,
    options: all.map((candidate) => candidate.uri),
    correctUri: oddOne.uri,
  };
}

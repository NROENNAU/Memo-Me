// Erzeugt Quizfragen aus einem Foto: "Wann" (Aufnahmejahr), "Wo" (Ortsname),
// "Wer" (hinterlegte Personen-Tags) und "Erinnerung" (welche selbst erzählte
// Geschichte zu diesem Foto gehört) - jeweils mit drei plausiblen, aber
// falschen Optionen. Dazu ein Puzzle (Foto in Teile zerlegt wieder
// zusammensetzen), eine Bilderauswahl (ältestes/neuestes Foto oder das zu
// einem Ort passende/nicht passende Foto antippen), ein Pärchen-Memory
// (Fotos mit gemeinsamem Merkmal finden), eine Zuordnung (Fotos und Namen
// verbinden), eine Karten-Schätzfrage (Aufnahmeort auf der Weltkarte
// antippen) und ein Jahres-Regler (Jahr per Schieberegler schätzen).
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

// Karten-Schätzfrage: der Aufnahmeort eines Fotos soll auf einer Weltkarte
// angetippt werden. Gibt null zurück, wenn das Foto keine GPS-Koordinaten hat.
export interface KarteQuestion {
  photoUri: string;
  targetLatitude: number;
  targetLongitude: number;
}

export function buildKarteQuestion(photo: LibraryPhoto): KarteQuestion | null {
  if (!photo.coordinates) return null;
  return {
    photoUri: photo.uri,
    targetLatitude: photo.coordinates.latitude,
    targetLongitude: photo.coordinates.longitude,
  };
}

// Jahres-Regler: das Aufnahmejahr per Schieberegler statt per Multiple-Choice
// schätzen. Der Regler deckt einen Bereich um das echte Jahr ab.
export interface WannReglerQuestion {
  correctYear: number;
  minYear: number;
  maxYear: number;
}

const WANN_REGLER_SPREAD_YEARS = 6;

export function buildWannReglerQuestion(photo: LibraryPhoto): WannReglerQuestion | null {
  if (!photo.creationTime) return null;
  const correctYear = new Date(photo.creationTime).getFullYear();
  return {
    correctYear,
    minYear: correctYear - WANN_REGLER_SPREAD_YEARS,
    maxYear: correctYear + WANN_REGLER_SPREAD_YEARS,
  };
}

// Pärchen-Memory: mehrere zugedeckte Karten, von denen je zwei ein
// gemeinsames Merkmal teilen (gleiches Jahr, gleicher Ort oder gleiche
// Person) statt identischer Bilder - das Merkmal wird beim Aufdecken
// angezeigt und muss sich gemerkt werden.
export interface MemoryCard {
  uri: string;
  // Der beim Aufdecken angezeigte Text (Jahr, Ort oder Name).
  attributeLabel: string;
  // Zwei Karten mit demselben groupKey bilden ein Pärchen.
  groupKey: string;
}

export interface PaarchenQuestion {
  // Bereits gemischt.
  cards: MemoryCard[];
}

interface MemoryCandidate {
  uri: string;
  locationName: string | null;
  creationTime: number | null;
  tags: string[] | null;
}

const MEMORY_MIN_PAIRS = 2;
const MEMORY_MAX_PAIRS = 4;

// Baut die Pärchen-Frage aus einem Kandidatenpool (siehe Reservoir in
// PhotoSwipeScreen) - gruppiert nach Jahr, Ort und Person, wählt daraus
// bis zu MEMORY_MAX_PAIRS Gruppen mit mindestens zwei Mitgliedern, wobei
// kein Foto in mehr als einem Pärchen landet. Gibt null zurück, wenn nicht
// mindestens MEMORY_MIN_PAIRS vollständige Pärchen zusammenkommen.
export function buildPaarchenQuestion(candidates: MemoryCandidate[]): PaarchenQuestion | null {
  const groups = new Map<string, { uri: string; label: string }[]>();

  function addToGroup(key: string, label: string, uri: string) {
    const group = groups.get(key) ?? [];
    group.push({ uri, label });
    groups.set(key, group);
  }

  for (const candidate of candidates) {
    if (candidate.creationTime) {
      const year = new Date(candidate.creationTime).getFullYear();
      addToGroup(`jahr:${year}`, String(year), candidate.uri);
    }
    if (candidate.locationName) {
      addToGroup(`ort:${candidate.locationName}`, candidate.locationName, candidate.uri);
    }
    for (const tag of candidate.tags ?? []) {
      addToGroup(`person:${tag}`, tag, candidate.uri);
    }
  }

  const eligibleGroups = shuffle(Array.from(groups.entries()).filter(([, members]) => members.length >= 2));

  const usedUris = new Set<string>();
  const cards: MemoryCard[] = [];
  let pairCount = 0;

  for (const [groupKey, members] of eligibleGroups) {
    if (pairCount >= MEMORY_MAX_PAIRS) break;
    const available = members.filter((member) => !usedUris.has(member.uri));
    // Ein Merkmal kann mehrfach denselben Wert haben (z. B. drei Fotos aus
    // demselben Jahr) - trotzdem pro Foto nur eine Karte, sonst könnte ein
    // Foto sein eigenes Pärchen bilden.
    const distinctByUri = Array.from(new Map(available.map((member) => [member.uri, member])).values());
    if (distinctByUri.length < 2) continue;

    const [first, second] = shuffle(distinctByUri).slice(0, 2);
    usedUris.add(first.uri);
    usedUris.add(second.uri);
    cards.push({ uri: first.uri, attributeLabel: first.label, groupKey });
    cards.push({ uri: second.uri, attributeLabel: second.label, groupKey });
    pairCount += 1;
  }

  if (pairCount < MEMORY_MIN_PAIRS) return null;
  return { cards: shuffle(cards) };
}

// Zuordnung: mehrere Fotos und die dazugehörigen Namen gleichzeitig zeigen,
// per Antippen verbinden lassen.
export interface MatchPair {
  uri: string;
  name: string;
}

export interface ZuordnungQuestion {
  pairs: MatchPair[];
}

const ZUORDNUNG_ITEM_COUNT = 4;
const ZUORDNUNG_MIN_ITEM_COUNT = 3;

interface ZuordnungCandidate {
  uri: string;
  tags: string[] | null;
}

// Baut die Zuordnungs-Frage aus einem Kandidatenpool mit hinterlegten
// Namen (siehe "Wer ist das?"). Nutzt pro Foto nur den ersten Namen, damit
// die Zuordnung eindeutig bleibt, und verlangt lauter unterschiedliche
// Namen (sonst wäre nicht klar, welches Foto zu welchem gehört). Gibt null
// zurück, wenn nicht mindestens ZUORDNUNG_MIN_ITEM_COUNT solcher Fotos mit
// eindeutigem Namen zusammenkommen.
export function buildZuordnungQuestion(candidates: ZuordnungCandidate[]): ZuordnungQuestion | null {
  const named = candidates
    .filter((candidate) => candidate.tags && candidate.tags.length > 0)
    .map((candidate) => ({ uri: candidate.uri, name: (candidate.tags as string[])[0] }));

  const seenNames = new Set<string>();
  const uniqueByName = named.filter((candidate) => {
    if (seenNames.has(candidate.name)) return false;
    seenNames.add(candidate.name);
    return true;
  });

  if (uniqueByName.length < ZUORDNUNG_MIN_ITEM_COUNT) return null;

  const pairs = shuffle(uniqueByName).slice(0, ZUORDNUNG_ITEM_COUNT);
  return { pairs };
}

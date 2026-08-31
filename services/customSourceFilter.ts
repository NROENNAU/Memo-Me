// Prüft, ob ein Foto zu einer frei eingegebenen Beschreibung passt (Quelle
// "Eigene Auswahl"). Zwei Ebenen: zuerst ein schneller Abgleich gegen Daten,
// die die App selbst schon über ein Foto weiß (Personen-Tags aus den
// Wissensfragen, aufgelöster Ortsname) - kein ML nötig, quasi instantan.
// Erst wenn das nichts ergibt, greift der langsamere Abgleich gegen die
// on-device Bildklassifikation (siehe junkPhotoFilter.ts). Kein
// Cloud-Zugriff, kein eigenes Sprachmodell. Da die erkannten Labels auf
// Englisch sind, eine häufig getippte deutsche Beschreibung aber nicht, gibt
// es zusätzlich eine kleine, feste Übersetzungstabelle für gängige
// Suchbegriffe. Das ist eine einfache Schlagwort-Suche, kein echtes
// Sprachverständnis - unübliche Formulierungen werden entsprechend seltener treffen.
import { ImageLabel } from '../modules/image-classifier/src';

const GERMAN_TO_ENGLISH: Record<string, string> = {
  hund: 'dog',
  hunde: 'dog',
  katze: 'cat',
  katzen: 'cat',
  tier: 'animal',
  tiere: 'animal',
  strand: 'beach',
  meer: 'sea',
  see: 'lake',
  berg: 'mountain',
  berge: 'mountain',
  wald: 'forest',
  natur: 'nature',
  landschaft: 'landscape',
  himmel: 'sky',
  schnee: 'snow',
  urlaub: 'vacation',
  reise: 'travel',
  auto: 'car',
  essen: 'food',
  kuchen: 'cake',
  party: 'party',
  geburtstag: 'birthday',
  hochzeit: 'wedding',
  weihnachten: 'christmas',
  blume: 'flower',
  blumen: 'flower',
  baum: 'tree',
  bäume: 'tree',
  kind: 'child',
  kinder: 'child',
  baby: 'baby',
  familie: 'family',
  freunde: 'people',
  menschen: 'people',
  person: 'person',
  gebäude: 'building',
  haus: 'building',
  stadt: 'city',
  sonnenuntergang: 'sunset',
  fahrrad: 'bicycle',
  sport: 'sport',
  garten: 'garden',
};

const STOPWORDS = new Set([
  'der',
  'die',
  'das',
  'den',
  'dem',
  'des',
  'ein',
  'eine',
  'einen',
  'einem',
  'einer',
  'und',
  'oder',
  'mit',
  'von',
  'zu',
  'im',
  'in',
  'am',
  'auf',
  'für',
  'meinem',
  'meiner',
  'meine',
  'mein',
  'fotos',
  'foto',
  'bilder',
  'bild',
]);

// Zerlegt die Beschreibung in Suchbegriffe (deutsch + übersetzt, falls
// bekannt), damit sowohl "Hund" als auch "dog" im Label erkannt wird.
function extractSearchTerms(description: string): string[] {
  const words = description
    .toLowerCase()
    .split(/[^a-zäöüß]+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));

  const terms = new Set<string>();
  for (const word of words) {
    terms.add(word);
    // Teilstring-Vergleich statt exaktem Treffer, da deutsche Komposita
    // (z. B. "Hundebilder", "Strandfotos") das Suchwort selten isoliert
    // enthalten.
    for (const [german, english] of Object.entries(GERMAN_TO_ENGLISH)) {
      if (word.includes(german)) terms.add(english);
    }
  }
  return Array.from(terms);
}

// Zerlegt die Beschreibung in rohe Wörter ohne Übersetzung - für den
// Abgleich gegen selbst eingegebene Daten (Namen-Tags, Ortsnamen), wo eine
// Deutsch-Englisch-Übersetzung keinen Sinn ergibt.
export function extractRawWords(description: string): string[] {
  return description
    .toLowerCase()
    .split(/[^a-zäöüß]+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word));
}

// Prüft die Beschreibung gegen die zu einem Foto hinterlegten Personen-Tags
// (siehe curiosityService "Wer ist das?"). Deutlich zuverlässiger als die
// Bildklassifikation, wenn schon mal ein Name zu diesem Foto erfasst wurde.
export function matchesTags(tags: string[] | null, description: string): boolean {
  if (!tags || tags.length === 0) return false;
  const words = extractRawWords(description);
  return tags.some((tag) => {
    const normalizedTag = tag.toLowerCase();
    return words.some((word) => normalizedTag.includes(word) || word.includes(normalizedTag));
  });
}

// Prüft die Beschreibung gegen den bereits aufgelösten Ortsnamen eines
// Fotos (Reverse-Geocoding) - hilfreich für Ortsangaben wie "Italien" oder
// "Berlin", die die Bildklassifikation gar nicht erkennen könnte.
export function matchesLocation(locationName: string | null, description: string): boolean {
  if (!locationName) return false;
  const words = extractRawWords(description);
  const normalizedLocation = locationName.toLowerCase();
  return words.some((word) => normalizedLocation.includes(word));
}

const MIN_MATCH_CONFIDENCE = 0.3;
const MAX_LABELS_CHECKED = 8;

// Prüft, ob mindestens eines der erkannten Labels zu einem Suchbegriff aus
// der Beschreibung passt (Teilstring-Vergleich in beide Richtungen, damit
// z. B. "dogs" zu "dog" passt und umgekehrt).
export function matchesDescription(labels: ImageLabel[], description: string): boolean {
  const terms = extractSearchTerms(description);
  if (terms.length === 0) return true;

  return labels.slice(0, MAX_LABELS_CHECKED).some((label) => {
    if (label.confidence < MIN_MATCH_CONFIDENCE) return false;
    const identifier = label.identifier.toLowerCase();
    return terms.some((term) => identifier.includes(term) || term.includes(identifier));
  });
}

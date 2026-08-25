// Prüft, ob ein Foto zu einer frei eingegebenen Beschreibung passt (Quelle
// "Eigene Auswahl"). Nutzt dieselbe on-device Bildklassifikation wie der
// Belege/Dokumente-Filter (siehe junkPhotoFilter.ts) - kein Cloud-Zugriff,
// kein eigenes Sprachmodell. Da die erkannten Labels auf Englisch sind, eine
// häufig getippte deutsche Beschreibung aber nicht, wird zusätzlich eine
// kleine, feste Übersetzungstabelle für gängige Suchbegriffe genutzt. Das
// ist eine einfache Schlagwort-Suche, kein echtes Sprachverständnis -
// unübliche Formulierungen werden entsprechend seltener treffen.
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

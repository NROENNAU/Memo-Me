// SQL-Anweisungen zum Anlegen der lokalen Datenbank-Tabellen.
// "IF NOT EXISTS" sorgt dafür, dass beim erneuten App-Start nichts überschrieben wird.

// Tabelle "Fotos": ein Eintrag pro Foto aus der Gerätebibliothek, das im Quiz verwendet wird.
export const CREATE_FOTOS_TABLE = `
CREATE TABLE IF NOT EXISTS Fotos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uri TEXT NOT NULL,               -- anzeigbarer Pfad des Fotos (kann sich auf iOS zwischen Abrufen ändern!)
  asset_id TEXT,                   -- stabile Asset-ID aus der Mediathek – DAS ist der eindeutige Schlüssel
  timestamp INTEGER NOT NULL,      -- Aufnahmezeitpunkt (Unix-Millisekunden)
  location TEXT,                   -- Ort als Text, optional
  tags TEXT,                       -- Personen/Schlagwörter als JSON-Array-String, optional
  favorit INTEGER                  -- 1 = als Favorit markiert, NULL/0 = nicht markiert
);
`;

// Tabelle "QuizErgebnisse": ein Eintrag pro beantworteter Quizfrage.
export const CREATE_QUIZ_ERGEBNISSE_TABLE = `
CREATE TABLE IF NOT EXISTS QuizErgebnisse (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  foto_id INTEGER NOT NULL REFERENCES Fotos(id), -- Bezug zum abgefragten Foto
  frage_typ TEXT NOT NULL,                       -- 'WANN' | 'WO' | 'WER' | 'ERINNERUNG' | 'PUZZLE' | 'FOTO_AUSWAHL' | 'PAARCHEN' | 'ZUORDNUNG' | 'KARTE'
  richtig_beantwortet INTEGER NOT NULL,          -- 1 = richtig, 0 = falsch (SQLite kennt kein Boolean)
  punkte INTEGER,                                -- erzielte Punkte (siehe calculateAnswerPoints), NULL bei älteren Einträgen vor Einführung des Punktesystems
  datum INTEGER NOT NULL                         -- Zeitpunkt der Beantwortung (Unix-Millisekunden)
);
`;

// Tabelle "Erinnerungen": vom Nutzer selbst erzählte Geschichten/Namen zu
// einem Foto. Grundlage für persönlichere Quizfragen (z. B. eine spätere
// "Wer"-Frage), die mit der Zeit aus diesen Einträgen entstehen.
export const CREATE_ERINNERUNGEN_TABLE = `
CREATE TABLE IF NOT EXISTS Erinnerungen (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  foto_id INTEGER NOT NULL REFERENCES Fotos(id), -- Bezug zum erzählten Foto
  text TEXT NOT NULL,                            -- vom Nutzer eingegebene Geschichte/Name (leer, falls nur Audio)
  audio_uri TEXT,                                -- Pfad zu einer aufgenommenen Sprachnachricht, optional
  erstellt_am INTEGER NOT NULL                   -- Zeitpunkt der Eingabe (Unix-Millisekunden)
);
`;

// Tabelle "FotoAlben": welchem Album ein Foto zuletzt über die App zugeordnet
// wurde. Nötig, weil iOS (anders als Android) keine Album-Zugehörigkeit pro
// Foto über expo-media-library preisgibt – wir merken uns deshalb selbst,
// was über Memo-Me zugeordnet wurde.
export const CREATE_FOTO_ALBEN_TABLE = `
CREATE TABLE IF NOT EXISTS FotoAlben (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  foto_id INTEGER NOT NULL REFERENCES Fotos(id), -- Bezug zum zugeordneten Foto
  album_id TEXT NOT NULL,                        -- Album-ID in der Gerätemediathek
  album_titel TEXT NOT NULL,                     -- Albumname zum Zeitpunkt der Zuordnung
  zugeordnet_am INTEGER NOT NULL                 -- Zeitpunkt der Zuordnung (Unix-Millisekunden)
);
`;

// Tabelle "Profil": genau eine Zeile mit den persönlichen Einstellungen des
// Nutzers (Spitzname, Profilbild). Es gibt nur ein Profil pro Gerät, deshalb
// feste id = 1 statt AUTOINCREMENT.
export const CREATE_PROFIL_TABLE = `
CREATE TABLE IF NOT EXISTS Profil (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  spitzname TEXT,
  avatar_uri TEXT,
  timer_dauer INTEGER,        -- Sekunden pro Quizfrage, 0 = kein Timer
  puzzle_groesse INTEGER      -- Raster-Größe fürs Foto-Puzzle (z. B. 2 = 2x2, 3 = 3x3)
);
`;

// Tabelle "FotoKlassifikation": Cache für die on-device Bilderkennung, damit
// dasselbe Foto nicht bei jeder Quizrunde erneut klassifiziert werden muss.
// ist_muell markiert Screenshots/Belege/Dokumente, die nicht ins Quiz sollen.
export const CREATE_FOTO_KLASSIFIKATION_TABLE = `
CREATE TABLE IF NOT EXISTS FotoKlassifikation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  foto_id INTEGER NOT NULL UNIQUE REFERENCES Fotos(id),
  ist_muell INTEGER NOT NULL,      -- 1 = Screenshot/Beleg/Dokument, 0 = brauchbares Foto
  labels TEXT NOT NULL,            -- roh erkannte Labels als JSON, für spätere Nachjustierung
  klassifiziert_am INTEGER NOT NULL
);
`;

// Tabelle "Gesichter": Gesichts-"Fingerabdrücke" (embeddings), die einer vom
// Nutzer genannten Person zugeordnet sind. Entsteht, sobald jemand bei der
// "Wer ist das?"-Frage einen Namen einträgt – ermöglicht es danach, dieselbe
// Person per Gesichtserkennung auf anderen Fotos wiederzufinden. Nur auf iOS
// befüllt/genutzt (siehe supportsFaceMatching in modules/face-recognition),
// da Android aktuell keine Wiedererkennung zwischen Fotos anbietet.
export const CREATE_GESICHTER_TABLE = `
CREATE TABLE IF NOT EXISTS Gesichter (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  foto_id INTEGER NOT NULL REFERENCES Fotos(id), -- Foto, auf dem das Gesicht benannt wurde
  name TEXT NOT NULL,                            -- vom Nutzer eingegebener Name der Person
  embedding TEXT NOT NULL,                       -- Base64-kodierter Fingerabdruck (siehe compareFaceEmbeddings)
  erstellt_am INTEGER NOT NULL                   -- Zeitpunkt der Eingabe (Unix-Millisekunden)
);
`;

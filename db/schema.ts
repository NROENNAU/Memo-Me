// SQL-Anweisungen zum Anlegen der lokalen Datenbank-Tabellen.
// "IF NOT EXISTS" sorgt dafür, dass beim erneuten App-Start nichts überschrieben wird.

// Tabelle "Fotos": ein Eintrag pro Foto aus der Gerätebibliothek, das im Quiz verwendet wird.
export const CREATE_FOTOS_TABLE = `
CREATE TABLE IF NOT EXISTS Fotos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uri TEXT NOT NULL,               -- lokaler Datei-Pfad des Fotos
  timestamp INTEGER NOT NULL,      -- Aufnahmezeitpunkt (Unix-Millisekunden)
  location TEXT,                   -- Ort als Text, optional
  tags TEXT                        -- Personen/Schlagwörter als JSON-Array-String, optional
);
`;

// Tabelle "QuizErgebnisse": ein Eintrag pro beantworteter Quizfrage.
export const CREATE_QUIZ_ERGEBNISSE_TABLE = `
CREATE TABLE IF NOT EXISTS QuizErgebnisse (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  foto_id INTEGER NOT NULL REFERENCES Fotos(id), -- Bezug zum abgefragten Foto
  frage_typ TEXT NOT NULL,                       -- 'WANN' | 'WO' | 'WER'
  richtig_beantwortet INTEGER NOT NULL,          -- 1 = richtig, 0 = falsch (SQLite kennt kein Boolean)
  datum INTEGER NOT NULL                         -- Zeitpunkt der Beantwortung (Unix-Millisekunden)
);
`;

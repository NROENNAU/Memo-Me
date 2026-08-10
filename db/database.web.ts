// Web-Variante der lokalen Datenhaltung: Da expo-sqlite im Browser spezielle
// Server-Header braucht, die z. B. GitHub Pages nicht unterstützt, nutzen wir
// hier stattdessen den einfachen Browser-Speicher (localStorage). Diese Daten
// sind komplett getrennt von der SQLite-Datenbank der nativen App.
const FOTOS_KEY = 'memo-me:fotos';
const QUIZ_ERGEBNISSE_KEY = 'memo-me:quiz-ergebnisse';

// Auf Web gibt es keine echte Datenbank-Verbindung – Rückgabewert wird aktuell
// nirgends verwendet, daher genügt ein einfacher Platzhalter.
export function getDatabase(): null {
  return null;
}

// Legt die beiden "Tabellen" (als leere JSON-Arrays im localStorage) an,
// falls sie noch nicht existieren – entspricht CREATE TABLE IF NOT EXISTS.
export async function initDatabase(): Promise<void> {
  if (localStorage.getItem(FOTOS_KEY) === null) {
    localStorage.setItem(FOTOS_KEY, '[]');
  }
  if (localStorage.getItem(QUIZ_ERGEBNISSE_KEY) === null) {
    localStorage.setItem(QUIZ_ERGEBNISSE_KEY, '[]');
  }
}

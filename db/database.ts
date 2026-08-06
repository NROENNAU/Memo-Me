// Zentrales Modul für den Zugriff auf die lokale SQLite-Datenbank.
// Es gibt keine Cloud-Datenbank – alle Daten bleiben ausschließlich auf dem Gerät.
import * as SQLite from 'expo-sqlite';
import { CREATE_FOTOS_TABLE, CREATE_QUIZ_ERGEBNISSE_TABLE } from './schema';

const DATABASE_NAME = 'memo-me.db';

let db: SQLite.SQLiteDatabase | null = null;

// Öffnet die Datenbank (nur einmal) und gibt die Verbindung zurück.
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync(DATABASE_NAME);
  }
  return db;
}

// Legt die benötigten Tabellen an, falls sie noch nicht existieren.
// Wird einmalig beim App-Start aufgerufen.
export async function initDatabase(): Promise<void> {
  const database = getDatabase();
  await database.execAsync(CREATE_FOTOS_TABLE);
  await database.execAsync(CREATE_QUIZ_ERGEBNISSE_TABLE);
}

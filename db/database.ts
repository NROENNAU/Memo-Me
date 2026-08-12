// Zentrales Modul für den Zugriff auf die lokale SQLite-Datenbank.
// Es gibt keine Cloud-Datenbank – alle Daten bleiben ausschließlich auf dem Gerät.
import * as SQLite from 'expo-sqlite';
import {
  CREATE_FOTOS_TABLE,
  CREATE_QUIZ_ERGEBNISSE_TABLE,
  CREATE_ERINNERUNGEN_TABLE,
  CREATE_FOTO_ALBEN_TABLE,
  CREATE_PROFIL_TABLE,
} from './schema';

const DATABASE_NAME = 'memo-me.db';

let db: SQLite.SQLiteDatabase | null = null;

// Öffnet die Datenbank (nur einmal) und gibt die Verbindung zurück.
export function getDatabase(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync(DATABASE_NAME);
  }
  return db;
}

// Ergänzt eine Spalte in einer bereits bestehenden Tabelle aus einer
// früheren Version der App (CREATE TABLE IF NOT EXISTS legt sie bei bereits
// existierender Tabelle nicht nachträglich an).
async function ensureColumn(
  database: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  sqlType: string
): Promise<void> {
  const columns = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  const hasColumn = columns.some((entry) => entry.name === column);
  if (!hasColumn) {
    await database.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${sqlType}`);
  }
}

// Legt die benötigten Tabellen an, falls sie noch nicht existieren.
// Wird einmalig beim App-Start aufgerufen.
export async function initDatabase(): Promise<void> {
  const database = getDatabase();
  await database.execAsync(CREATE_FOTOS_TABLE);
  await ensureColumn(database, 'Fotos', 'asset_id', 'TEXT');
  await database.execAsync(CREATE_QUIZ_ERGEBNISSE_TABLE);
  await database.execAsync(CREATE_ERINNERUNGEN_TABLE);
  await ensureColumn(database, 'Erinnerungen', 'audio_uri', 'TEXT');
  await database.execAsync(CREATE_FOTO_ALBEN_TABLE);
  await database.execAsync(CREATE_PROFIL_TABLE);
}

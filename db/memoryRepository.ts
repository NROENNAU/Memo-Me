// Speichert und liest vom Nutzer erzählte Geschichten/Namen zu einem Foto.
import { getDatabase } from './database';

export async function saveMemory(fotoId: number, text: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    'INSERT INTO Erinnerungen (foto_id, text, erstellt_am) VALUES (?, ?, ?)',
    fotoId,
    text,
    Date.now()
  );
}

// Gibt die zuletzt erzählte Geschichte zu einem Foto zurück, falls vorhanden.
export async function getMemoryForPhoto(fotoId: number): Promise<string | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ text: string }>(
    'SELECT text FROM Erinnerungen WHERE foto_id = ? ORDER BY erstellt_am DESC LIMIT 1',
    fotoId
  );
  return row?.text ?? null;
}

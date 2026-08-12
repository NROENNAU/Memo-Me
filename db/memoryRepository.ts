// Speichert und liest vom Nutzer erzählte Geschichten/Namen zu einem Foto –
// als Text und/oder als Sprachnachricht.
import { getDatabase } from './database';

export interface Memory {
  text: string | null;
  audioUri: string | null;
}

export interface MemoryInput {
  text?: string | null;
  audioUri?: string | null;
}

export async function saveMemory(fotoId: number, memory: MemoryInput): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    'INSERT INTO Erinnerungen (foto_id, text, audio_uri, erstellt_am) VALUES (?, ?, ?, ?)',
    fotoId,
    memory.text?.trim() || '',
    memory.audioUri ?? null,
    Date.now()
  );
}

// Gibt die zuletzt erzählte Geschichte zu einem Foto zurück, falls vorhanden.
export async function getMemoryForPhoto(fotoId: number): Promise<Memory | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ text: string; audio_uri: string | null }>(
    'SELECT text, audio_uri FROM Erinnerungen WHERE foto_id = ? ORDER BY erstellt_am DESC LIMIT 1',
    fotoId
  );
  if (!row) return null;
  return { text: row.text || null, audioUri: row.audio_uri };
}

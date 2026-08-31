// Gesichts-"Fingerabdrücke" (embeddings), die einer vom Nutzer genannten
// Person zugeordnet sind - Grundlage dafür, dieselbe Person per
// Gesichtserkennung auf anderen Fotos wiederzufinden.
import { getDatabase } from './database';

export interface NamedFace {
  id: number;
  fotoId: number;
  name: string;
  embedding: string;
}

export async function saveNamedFace(fotoId: number, name: string, embedding: string): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO Gesichter (foto_id, name, embedding, erstellt_am) VALUES (?, ?, ?, ?)`,
    fotoId,
    name,
    embedding,
    Date.now()
  );
}

export async function getNamedFaces(): Promise<NamedFace[]> {
  const db = getDatabase();
  const rows = await db.getAllAsync<{ id: number; foto_id: number; name: string; embedding: string }>(
    'SELECT id, foto_id, name, embedding FROM Gesichter'
  );
  return rows.map((row) => ({ id: row.id, fotoId: row.foto_id, name: row.name, embedding: row.embedding }));
}

// Cache für die on-device Bildklassifikation: verhindert, dass dasselbe Foto
// bei jeder Quizrunde erneut klassifiziert werden muss.
import { getDatabase } from './database';
import { ImageLabel } from '../modules/image-classifier/src';

export interface PhotoClassification {
  isJunk: boolean;
  labels: ImageLabel[];
}

export async function getCachedClassification(fotoId: number): Promise<PhotoClassification | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ ist_muell: number; labels: string }>(
    'SELECT ist_muell, labels FROM FotoKlassifikation WHERE foto_id = ?',
    fotoId
  );
  if (!row) return null;
  return { isJunk: row.ist_muell === 1, labels: JSON.parse(row.labels) };
}

export async function saveClassification(fotoId: number, result: PhotoClassification): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO FotoKlassifikation (foto_id, ist_muell, labels, klassifiziert_am)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(foto_id) DO UPDATE SET
       ist_muell = excluded.ist_muell,
       labels = excluded.labels,
       klassifiziert_am = excluded.klassifiziert_am`,
    fotoId,
    result.isJunk ? 1 : 0,
    JSON.stringify(result.labels),
    Date.now()
  );
}

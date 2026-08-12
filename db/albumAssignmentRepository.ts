// Merkt sich, welchem Album ein Foto zuletzt über die App zugeordnet wurde.
import { getDatabase } from './database';

export interface AlbumAssignment {
  albumId: string;
  albumTitle: string;
}

export async function saveAlbumAssignment(
  fotoId: number,
  albumId: string,
  albumTitle: string
): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    'INSERT INTO FotoAlben (foto_id, album_id, album_titel, zugeordnet_am) VALUES (?, ?, ?, ?)',
    fotoId,
    albumId,
    albumTitle,
    Date.now()
  );
}

// Gibt das zuletzt zugeordnete Album zurück, falls das Foto schon einem
// Album zugeordnet wurde (über diese App).
export async function getCurrentAlbumForPhoto(fotoId: number): Promise<AlbumAssignment | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ album_id: string; album_titel: string }>(
    'SELECT album_id, album_titel FROM FotoAlben WHERE foto_id = ? ORDER BY zugeordnet_am DESC LIMIT 1',
    fotoId
  );
  return row ? { albumId: row.album_id, albumTitle: row.album_titel } : null;
}

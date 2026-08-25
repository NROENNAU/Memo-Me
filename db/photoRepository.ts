// Speichert aus der Mediathek gelesene Fotos in der lokalen Datenbank, damit
// Quizergebnisse (QuizErgebnisse.foto_id) auf einen stabilen lokalen
// Datensatz verweisen können statt auf die Mediathek-Asset-ID.
import { getDatabase } from './database';
import { LibraryPhoto, PhotoCoordinates } from '../types/Photo';

type PhotoForUpsert = Pick<LibraryPhoto, 'uri' | 'creationTime' | 'assetId'> & {
  coordinates?: PhotoCoordinates | null;
};

// Legt ein Foto an (falls seine assetId noch nicht existiert) und gibt in
// jedem Fall die lokale Datenbank-ID zurück. Bewusst über assetId statt uri
// nachgeschlagen: Auf iOS liefert die Mediathek für dasselbe Foto bei jedem
// Abruf eine neue, temporäre uri (localUri) – nur die assetId bleibt stabil.
// Bei einem bereits bestehenden Eintrag werden uri/timestamp/Ort aktualisiert.
export async function upsertPhoto(photo: PhotoForUpsert): Promise<number> {
  const db = getDatabase();

  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM Fotos WHERE asset_id = ?',
    photo.assetId
  );

  const location = photo.coordinates
    ? `${photo.coordinates.latitude},${photo.coordinates.longitude}`
    : null;

  if (existing) {
    await db.runAsync(
      'UPDATE Fotos SET uri = ?, timestamp = ?, location = COALESCE(?, location) WHERE id = ?',
      photo.uri,
      photo.creationTime ?? Date.now(),
      location,
      existing.id
    );
    return existing.id;
  }

  const result = await db.runAsync(
    'INSERT INTO Fotos (uri, asset_id, timestamp, location, tags) VALUES (?, ?, ?, ?, ?)',
    photo.uri,
    photo.assetId,
    photo.creationTime ?? Date.now(),
    location,
    null
  );
  return result.lastInsertRowId;
}

// Liest die zu einem Foto hinterlegten Personen/Schlagwörter, falls vorhanden.
export async function getPhotoTags(fotoId: number): Promise<string[] | null> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ tags: string | null }>('SELECT tags FROM Fotos WHERE id = ?', fotoId);
  if (!row?.tags) return null;
  const parsed = JSON.parse(row.tags);
  return Array.isArray(parsed) && parsed.length > 0 ? parsed : null;
}

// Speichert Personen/Schlagwörter zu einem Foto (z. B. Antwort auf "Wer ist
// das?"). Grundlage für eine spätere "Wer"-Frage im Quiz.
export async function savePhotoTags(fotoId: number, tags: string[]): Promise<void> {
  const db = getDatabase();
  await db.runAsync('UPDATE Fotos SET tags = ? WHERE id = ?', JSON.stringify(tags), fotoId);
}

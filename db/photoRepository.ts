// Speichert aus der Mediathek gelesene Fotos in der lokalen Datenbank, damit
// Quizergebnisse (QuizErgebnisse.foto_id) auf einen stabilen lokalen
// Datensatz verweisen können statt auf die Mediathek-Asset-ID.
import { getDatabase } from './database';
import { LibraryPhoto, PhotoCoordinates } from '../types/Photo';

type PhotoForUpsert = Pick<LibraryPhoto, 'uri' | 'creationTime'> & {
  coordinates?: PhotoCoordinates | null;
};

// Legt ein Foto an (falls es unter dieser uri noch nicht existiert) und
// gibt in jedem Fall die lokale Datenbank-ID zurück. Existiert die uri schon,
// wird der bestehende Eintrag unverändert zurückgegeben (der Ort wird also
// nicht nachträglich ergänzt, falls er beim ersten Aufruf noch nicht bekannt war).
export async function upsertPhoto(photo: PhotoForUpsert): Promise<number> {
  const db = getDatabase();

  const existing = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM Fotos WHERE uri = ?',
    photo.uri
  );
  if (existing) return existing.id;

  const location = photo.coordinates
    ? `${photo.coordinates.latitude},${photo.coordinates.longitude}`
    : null;

  const result = await db.runAsync(
    'INSERT INTO Fotos (uri, timestamp, location, tags) VALUES (?, ?, ?, ?)',
    photo.uri,
    photo.creationTime ?? Date.now(),
    location,
    null
  );
  return result.lastInsertRowId;
}

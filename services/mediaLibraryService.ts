// Dünne Hüllschicht um expo-media-library, damit der Rest der App nicht direkt
// mit der Bibliothek arbeiten muss. Zuständig für Berechtigungen und das Lesen
// von Fotos aus der Gerätemediathek.
import * as MediaLibrary from 'expo-media-library';
import { PhotoPermissionStatus } from '../types/permissions';
import { LibraryPhoto } from '../types/Photo';
import { PhotoSource } from '../types/PhotoSource';
import { shuffle } from './quizService';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

// Mitternacht (lokale Zeit) des Tages, an dem der Zeitstempel liegt.
function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

// Wandelt den expo-media-library-Status in unseren eigenen, einfacheren Status um.
function mapStatus(status: MediaLibrary.PermissionStatus): PhotoPermissionStatus {
  if (status === 'granted') return 'granted';
  if (status === 'denied') return 'denied';
  return 'undetermined';
}

// Fragt den aktuellen Berechtigungsstatus ab, ohne den Nutzer zu fragen.
export async function getPermissionStatus(): Promise<PhotoPermissionStatus> {
  const result = await MediaLibrary.getPermissionsAsync();
  return mapStatus(result.status);
}

// Fordert die Berechtigung aktiv beim Nutzer an (öffnet den System-Dialog).
export async function requestPermission(): Promise<PhotoPermissionStatus> {
  const result = await MediaLibrary.requestPermissionsAsync();
  return mapStatus(result.status);
}

// Baut aus einer Foto-Quelle die passenden Filter-Optionen für getAssetsAsync.
function optionsForSource(source: PhotoSource, limit: number): MediaLibrary.AssetsOptions {
  const base: MediaLibrary.AssetsOptions = {
    mediaType: MediaLibrary.MediaType.photo,
    sortBy: [MediaLibrary.SortBy.creationTime],
    first: limit,
  };

  if (source.type === 'lastYear') {
    return { ...base, createdAfter: Date.now() - ONE_YEAR_MS };
  }
  if (source.type === 'album') {
    return { ...base, album: source.albumId };
  }
  return base;
}

export interface CandidatePhoto {
  assetId: string;
  uri: string;
  creationTime: number | null;
  filename: string;
  mediaSubtypes?: string[];
}

function toCandidatePhoto(asset: MediaLibrary.Asset): CandidatePhoto {
  return {
    assetId: asset.id,
    uri: asset.uri,
    creationTime: asset.creationTime ?? null,
    filename: asset.filename,
    mediaSubtypes: asset.mediaSubtypes,
  };
}

// In wie viele Zeitabschnitte der verfügbare Zeitraum einer Quelle beim
// Aufbau des Fotopools unterteilt wird - verhindert, dass eine Quizrunde nur
// aus den neuesten Fotos besteht, statt über die ganze Quelle durchmischt zu sein.
const TIME_BUCKETS = 12;
// Pro Zeitabschnitt wird mehr geholt als gebraucht, damit auch innerhalb
// eines Abschnitts gemischt werden kann statt immer dieselben (neuesten)
// Fotos dieses Abschnitts zu bekommen.
const BUCKET_OVERSAMPLE_FACTOR = 4;

// Schnelle, leichte Liste möglicher Fotos für eine Quelle (kein Ort, keine
// Detail-Infos) – Grundlage für die Quizrunde, bevor die teuren Details
// nachgeladen werden. Statt einfach der neuesten `limit` Fotos wird der
// Zeitraum der Quelle in Abschnitte unterteilt und aus jedem Abschnitt ein
// Anteil gezogen, damit die Runde über die ganze Quelle durchmischt ist statt
// nur die zuletzt aufgenommenen Fotos zu zeigen.
export async function listCandidatePhotos(source: PhotoSource, limit: number): Promise<CandidatePhoto[]> {
  const [oldest, newest] = await Promise.all([
    MediaLibrary.getAssetsAsync({
      ...optionsForSource(source, 1),
      sortBy: [[MediaLibrary.SortBy.creationTime, true]],
    }),
    MediaLibrary.getAssetsAsync({
      ...optionsForSource(source, 1),
      sortBy: [[MediaLibrary.SortBy.creationTime, false]],
    }),
  ]);

  const oldestTime = oldest.assets[0]?.creationTime;
  const newestTime = newest.assets[0]?.creationTime;

  // Kein oder nur ein Zeitpunkt bekannt (leere Quelle, oder alle Fotos vom
  // selben Zeitpunkt) - Aufteilung in Zeitabschnitte bringt hier nichts.
  if (!oldestTime || !newestTime || oldestTime >= newestTime) {
    const { assets } = await MediaLibrary.getAssetsAsync(optionsForSource(source, limit));
    return assets.map(toCandidatePhoto);
  }

  const perBucket = Math.max(1, Math.ceil(limit / TIME_BUCKETS));
  const bucketSpan = (newestTime - oldestTime) / TIME_BUCKETS;

  const buckets = await Promise.all(
    Array.from({ length: TIME_BUCKETS }, (_, index) => {
      const bucketStart = oldestTime + index * bucketSpan;
      // Letzter Abschnitt schließt das jüngste Foto mit ein (createdBefore
      // ist exklusiv).
      const bucketEnd = index === TIME_BUCKETS - 1 ? newestTime + 1 : bucketStart + bucketSpan;
      return MediaLibrary.getAssetsAsync({
        ...optionsForSource(source, perBucket * BUCKET_OVERSAMPLE_FACTOR),
        createdAfter: bucketStart,
        createdBefore: bucketEnd,
      });
    })
  );

  return buckets.flatMap(({ assets }) => shuffle(assets).slice(0, perBucket).map(toCandidatePhoto));
}

// Lädt die vollständigen Metadaten (u. a. GPS-Ort) für ein einzelnes Foto
// nach. Bewusst pro Foto statt für den ganzen Pool, damit nur die tatsächlich
// für die Quizrunde ausgewählten Fotos diesen teureren Aufruf durchlaufen.
export async function resolvePhotoDetails(candidate: CandidatePhoto): Promise<LibraryPhoto> {
  const info = await MediaLibrary.getAssetInfoAsync(candidate.assetId);
  // Auf iOS liefert diese Paketversion location.latitude/longitude als
  // String statt als Zahl (nativer Typ-Bug) – deshalb hier robust in
  // eine echte Zahl umwandeln, statt der rohen Native-Antwort zu trauen.
  const latitude = info.location ? Number(info.location.latitude) : NaN;
  const longitude = info.location ? Number(info.location.longitude) : NaN;
  const hasValidCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  return {
    assetId: candidate.assetId,
    uri: info.localUri ?? info.uri,
    creationTime: info.creationTime,
    coordinates: hasValidCoordinates ? { latitude, longitude } : null,
  };
}

export interface AlbumSummary {
  id: string;
  title: string;
  assetCount: number;
}

// Listet die eigenen Alben des Nutzers (keine Smart-Alben wie "Favoriten"),
// damit sie als eigene Foto-Quelle wählbar sind.
export async function getAlbums(): Promise<AlbumSummary[]> {
  const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: false });
  return albums
    .filter((album) => album.assetCount > 0)
    .map((album) => ({ id: album.id, title: album.title, assetCount: album.assetCount }));
}

// Prüft, ob ein Foto bereits in einem bestehenden Album steckt – auch wenn
// die Zuordnung nicht über Memo-Me, sondern z. B. schon vorher in der
// normalen Fotos-App gemacht wurde. iOS gibt (anders als Android) keine
// Album-Zugehörigkeit direkt preis, deshalb wird hier jedes Album einzeln
// nach dem Foto durchsucht – das kann bei vielen Alben/Fotos einen Moment
// dauern. Aufrufer sollten das Ergebnis nach Möglichkeit selbst zwischenspeichern.
export async function findAlbumContainingAsset(assetId: string): Promise<AlbumSummary | null> {
  const albums = await getAlbums();
  for (const album of albums) {
    const { assets } = await MediaLibrary.getAssetsAsync({
      album: album.id,
      mediaType: MediaLibrary.MediaType.photo,
      first: album.assetCount,
    });
    if (assets.some((asset) => asset.id === assetId)) {
      return album;
    }
  }
  return null;
}

// Zählt, wie viele Fotos für eine Quelle verfügbar sind (für die
// Fotoquellen-Auswahl, z. B. "Letzte Fotos" vs. "Letztes Jahr").
export async function countPhotosForSource(source: PhotoSource): Promise<number> {
  const { totalCount } = await MediaLibrary.getAssetsAsync({
    ...optionsForSource(source, 0),
    first: 0,
  });
  return totalCount;
}

// Löscht ein Foto endgültig aus der Gerätemediathek.
export async function deleteAsset(assetId: string): Promise<void> {
  await MediaLibrary.deleteAssetsAsync([assetId]);
}

// Ordnet ein Foto einem bestehenden Album zu.
export async function addPhotoToAlbum(assetId: string, albumId: string): Promise<void> {
  await MediaLibrary.addAssetsToAlbumAsync([assetId], albumId, false);
}

// Ordnet mehrere Fotos einem bestehenden Album zu (für "ähnliche Fotos auch?").
export async function addPhotosToAlbum(assetIds: string[], albumId: string): Promise<void> {
  await MediaLibrary.addAssetsToAlbumAsync(assetIds, albumId, false);
}

// Legt ein neues Album an und ordnet ihm direkt das gegebene Foto zu.
export async function createAlbumWithPhoto(name: string, assetId: string): Promise<string> {
  const album = await MediaLibrary.createAlbumAsync(name, assetId, false);
  return album.id;
}

// Schlägt ein bestehendes Album für ein Foto vor: das erste Album, das
// bereits ein Foto vom selben Kalendertag enthält. Kein echtes
// Bildverständnis – nur eine Datum-Heuristik, aber ein guter, günstiger
// erster Anhaltspunkt ("Fotos vom selben Anlass").
export async function suggestAlbumForPhoto(photo: LibraryPhoto): Promise<AlbumSummary | null> {
  if (!photo.creationTime) return null;
  const dayStart = startOfDay(photo.creationTime);
  const dayEnd = dayStart + ONE_DAY_MS;

  const albums = await getAlbums();
  for (const album of albums) {
    const { totalCount } = await MediaLibrary.getAssetsAsync({
      album: album.id,
      mediaType: MediaLibrary.MediaType.photo,
      createdAfter: dayStart,
      createdBefore: dayEnd,
      first: 0,
    });
    if (totalCount > 0) return album;
  }
  return null;
}

// Findet "ähnliche" Fotos zu einem gegebenen Foto: alle anderen Fotos vom
// selben Kalendertag. Gleiche Heuristik wie bei suggestAlbumForPhoto.
export async function findSimilarPhotos(
  photo: LibraryPhoto,
  excludeAssetId: string,
  limit = 30
): Promise<CandidatePhoto[]> {
  if (!photo.creationTime) return [];
  const dayStart = startOfDay(photo.creationTime);
  const dayEnd = dayStart + ONE_DAY_MS;

  const { assets } = await MediaLibrary.getAssetsAsync({
    mediaType: MediaLibrary.MediaType.photo,
    createdAfter: dayStart,
    createdBefore: dayEnd,
    sortBy: [MediaLibrary.SortBy.creationTime],
    first: limit,
  });

  return assets
    .filter((asset) => asset.id !== excludeAssetId)
    .map((asset) => ({
      assetId: asset.id,
      uri: asset.uri,
      creationTime: asset.creationTime ?? null,
      filename: asset.filename,
      mediaSubtypes: asset.mediaSubtypes,
    }));
}

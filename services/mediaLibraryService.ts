// Dünne Hüllschicht um expo-media-library, damit der Rest der App nicht direkt
// mit der Bibliothek arbeiten muss. Zuständig für Berechtigungen und das Lesen
// von Fotos aus der Gerätemediathek.
import * as MediaLibrary from 'expo-media-library';
import { PhotoPermissionStatus } from '../types/permissions';
import { LibraryPhoto } from '../types/Photo';
import { PhotoSource } from '../types/PhotoSource';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

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
  id: string;
  uri: string;
  creationTime: number | null;
}

// Schnelle, leichte Liste möglicher Fotos für eine Quelle (kein Ort, keine
// Detail-Infos) – ein einziger nativer Aufruf. Grundlage für die zufällige
// Auswahl der Quizrunde, bevor die teuren Details nachgeladen werden.
export async function listCandidatePhotos(source: PhotoSource, limit: number): Promise<CandidatePhoto[]> {
  const { assets } = await MediaLibrary.getAssetsAsync(optionsForSource(source, limit));
  return assets.map((asset) => ({
    id: asset.id,
    uri: asset.uri,
    creationTime: asset.creationTime ?? null,
  }));
}

// Lädt die vollständigen Metadaten (u. a. GPS-Ort) für ein einzelnes Foto
// nach. Bewusst pro Foto statt für den ganzen Pool, damit nur die tatsächlich
// für die Quizrunde ausgewählten Fotos diesen teureren Aufruf durchlaufen.
export async function resolvePhotoDetails(candidate: CandidatePhoto): Promise<LibraryPhoto> {
  const info = await MediaLibrary.getAssetInfoAsync(candidate.id);
  // Auf iOS liefert diese Paketversion location.latitude/longitude als
  // String statt als Zahl (nativer Typ-Bug) – deshalb hier robust in
  // eine echte Zahl umwandeln, statt der rohen Native-Antwort zu trauen.
  const latitude = info.location ? Number(info.location.latitude) : NaN;
  const longitude = info.location ? Number(info.location.longitude) : NaN;
  const hasValidCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
  return {
    assetId: candidate.id,
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

// Zählt, wie viele Fotos für eine Quelle verfügbar sind (für die
// Fotoquellen-Auswahl, z. B. "Letzte Fotos" vs. "Letztes Jahr").
export async function countPhotosForSource(source: PhotoSource): Promise<number> {
  const { totalCount } = await MediaLibrary.getAssetsAsync({
    ...optionsForSource(source, 0),
    first: 0,
  });
  return totalCount;
}

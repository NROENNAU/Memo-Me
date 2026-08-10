// Dünne Hüllschicht um expo-media-library, damit der Rest der App nicht direkt
// mit der Bibliothek arbeiten muss. Zuständig für Berechtigungen und das Lesen
// von Fotos aus der Gerätemediathek.
import * as MediaLibrary from 'expo-media-library';
import { PhotoPermissionStatus } from '../types/permissions';
import { LibraryPhoto, PhotoCoordinates } from '../types/Photo';

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

// Liest den Aufnahmeort eines Fotos aus.
// Nicht jedes Foto hat einen Ort hinterlegt, und auf Android braucht es dafür
// eine zusätzliche Berechtigung – deshalb wird ein Fehler hier bewusst
// abgefangen und als "kein Ort bekannt" (null) behandelt.
async function readLocationSafely(asset: MediaLibrary.Asset): Promise<PhotoCoordinates | null> {
  try {
    const location = await asset.getLocation();
    if (!location) return null;
    return { latitude: location.latitude, longitude: location.longitude };
  } catch {
    return null;
  }
}

// Holt die neuesten Fotos aus der Mediathek – neuestes zuerst.
// Hinweis: Für jedes Foto werden Pfad, Datum und Ort einzeln nachgeladen.
// Deshalb sollte "limit" klein bleiben (im Quiz laden wir immer nur so viele
// Fotos, wie gerade gebraucht werden).
export async function getRecentPhotos(limit: number): Promise<LibraryPhoto[]> {
  const assets = await new MediaLibrary.Query()
    .eq(MediaLibrary.AssetField.MEDIA_TYPE, MediaLibrary.MediaType.IMAGE)
    .orderBy({ key: MediaLibrary.AssetField.CREATION_TIME, ascending: false })
    .limit(limit)
    .exe();

  return Promise.all(
    assets.map(async (asset) => {
      const [uri, creationTime, coordinates] = await Promise.all([
        asset.getUri(),
        asset.getCreationTime(),
        readLocationSafely(asset),
      ]);
      return { assetId: asset.id, uri, creationTime, coordinates };
    })
  );
}

// Zählt, wie viele Fotos insgesamt in der Mediathek verfügbar sind.
export async function countPhotos(): Promise<number> {
  const metadata = await new MediaLibrary.Query()
    .eq(MediaLibrary.AssetField.MEDIA_TYPE, MediaLibrary.MediaType.IMAGE)
    .exeForMetadata();
  return metadata.length;
}

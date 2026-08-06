// Dünne Hüllschicht um expo-media-library, damit der Rest der App nicht direkt
// mit der Bibliothek arbeiten muss. Zuständig nur für Berechtigungs-Abfragen.
import * as MediaLibrary from 'expo-media-library';
import { PhotoPermissionStatus } from '../types/permissions';

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

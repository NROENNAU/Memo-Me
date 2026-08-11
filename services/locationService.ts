// Wandelt GPS-Koordinaten eines Fotos in einen lesbaren Ortsnamen um.
// Läuft komplett auf dem Gerät (Betriebssystem-eigener Geocoder) – es werden
// keine Koordinaten an einen eigenen Server gesendet.
import * as Location from 'expo-location';
import { PhotoCoordinates } from '../types/Photo';

async function ensurePermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === 'granted') return true;

  const requested = await Location.requestForegroundPermissionsAsync();
  return requested.status === 'granted';
}

// Gibt null zurück, wenn keine Berechtigung erteilt wurde oder sich die
// Koordinaten keinem Ort zuordnen ließen – das Foto wird dann einfach nicht
// für die "Wo"-Frage verwendet.
export async function reverseGeocode(coordinates: PhotoCoordinates): Promise<string | null> {
  try {
    const hasPermission = await ensurePermission();
    if (!hasPermission) return null;

    const [address] = await Location.reverseGeocodeAsync(coordinates);
    if (!address) return null;

    const place = address.city ?? address.subregion ?? address.region;
    if (!place) return address.country ?? null;
    return address.country ? `${place}, ${address.country}` : place;
  } catch (error) {
    console.warn('[locationService] Geocoding fehlgeschlagen:', error);
    return null;
  }
}

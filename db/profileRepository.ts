// Speichert und liest das lokale Nutzerprofil (Spitzname, Profilbild,
// Timer-Dauer fürs Quiz). Es gibt nur ein Profil pro Gerät (feste id = 1).
import { getDatabase } from './database';

// Startwert für neue Profile, bis der Nutzer das in den Einstellungen ändert.
export const DEFAULT_TIMER_SECONDS = 20;

export interface Profile {
  nickname: string | null;
  avatarUri: string | null;
  // Sekunden pro Quizfrage, bevor sie automatisch als falsch gewertet wird.
  // 0 bedeutet: kein Timer, unbegrenzt Zeit.
  timerSeconds: number;
}

export async function getProfile(): Promise<Profile> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{
    spitzname: string | null;
    avatar_uri: string | null;
    timer_dauer: number | null;
  }>('SELECT spitzname, avatar_uri, timer_dauer FROM Profil WHERE id = 1');
  return {
    nickname: row?.spitzname ?? null,
    avatarUri: row?.avatar_uri ?? null,
    timerSeconds: row?.timer_dauer ?? DEFAULT_TIMER_SECONDS,
  };
}

export async function saveProfile(profile: Profile): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO Profil (id, spitzname, avatar_uri, timer_dauer) VALUES (1, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       spitzname = excluded.spitzname,
       avatar_uri = excluded.avatar_uri,
       timer_dauer = excluded.timer_dauer`,
    profile.nickname,
    profile.avatarUri,
    profile.timerSeconds
  );
}

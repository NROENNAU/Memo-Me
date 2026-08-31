// Speichert und liest das lokale Nutzerprofil (Spitzname, Profilbild,
// Timer-Dauer und Puzzle-Schwierigkeit fürs Quiz). Es gibt nur ein Profil
// pro Gerät (feste id = 1).
import { getDatabase } from './database';

// Startwerte für neue Profile, bis der Nutzer das in den Einstellungen ändert.
export const DEFAULT_TIMER_SECONDS = 20;
// 2x2 (4 Teile) ist zum Start deutlich zugänglicher als 3x3 (9 Teile) - wer
// mag, kann in den Einstellungen auf die schwerere Variante wechseln.
export const DEFAULT_PUZZLE_GRID_SIZE = 2;

export interface Profile {
  nickname: string | null;
  avatarUri: string | null;
  // Sekunden pro Quizfrage, bevor sie automatisch als falsch gewertet wird.
  // 0 bedeutet: kein Timer, unbegrenzt Zeit.
  timerSeconds: number;
  // Raster-Größe fürs Foto-Puzzle (2 = 2x2/4 Teile, 3 = 3x3/9 Teile).
  puzzleGridSize: number;
}

export async function getProfile(): Promise<Profile> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{
    spitzname: string | null;
    avatar_uri: string | null;
    timer_dauer: number | null;
    puzzle_groesse: number | null;
  }>('SELECT spitzname, avatar_uri, timer_dauer, puzzle_groesse FROM Profil WHERE id = 1');
  return {
    nickname: row?.spitzname ?? null,
    avatarUri: row?.avatar_uri ?? null,
    timerSeconds: row?.timer_dauer ?? DEFAULT_TIMER_SECONDS,
    puzzleGridSize: row?.puzzle_groesse ?? DEFAULT_PUZZLE_GRID_SIZE,
  };
}

export async function saveProfile(profile: Profile): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO Profil (id, spitzname, avatar_uri, timer_dauer, puzzle_groesse) VALUES (1, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       spitzname = excluded.spitzname,
       avatar_uri = excluded.avatar_uri,
       timer_dauer = excluded.timer_dauer,
       puzzle_groesse = excluded.puzzle_groesse`,
    profile.nickname,
    profile.avatarUri,
    profile.timerSeconds,
    profile.puzzleGridSize
  );
}

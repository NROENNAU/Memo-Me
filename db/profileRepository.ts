// Speichert und liest das lokale Nutzerprofil (Spitzname, Profilbild).
// Es gibt nur ein Profil pro Gerät (feste id = 1).
import { getDatabase } from './database';

export interface Profile {
  nickname: string | null;
  avatarUri: string | null;
}

export async function getProfile(): Promise<Profile> {
  const db = getDatabase();
  const row = await db.getFirstAsync<{ spitzname: string | null; avatar_uri: string | null }>(
    'SELECT spitzname, avatar_uri FROM Profil WHERE id = 1'
  );
  return { nickname: row?.spitzname ?? null, avatarUri: row?.avatar_uri ?? null };
}

export async function saveProfile(profile: Profile): Promise<void> {
  const db = getDatabase();
  await db.runAsync(
    `INSERT INTO Profil (id, spitzname, avatar_uri) VALUES (1, ?, ?)
     ON CONFLICT(id) DO UPDATE SET spitzname = excluded.spitzname, avatar_uri = excluded.avatar_uri`,
    profile.nickname,
    profile.avatarUri
  );
}

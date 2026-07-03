import { get, ref } from 'firebase/database';
import { db } from '@/lib/firebase-config';

export async function getUserRole(uid: string): Promise<string | null> {
  if (!db) return null;

  try {
    const uidMapSnap = await get(ref(db, `users/uidMap/${uid}`));
    if (!uidMapSnap.exists()) return null;

    const nameKey = uidMapSnap.val();
    if (!nameKey) return null;

    const profileSnap = await get(ref(db, `users/profiles/${nameKey}`));
    if (!profileSnap.exists()) return null;

    const profile = profileSnap.val();
    return profile?.role ?? null;
  } catch (error) {
    console.error('[auth] getUserRole error:', error);
    return null;
  }
}

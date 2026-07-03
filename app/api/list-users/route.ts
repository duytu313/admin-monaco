import { NextResponse } from 'next/server';
import { getAdminRTDB } from '@/lib/firebase-admin';

export async function POST() {
  try {
    const db = getAdminRTDB();

    // Lấy tất cả profiles từ Admin SDK (bỏ qua Firebase Rules)
    const profilesSnap = await db.ref('users/profiles').once('value');
    const profiles = profilesSnap.val();

    if (!profiles) {
      return NextResponse.json({ users: [] });
    }

    // Lấy uidMap để map uid -> nameKey
    const uidMapSnap = await db.ref('users/uidMap').once('value');
    const uidMap = uidMapSnap.val();

    // Build nameKey -> uid
    const nameKeyToUid: Record<string, string> = {};
    if (uidMap) {
      Object.entries(uidMap).forEach(([uid, nameKey]) => {
        if (nameKey) {
          nameKeyToUid[String(nameKey)] = uid;
        }
      });
    }

    const users = Object.entries(profiles).map(([nameKey, profile]: [string, any]) => ({
      nameKey,
      authUid: nameKeyToUid[nameKey] || profile.authUid || '',
      name: profile.name || '',
      username: profile.username || '',
      email: profile.email || '',
      phoneNumber: profile.phoneNumber || '',
      points: profile.points || 0,
      role: profile.role || 'customer',
      createdAt: profile.createdAt || 0,
    }));

    return NextResponse.json({ users });
  } catch (err) {
    console.error('[List Users]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
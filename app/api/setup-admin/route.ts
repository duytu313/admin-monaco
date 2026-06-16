import { NextResponse } from 'next/server';

/**
 * API để khởi tạo tài khoản admin trong Firebase Realtime Database
 * 
 * Cách dùng:
 * 1. Đăng nhập vào /login
 * 2. Mở browser console (F12), gõ: 
 *    const token = await auth.currentUser.getIdToken();
 *    fetch('/api/setup-admin', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({idToken: token, nameKey:'admin', role:'admin'}) }).then(r=>r.json()).then(console.log)
 */

export async function POST(request: Request) {
  try {
    const { idToken, nameKey, role } = await request.json();
    if (!idToken || !nameKey) {
      return NextResponse.json({ error: 'Missing idToken or nameKey' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const dbUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

    // Verify token và lấy uid
    const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const verifyData = await verifyRes.json();
    const uid = verifyData.users?.[0]?.localId;
    if (!uid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const email = verifyData.users[0].email || '';

    // Bước 1: Tạo uidMap
    console.log(`Creating uidMap: users/uidMap/${uid} = "${nameKey}"`);
    const uidMapRes = await fetch(`${dbUrl}/users/uidMap/${uid}.json?auth=${idToken}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nameKey),
    });
    if (!uidMapRes.ok) {
      const errText = await uidMapRes.text();
      return NextResponse.json({ error: `uidMap failed: ${errText}` }, { status: 500 });
    }

    // Bước 2: Tạo profile
    const profileData = {
      authUid: uid,
      name: nameKey,
      username: nameKey,
      email: email,
      phoneNumber: '',
      points: 0,
      role: role || 'admin',
      createdAt: Date.now(),
    };

    console.log(`Creating profile: users/profiles/${nameKey}`);
    const profileRes = await fetch(`${dbUrl}/users/profiles/${nameKey}.json?auth=${idToken}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profileData),
    });
    if (!profileRes.ok) {
      const errText = await profileRes.text();
      return NextResponse.json({ error: `profile failed: ${errText}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      uid,
      nameKey,
      role: role || 'admin',
      message: 'Tài khoản admin đã được tạo! Hãy refresh trang dashboard.',
    });
  } catch (err) {
    console.error('[Setup Admin]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
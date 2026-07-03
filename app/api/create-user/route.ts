import { NextResponse } from 'next/server';
import { getAdminApp } from '@/lib/firebase-admin';
import { getAuth } from 'firebase-admin/auth';

export async function POST(request: Request) {
  try {
    const { nameKey, name, email, phoneNumber, password, role, points } = await request.json();
    
    if (!nameKey || !password) {
      return NextResponse.json({ error: 'Missing required fields: nameKey and password' }, { status: 400 });
    }

    const auth = getAuth(getAdminApp());
    
    // Tạo Firebase Auth user
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: email || `${nameKey}@example.com`,
        password: password,
        displayName: name || nameKey,
      });
    } catch (authError: any) {
      console.error('[Create User] Auth error:', authError);
      return NextResponse.json({ 
        error: 'Failed to create auth user', 
        details: authError.message 
      }, { status: 500 });
    }

    const uid = userRecord.uid;

    // Tạo profile data
    const profileData = {
      authUid: uid,
      name: name || nameKey,
      username: nameKey,
      email: email || '',
      phoneNumber: phoneNumber || '',
      points: Number(points) || 0,
      role: role || 'customer',
      createdAt: Date.now(),
    };

    // Tạo uidMap và profile bằng Admin SDK
    try {
      const adminDB = getAdminApp().database();
      
      // Tạo uidMap
      await adminDB.ref(`users/uidMap/${uid}`).set(nameKey);
      
      // Tạo profile
      await adminDB.ref(`users/profiles/${nameKey}`).set(profileData);

      return NextResponse.json({
        success: true,
        message: `Đã tạo người dùng "${nameKey}" thành công!`,
        user: { nameKey, uid, ...profileData }
      });
    } catch (dbError: any) {
      console.error('[Create User] Database error:', dbError);
      // Rollback: xóa auth user nếu không tạo được database entries
      try {
        await auth.deleteUser(uid);
      } catch (deleteError) {
        console.error('[Create User] Rollback failed:', deleteError);
      }
      return NextResponse.json({ 
        error: 'Failed to create user data in database', 
        details: dbError.message 
      }, { status: 500 });
    }

  } catch (err) {
    console.error('[Create User] Unexpected error:', err);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: err instanceof Error ? err.message : String(err) 
    }, { status: 500 });
  }
}
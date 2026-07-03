import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { idToken, action, data } = await request.json();
    if (!idToken || !action || !data) {
      return NextResponse.json({ error: 'Missing idToken, action, or data' }, { status: 400 });
    }

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const dbUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
    if (!apiKey || !dbUrl) {
      return NextResponse.json({ error: 'Missing Firebase configuration' }, { status: 500 });
    }

    const verifyRes = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    const verifyData = await verifyRes.json();
    const callerUid = verifyData.users?.[0]?.localId;
    if (!callerUid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    if (action === 'create') {
      const { nameKey, authUid, name, phoneNumber, email, role, points } = data;
      if (!nameKey || !authUid) {
        return NextResponse.json({ error: 'Missing nameKey or authUid for create' }, { status: 400 });
      }

      const uidMapRes = await fetch(`${dbUrl}/users/uidMap/${authUid}.json?auth=${idToken}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nameKey),
      });
      if (!uidMapRes.ok) {
        const errText = await uidMapRes.text();
        return NextResponse.json({ error: `uidMap failed: ${errText}` }, { status: 500 });
      }

      const profileData: any = {
        authUid,
        name: name || nameKey,
        username: nameKey,
        email: email || '',
        phoneNumber: phoneNumber || '',
        points: Number(points) || 0,
        role: role || 'customer',
        createdAt: Date.now(),
      };

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
        message: `Đã tạo khách hàng "${nameKey}" thành công!`,
        nameKey,
      });
    } else if (action === 'update') {
      const { nameKey, points, role, name, phoneNumber, email } = data;
      if (!nameKey) {
        return NextResponse.json({ error: 'Missing nameKey for update' }, { status: 400 });
      }

      const getRes = await fetch(`${dbUrl}/users/profiles/${nameKey}.json?auth=${idToken}`);
      const currentProfile = await getRes.json();
      if (!currentProfile) {
        return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
      }

      const updateData: any = { ...currentProfile };
      if (points !== undefined) updateData.points = Number(points);
      if (role !== undefined) updateData.role = role;
      if (name !== undefined) updateData.name = name;
      if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
      if (email !== undefined) updateData.email = email;

      const updateRes = await fetch(`${dbUrl}/users/profiles/${nameKey}.json?auth=${idToken}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      if (!updateRes.ok) {
        const errText = await updateRes.text();
        return NextResponse.json({ error: `update failed: ${errText}` }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Đã cập nhật thông tin khách hàng "${nameKey}" thành công!`,
        nameKey,
        updated: { points: updateData.points, role: updateData.role },
      });
    } else {
      return NextResponse.json({ error: 'Invalid action. Use "create" or "update".' }, { status: 400 });
    }
  } catch (err) {
    console.error('[Update Customer]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
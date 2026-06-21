import { NextResponse } from 'next/server';

/**
 * API để tạo yêu cầu đổi điểm từ giao diện người dùng (monaco-karaoke-ui)
 * Sử dụng REST API trực tiếp đến Firebase Realtime Database 
 * (không dùng Firebase Admin SDK vì project không có service account)
 */

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { userId, customerName, reward, pointsCost, description } = body;

    if (!userId || !reward || !pointsCost) {
      return NextResponse.json({ message: 'Thiếu thông tin yêu cầu' }, { status: 400 });
    }

    const dbUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

    // Tạo ID mới cho point request
    const newRequestId = generatePushId();
    const now = Date.now();
    const dateStr = new Date().toLocaleDateString('vi-VN');

    // Lưu yêu cầu đổi điểm
    const requestRes = await fetch(`${dbUrl}/pointRequests/${newRequestId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        customerName: customerName || 'Khách hàng',
        reward,
        pointsCost: Number(pointsCost),
        description: description || '',
        date: dateStr,
        status: 'pending',
        createdAt: now,
      }),
    });

    if (!requestRes.ok) {
      const errText = await requestRes.text();
      return NextResponse.json({ message: `Lỗi lưu dữ liệu: ${errText}` }, { status: 500 });
    }

    // Gửi thông báo cho admin
    const notifId = generatePushId();
    await fetch(`${dbUrl}/notifications/global/${notifId}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Yêu cầu đổi điểm mới',
        description: `${customerName || 'Khách hàng'} yêu cầu đổi "${reward}" (${Number(pointsCost).toLocaleString('vi-VN')} điểm)`,
        href: '/dashboard/point-requests',
        type: 'system',
        time: 'Mới đây',
        createdAt: now,
      }),
    });

    return NextResponse.json({
      message: 'Gửi yêu cầu đổi điểm thành công!',
      requestId: newRequestId,
    }, { status: 201 });
  } catch (error: any) {
    console.error('Point request error:', error);
    return NextResponse.json({ message: 'Lỗi hệ thống', error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const dbUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

    let url = `${dbUrl}/pointRequests.json`;
    if (userId) {
      // Firebase RTDB REST hỗ trợ query parameters
      url += `?orderBy="userId"&equalTo="${userId}"`;
    }

    const res = await fetch(url);
    if (!res.ok) {
      return NextResponse.json({ requests: [] }, { status: 200 });
    }

    const data = await res.json();
    if (!data) {
      return NextResponse.json({ requests: [] }, { status: 200 });
    }

    const requests = Object.entries(data)
      .map(([id, value]: [string, any]) => ({
        id,
        ...value,
      }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

    return NextResponse.json({ requests }, { status: 200 });
  } catch (error: any) {
    console.error('Get point requests error:', error);
    return NextResponse.json({ message: 'Lỗi hệ thống' }, { status: 500 });
  }
}

/**
 * Generate a Firebase-like push ID
 */
function generatePushId(): string {
  const PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';
  const timestamp = Date.now();
  let id = '';
  for (let i = 7; i >= 0; i--) {
    id = PUSH_CHARS.charAt(timestamp >> (i * 5) & 0x1f) + id;
  }
  // Add random suffix
  for (let i = 0; i < 12; i++) {
    id += PUSH_CHARS.charAt(Math.floor(Math.random() * PUSH_CHARS.length));
  }
  return id;
}
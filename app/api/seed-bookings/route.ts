import { NextResponse } from 'next/server';

/**
 * API để seed dữ liệu mẫu cho bookings
 * Cần idToken từ Firebase Auth để ghi dữ liệu
 * 
 * Cách dùng:
 * 1. Đăng nhập vào /login với tài khoản admin
 * 2. Mở console F12, gõ:
 *    const token = await auth.currentUser.getIdToken();
 *    fetch('/api/seed-bookings', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({idToken: token}) }).then(r=>r.json()).then(console.log)
 */

const sampleBookings = [
  {
    userId: "user001",
    type: "karaoke",
    facilityName: "Karaoke Monaco",
    roomName: "Phòng Karaoke VIP 1",
    bookingDate: "15/6/2026",
    bookingTime: "14:00 - 17:00",
    totalAmount: 2064000,
    status: "Đã hoàn thành",
    note: "",
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    userId: "user002",
    type: "massage",
    facilityName: "Massage Monaco",
    roomName: "Phòng Massage VIP 1",
    bookingDate: "16/6/2026",
    bookingTime: "10:00 - 11:30",
    totalAmount: 800000,
    status: "Đã hoàn thành",
    note: "",
    createdAt: Date.now() - 86400000,
  },
  {
    userId: "user003",
    type: "restaurant",
    facilityName: "Nhà hàng Monaco",
    roomName: "Bàn VIP 1",
    bookingDate: "16/6/2026",
    bookingTime: "18:00 - 21:00",
    totalAmount: 1500000,
    status: "Đang diễn ra",
    note: "Khách VIP",
    createdAt: Date.now() - 3600000,
  },
  {
    userId: "user004",
    type: "karaoke",
    facilityName: "Karaoke Monaco",
    roomName: "Phòng Karaoke Thường 1",
    bookingDate: "17/6/2026",
    bookingTime: "19:00 - 22:00",
    totalAmount: 1164000,
    status: "Đã xác nhận",
    note: "",
    createdAt: Date.now(),
  },
  {
    userId: "user005",
    type: "karaoke",
    facilityName: "Karaoke Monaco",
    roomName: "Phòng Karaoke VIP 2",
    bookingDate: "17/6/2026",
    bookingTime: "20:00 - 23:00",
    totalAmount: 1764000,
    status: "Chưa xác nhận",
    note: "Sinh nhật",
    createdAt: Date.now(),
  },
  {
    userId: "user006",
    type: "massage",
    facilityName: "Massage Monaco",
    roomName: "Phòng Massage VIP 2",
    bookingDate: "18/6/2026",
    bookingTime: "14:00 - 15:30",
    totalAmount: 1200000,
    status: "Đã xác nhận",
    note: "",
    createdAt: Date.now() + 86400000,
  },
  {
    userId: "user007",
    type: "restaurant",
    facilityName: "Nhà hàng Monaco",
    roomName: "Bàn Thường 1",
    bookingDate: "18/6/2026",
    bookingTime: "11:00 - 13:00",
    totalAmount: 500000,
    status: "Chưa xác nhận",
    note: "Tiệc gia đình",
    createdAt: Date.now() + 86400000,
  },
  {
    userId: "user008",
    type: "karaoke",
    facilityName: "Karaoke Monaco",
    roomName: "Phòng Karaoke Thường 2",
    bookingDate: "19/6/2026",
    bookingTime: "13:00 - 16:00",
    totalAmount: 1014000,
    status: "Chưa xác nhận",
    note: "",
    createdAt: Date.now() + 86400000 * 2,
  },
  {
    userId: "user009",
    type: "massage",
    facilityName: "Massage Monaco",
    roomName: "Phòng Massage VIP 1",
    bookingDate: "19/6/2026",
    bookingTime: "09:00 - 10:30",
    totalAmount: 800000,
    status: "Đã xác nhận",
    note: "Khách quen",
    createdAt: Date.now() + 86400000 * 2,
  },
  {
    userId: "user010",
    type: "restaurant",
    facilityName: "Nhà hàng Monaco",
    roomName: "Bàn VIP 2",
    bookingDate: "20/6/2026",
    bookingTime: "17:00 - 20:00",
    totalAmount: 800000,
    status: "Đã huỷ",
    note: "Khách hủy",
    createdAt: Date.now() + 86400000 * 3,
  },
  {
    userId: "user011",
    type: "karaoke",
    facilityName: "Karaoke Monaco",
    roomName: "Phòng Karaoke VIP 1",
    bookingDate: "20/6/2026",
    bookingTime: "20:00 - 23:00",
    totalAmount: 2064000,
    status: "Chưa xác nhận",
    note: "Cuối tuần",
    createdAt: Date.now() + 86400000 * 3,
  },
  {
    userId: "user012",
    type: "karaoke",
    facilityName: "Karaoke Monaco",
    roomName: "Phòng Karaoke Thường 1",
    bookingDate: "21/6/2026",
    bookingTime: "15:00 - 18:00",
    totalAmount: 1164000,
    status: "Chưa xác nhận",
    note: "",
    createdAt: Date.now() + 86400000 * 4,
  },
];

export async function POST(request: Request) {
  try {
    const { idToken } = await request.json();
    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const dbUrl = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;
    if (!dbUrl) {
      return NextResponse.json({ message: 'Database URL not configured' }, { status: 500 });
    }

    const results: { id: string; status: string; date: string }[] = [];

    for (const booking of sampleBookings) {
      // Tạo ID push giống Firebase
      const id = generatePushId();
      const res = await fetch(`${dbUrl}/bookings/${id}.json?auth=${idToken}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(booking),
      });

      if (res.ok) {
        results.push({ id, status: booking.status, date: booking.bookingDate });
      } else {
        const errText = await res.text();
        console.error(`Failed to seed booking: ${errText}`);
      }
    }

    return NextResponse.json({
      message: `Đã seed ${results.length} booking mẫu thành công!`,
      count: results.length,
      bookings: results,
    }, { status: 200 });
  } catch (error: any) {
    console.error('Seed bookings error:', error);
    return NextResponse.json({ message: 'Lỗi hệ thống', error: error.message }, { status: 500 });
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
  for (let i = 0; i < 12; i++) {
    id += PUSH_CHARS.charAt(Math.floor(Math.random() * PUSH_CHARS.length));
  }
  return id;
}
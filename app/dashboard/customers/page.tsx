'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { db } from '@/lib/firebase-config';
import { ref, onValue, get } from 'firebase/database';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

interface CustomerProfile {
  nameKey: string;
  authUid?: string;
  username?: string;
  name?: string;
  email?: string;
  phoneNumber?: string;
  points: number;
  createdAt: number;
  role?: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const bookingsRef = ref(db, 'bookings');

    const unsubBookings = onValue(bookingsRef, async (snapshot) => {
      if (snapshot.exists()) {
        const bookings = snapshot.val();
        const uniqueUsers = new Set<string>();

        Object.keys(bookings).forEach(key => {
          const b = bookings[key];
          if (b.userId) uniqueUsers.add(b.userId);
        });

        // Fetch user profiles individually to comply with Firebase Rules
        const fetchedCustomers: CustomerProfile[] = [];
        const uids = Array.from(uniqueUsers);

        for (const uid of uids) {
          try {
            const uidMapSnap = await get(ref(db, `users/uidMap/${uid}`));
            if (uidMapSnap.exists()) {
              const nameKey = uidMapSnap.val();
              const profileSnap = await get(ref(db, `users/profiles/${nameKey}`));
              
              if (profileSnap.exists()) {
                const profile = profileSnap.val();
                fetchedCustomers.push({
                  nameKey,
                  ...profile
                });
              }
            }
          } catch (err) {
            console.error("Lỗi khi lấy thông tin user", uid, err);
          }
        }

        // Sort by points descending
        fetchedCustomers.sort((a, b) => (b.points || 0) - (a.points || 0));
        setCustomers(fetchedCustomers);
      } else {
        setCustomers([]);
      }
      setLoading(false);
    });

    return () => {
      unsubBookings();
    };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Quản lý khách hàng</h1>
        <p className="text-slate-400 mt-2">Xem và quản lý thông tin khách hàng</p>
      </div>

      <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="text-blue-400 mt-0.5 h-5 w-5 flex-shrink-0" />
        <div className="text-sm text-blue-200">
          <p className="font-semibold text-blue-300">Lưu ý về dữ liệu hiển thị:</p>
          <p>Để đảm bảo tuân thủ cấu hình bảo mật Firebase Rules hiện tại, hệ thống không tải toàn bộ danh sách người dùng. Thay vào đó, danh sách này chỉ hiển thị những khách hàng <strong>đã từng phát sinh ít nhất một đơn đặt phòng</strong>.</p>
        </div>
      </div>

      <Card className="bg-[#111827] border-slate-800">
        <div className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-transparent">
                <TableHead className="text-slate-300">Tên khách hàng</TableHead>
                <TableHead className="text-slate-300">Số điện thoại</TableHead>
                <TableHead className="text-slate-300">Email</TableHead>
                <TableHead className="text-slate-300 text-right">Điểm tích luỹ</TableHead>
                <TableHead className="text-slate-300">Vai trò</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                    Đang tải dữ liệu khách hàng...
                  </TableCell>
                </TableRow>
              ) : customers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                    Chưa có khách hàng nào phát sinh đơn hàng.
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer, index) => (
                  <TableRow key={customer.nameKey || index} className="border-slate-700 hover:bg-slate-800/50">
                    <TableCell className="font-medium text-slate-200">
                      {customer.name || customer.username || customer.nameKey}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {customer.phoneNumber || <span className="text-slate-500 italic">Chưa cập nhật</span>}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {customer.email || <span className="text-slate-500 italic">Chưa cập nhật</span>}
                    </TableCell>
                    <TableCell className="text-slate-300 text-right font-bold text-amber-400">
                      {(customer.points || 0).toLocaleString('vi-VN')}
                    </TableCell>
                    <TableCell>
                      {customer.role === 'admin' ? (
                        <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-none">Quản trị viên</Badge>
                      ) : (
                        <Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-none">Khách hàng</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
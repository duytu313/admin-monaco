'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/firebase-config';
import { ref, onValue, update } from 'firebase/database';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { CalendarIcon, BarChart3, Mic, Heart, Soup } from 'lucide-react';
import {
  BOOKING_STATUSES,
  ALL_BOOKING_STATUSES,
  normalizeBookingStatus,
  getStatusColor,
  getStatusLabel,
  STATUS_COLORS,
} from '@/lib/booking-constants';

const getServiceIcon = (type: string) => {
  switch (type) {
    case 'karaoke': return <Mic size={14} />;
    case 'massage': return <Heart size={14} />;
    case 'restaurant': return <Soup size={14} />;
    default: return null;
  }
};

const getServiceColor = (type: string) => {
  switch (type) {
    case 'karaoke': return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
    case 'massage': return 'text-pink-400 bg-pink-500/10 border-pink-500/30';
    case 'restaurant': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
    default: return 'text-slate-400 bg-slate-500/10 border-slate-500/30';
  }
};

export default function BookingsPage() {
  const [bookingList, setBookingList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Date range filter
  const [startDate, setStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // hôm nay
  });
  const [endDate, setEndDate] = useState(() => {
    const weekLater = new Date();
    weekLater.setDate(weekLater.getDate() + 7);
    return weekLater.toISOString().split('T')[0]; // 7 ngày sau
  });

  // Lọc ra các booking trong khoảng ngày được chọn
  const filteredBookings = bookingList.filter(b => {
    if (!b.bookingDate) return true;
    // Chuyển đổi bookingDate thành Date để so sánh
    const parts = b.bookingDate.split('/');
    let bookingDateObj: Date;
    if (parts.length === 3) {
      // dd/mm/yyyy
      bookingDateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    } else {
      bookingDateObj = new Date(b.bookingDate + 'T00:00:00');
    }
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');
    return bookingDateObj >= start && bookingDateObj <= end;
  });

  // Helper để chuẩn hóa trạng thái
  const normalizeStatus = (status: string): string => {
    const normalized = normalizeBookingStatus(status);
    // Nhóm các trạng thái cho thống kê
    if (normalized === BOOKING_STATUSES.WAITING_FOR_CONFIRMATION) return 'pending';
    if (normalized === BOOKING_STATUSES.CONFIRMED) return 'confirmed';
    if (normalized === BOOKING_STATUSES.ARRIVED) return 'arrived';
    if (normalized === BOOKING_STATUSES.USING) return 'using';
    if (normalized === BOOKING_STATUSES.WAITING_TO_ARRIVE) return 'waiting';
    if (normalized === BOOKING_STATUSES.WAITING_FOR_PAYMENT) return 'waiting_payment';
    if (normalized === BOOKING_STATUSES.PAID) return 'completed';
    if (normalized === BOOKING_STATUSES.CANCELLED) return 'cancelled';
    return 'other';
  };

  // Thống kê theo khoảng thời gian
  const stats = {
    total: filteredBookings.length,
    pending: filteredBookings.filter(b => normalizeStatus(normalizeBookingStatus(b.status)) === 'pending').length,
    confirmed: filteredBookings.filter(b => {
      const norm = normalizeStatus(normalizeBookingStatus(b.status));
      return norm === 'confirmed' || norm === 'arrived' || norm === 'waiting' || norm === 'using';
    }).length,
    using: filteredBookings.filter(b => normalizeStatus(normalizeBookingStatus(b.status)) === 'using').length,
    waiting_payment: filteredBookings.filter(b => normalizeStatus(normalizeBookingStatus(b.status)) === 'waiting_payment').length,
    completed: filteredBookings.filter(b => normalizeStatus(normalizeBookingStatus(b.status)) === 'completed').length,
    cancelled: filteredBookings.filter(b => normalizeStatus(normalizeBookingStatus(b.status)) === 'cancelled').length,
  };

  useEffect(() => {
    const bookingsRef = ref(db, 'bookings');
    const unsubBookings = onValue(bookingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          ...value
        }));
        setBookingList(list.reverse());
      } else {
        setBookingList([]);
      }
      setLoading(false);
    });
    return () => unsubBookings();
  }, []);

  const handleStatusChange = (bookingId: string, newStatus: string) => {
    const bookingRef = ref(db, `bookings/${bookingId}`);
    update(bookingRef, { status: newStatus });
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Quản lý đặt phòng</h1>
        <p className="text-slate-400 mt-2">Xem và quản lý tất cả đơn đặt phòng</p>
      </div>

      {/* Date Range Filter */}
      <Card className="bg-slate-800 border-slate-700 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-slate-400" />
            <span className="text-slate-300 text-sm font-medium">Khoảng thời gian:</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5">
              <span className="text-xs text-slate-500">Từ</span>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-slate-300 text-sm outline-none border-none focus:ring-0 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
            <span className="text-slate-500">→</span>
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5">
              <span className="text-xs text-slate-500">Đến</span>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-slate-300 text-sm outline-none border-none focus:ring-0 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
              />
            </div>
          </div>
          <div className="text-xs text-slate-500 ml-auto">
            Tổng: <span className="text-white font-bold">{stats.total}</span> đơn
            {stats.pending > 0 && <span className="ml-2 text-orange-400">({stats.pending} chờ)</span>}
          </div>
        </div>

        {/* Mini stats with colors */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-orange-400">{stats.pending}</p>
            <p className="text-[10px] text-orange-400/80 font-medium">⏳ Chờ xác nhận</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-emerald-400">{stats.confirmed}</p>
            <p className="text-[10px] text-emerald-400/80 font-medium">✓ Đã xác nhận</p>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-blue-400">{stats.using}</p>
            <p className="text-[10px] text-blue-400/80 font-medium">▶ Đang dùng</p>
          </div>
          <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-purple-400">{stats.waiting_payment}</p>
            <p className="text-[10px] text-purple-400/80 font-medium">💳 Chờ thanh toán</p>
          </div>
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-green-400">{stats.completed}</p>
            <p className="text-[10px] text-green-400/80 font-medium">✔ Đã thanh toán</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
            <p className="text-xl font-bold text-red-400">{stats.cancelled}</p>
            <p className="text-[10px] text-red-400/80 font-medium">✕ Đã hủy</p>
          </div>
        </div>
      </Card>

      {/* Bookings Table */}
      <Card className="bg-slate-800 border-slate-700 p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-slate-300">ID</TableHead>
                <TableHead className="text-slate-300">User ID</TableHead>
                <TableHead className="text-slate-300">Dịch vụ</TableHead>
                <TableHead className="text-slate-300">Ngày</TableHead>
                <TableHead className="text-slate-300">Thời gian</TableHead>
                <TableHead className="text-slate-300">Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                    Đang tải...
                  </TableCell>
                </TableRow>
              ) : filteredBookings.length > 0 ? (
                filteredBookings.map((booking) => (
                  <TableRow key={booking.id} className="border-slate-700 hover:bg-slate-700/50">
                    <TableCell className="text-slate-300 text-xs">{booking.id}</TableCell>
                    <TableCell className="text-slate-300">{booking.userId}</TableCell>
                    <TableCell>
                      <Badge className={`${getServiceColor(booking.type)} border`}>
                        <span className="flex items-center gap-1">
                          {getServiceIcon(booking.type)}
                          <span className="capitalize">
                            {booking.type === 'karaoke' ? 'Karaoke' : booking.type === 'massage' ? 'Massage' : booking.type === 'restaurant' ? 'Nhà hàng' : booking.type}
                          </span>
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-300">{booking.bookingDate}</TableCell>
                    <TableCell className="text-slate-300">{booking.bookingTime}</TableCell>
                    <TableCell>
                      <Select
                        defaultValue={normalizeBookingStatus(booking.status)}
                        onValueChange={(val) => handleStatusChange(booking.id, val)}
                      >
                        <SelectTrigger
                          className="min-w-[10rem] border-0 bg-transparent p-0 shadow-none [&[data-state=open]]:ring-0"
                        >
                          <SelectValue>
                            <Badge className={getStatusColor(booking.status)}>
                              {normalizeBookingStatus(booking.status)}
                            </Badge>
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={BOOKING_STATUSES.WAITING_FOR_CONFIRMATION}>
                            {BOOKING_STATUSES.WAITING_FOR_CONFIRMATION}
                          </SelectItem>
                          <SelectItem value={BOOKING_STATUSES.CONFIRMED}>
                            {BOOKING_STATUSES.CONFIRMED}
                          </SelectItem>
                          <SelectItem value={BOOKING_STATUSES.ARRIVED}>
                            {BOOKING_STATUSES.ARRIVED}
                          </SelectItem>
                          <SelectItem value={BOOKING_STATUSES.USING}>
                            {BOOKING_STATUSES.USING}
                          </SelectItem>
                          <SelectItem value={BOOKING_STATUSES.WAITING_TO_ARRIVE}>
                            {BOOKING_STATUSES.WAITING_TO_ARRIVE}
                          </SelectItem>
                          <SelectItem value={BOOKING_STATUSES.WAITING_FOR_PAYMENT}>
                            {BOOKING_STATUSES.WAITING_FOR_PAYMENT}
                          </SelectItem>
                          <SelectItem value={BOOKING_STATUSES.PAID}>
                            {BOOKING_STATUSES.PAID}
                          </SelectItem>
                          <SelectItem value={BOOKING_STATUSES.CANCELLED}>
                            {BOOKING_STATUSES.CANCELLED}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                    Không có đơn đặt phòng nào trong khoảng thời gian này
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
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
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CalendarIcon, Mic, Heart, Soup, Search } from 'lucide-react';
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
  const [users, setUsers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<any>(null);

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

  // Lọc ra các booking trong khoảng ngày được chọn và theo search query
  const filteredBookings = bookingList.filter(b => {
    // Filter by date range
    if (b.bookingDate) {
      const parts = b.bookingDate.split('/');
      let bookingDateObj: Date;
      if (parts.length === 3) {
        bookingDateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      } else {
        bookingDateObj = new Date(b.bookingDate + 'T00:00:00');
      }
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T23:59:59');
      if (bookingDateObj < start || bookingDateObj > end) return false;
    }

    // Filter by search query (username, userId, booking id)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const user = users[b.userId];
      const username = user?.username || user?.name || user?.nameKey || '';
      const searchableText = `${username} ${b.userId} ${b.id}`.toLowerCase();
      if (!searchableText.includes(q)) return false;
    }

    return true;
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

  // Fetch users data
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/list-users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        });
        const data = await res.json();
        if (data.users) {
          // Create map indexed by authUid for easy lookup
          const usersMap: Record<string, any> = {};
          data.users.forEach((user: any) => {
            // Map by authUid (Firebase UID used in bookings)
            if (user.authUid) {
              usersMap[user.authUid] = user;
            }
            // Also map by nameKey as fallback
            usersMap[user.nameKey] = user;
          });
          setUsers(usersMap);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    };
    fetchUsers();
  }, []);

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

  const handleClosePaymentDialog = () => {
    setPaymentDialogOpen(false);
    setSelectedBooking(null);
    setPaymentAmount('');
    setPaymentError('');
  };

  const handleOpenPayment = (booking: any) => {
    setSelectedBooking(booking);
    setPaymentAmount(String(booking.finalAmount ?? booking.totalEst ?? booking.totalAmount ?? ''));
    setPaymentError('');
    setPaymentDialogOpen(true);
  };

  const handleStatusChange = (bookingId: string, newStatus: string) => {
    const booking = bookingList.find((b) => b.id === bookingId);
    if (!booking) return;

    if (newStatus === BOOKING_STATUSES.PAID) {
      handleOpenPayment(booking);
      return;
    }

    const bookingRef = ref(db, `bookings/${bookingId}`);
    update(bookingRef, { status: newStatus });
  };

  const handleConfirmPayment = async () => {
    if (!selectedBooking) return;
    const amount = Number(paymentAmount.toString().replace(/[^0-9]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      setPaymentError('Vui lòng nhập số tiền thanh toán hợp lệ.');
      return;
    }

    try {
      const bookingRef = ref(db, `bookings/${selectedBooking.id}`);
      await update(bookingRef, {
        status: BOOKING_STATUSES.PAID,
        finalAmount: amount,
        paidAmount: amount,
      });
      setPaymentDialogOpen(false);
      setSelectedBooking(null);
      setPaymentAmount('');
    } catch (error) {
      console.error('Lỗi cập nhật thanh toán:', error);
      setPaymentError('Không thể cập nhật thanh toán. Vui lòng thử lại.');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Quản lý đặt phòng</h1>
        <p className="text-slate-400 mt-2">Xem và quản lý tất cả đơn đặt phòng</p>
      </div>

      {/* Search and Filters */}
      <Card className="bg-slate-800 border-slate-700 p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Search Bar */}
          <div className="relative flex-1 w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm theo tên người dùng, User ID..."
              autoComplete="off"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
            />
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center gap-2">
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
                filteredBookings.map((booking) => {
                  const user = users[booking.userId];
                  const username = user?.username || user?.name || user?.nameKey || booking.userId;
                  return (
                    <TableRow 
                      key={booking.id} 
                      className="border-slate-700 hover:bg-slate-700/50 cursor-pointer"
                      onClick={() => {
                        setSelectedBookingDetail(booking);
                        setDetailDialogOpen(true);
                      }}
                    >
                      <TableCell className="text-slate-300 text-xs">{booking.id}</TableCell>
                      <TableCell className="text-slate-300">
                        <div className="flex flex-col">
                          <span className="font-medium text-blue-400">{username}</span>
                          <span className="text-xs text-slate-500">{booking.userId}</span>
                        </div>
                      </TableCell>
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
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={normalizeBookingStatus(booking.status)}
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
                  );
                })
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

      {/* Booking Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white">Chi tiết đơn đặt phòng</DialogTitle>
            <DialogDescription className="text-slate-400">
              Thông tin chi tiết về đơn đặt phòng
            </DialogDescription>
          </DialogHeader>
          {selectedBookingDetail && (
            <div className="space-y-4 py-4">
              {/* User Info */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Thông tin khách hàng</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Tên người dùng</p>
                    <p className="text-sm text-white font-medium">
                      {users[selectedBookingDetail.userId]?.username || 
                       users[selectedBookingDetail.userId]?.name || 
                       users[selectedBookingDetail.userId]?.nameKey || 
                       selectedBookingDetail.userId}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">User ID</p>
                    <p className="text-sm text-slate-300">{selectedBookingDetail.userId}</p>
                  </div>
                </div>
              </div>

              {/* Booking Info */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Thông tin đơn hàng</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-slate-500">Mã đơn hàng</p>
                    <p className="text-sm text-white font-medium">{selectedBookingDetail.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Dịch vụ</p>
                    <Badge className={`${getServiceColor(selectedBookingDetail.type)} border mt-1`}>
                      <span className="flex items-center gap-1">
                        {getServiceIcon(selectedBookingDetail.type)}
                        <span className="capitalize">
                          {selectedBookingDetail.type === 'karaoke' ? 'Karaoke' : 
                           selectedBookingDetail.type === 'massage' ? 'Massage' : 
                           selectedBookingDetail.type === 'restaurant' ? 'Nhà hàng' : 
                           selectedBookingDetail.type}
                        </span>
                      </span>
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Ngày đặt</p>
                    <p className="text-sm text-white">{selectedBookingDetail.bookingDate}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Thời gian</p>
                    <p className="text-sm text-white">{selectedBookingDetail.bookingTime}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Trạng thái</p>
                    <Badge className={getStatusColor(selectedBookingDetail.status)}>
                      {normalizeBookingStatus(selectedBookingDetail.status)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Payment Details */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Chi tiết thanh toán</h3>
                <div className="space-y-2">
                  {/* Show service price if available */}
                  {selectedBookingDetail.servicePrice && Number(selectedBookingDetail.servicePrice) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Tiền dịch vụ:</span>
                      <span className="text-sm text-white">
                        {Number(selectedBookingDetail.servicePrice).toLocaleString('vi-VN')} VNĐ
                      </span>
                    </div>
                  )}
                  
                  {/* Show room price if available */}
                  {selectedBookingDetail.roomPrice && Number(selectedBookingDetail.roomPrice) > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-400">Tiền phòng:</span>
                      <span className="text-sm text-white">
                        {Number(selectedBookingDetail.roomPrice).toLocaleString('vi-VN')} VNĐ
                      </span>
                    </div>
                  )}
                  
                  {/* Show total amount (tổng tiền gốc) */}
                  {selectedBookingDetail.totalAmount && Number(selectedBookingDetail.totalAmount) > 0 && (
                    <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                      <span className="text-sm font-medium text-slate-300">Tổng tiền:</span>
                      <span className="text-sm font-bold text-white">
                        {Number(selectedBookingDetail.totalAmount).toLocaleString('vi-VN')} VNĐ
                      </span>
                    </div>
                  )}
                  
                  {/* Show final amount if available (ưu tiên cao nhất) */}
                  {selectedBookingDetail.finalAmount && Number(selectedBookingDetail.finalAmount) > 0 && (
                    <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                      <span className="text-sm font-medium text-slate-300">Tổng tiền cuối:</span>
                      <span className="text-sm font-bold text-green-400">
                        {Number(selectedBookingDetail.finalAmount).toLocaleString('vi-VN')} VNĐ
                      </span>
                    </div>
                  )}
                  
                  {/* Show paid amount if available */}
                  {selectedBookingDetail.paidAmount && Number(selectedBookingDetail.paidAmount) > 0 && (
                    <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                      <span className="text-sm font-medium text-slate-300">Tiền đã thanh toán:</span>
                      <span className="text-sm font-bold text-emerald-400">
                        {Number(selectedBookingDetail.paidAmount).toLocaleString('vi-VN')} VNĐ
                      </span>
                    </div>
                  )}
                  
                  {/* Show totalEst as fallback (chỉ khi các trường khác không có) */}
                  {!selectedBookingDetail.finalAmount && 
                   !selectedBookingDetail.paidAmount && 
                   !selectedBookingDetail.totalAmount && 
                   selectedBookingDetail.totalEst && 
                   Number(selectedBookingDetail.totalEst) > 0 &&
                   Number(selectedBookingDetail.totalEst) < 1000000000 && (
                    <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                      <span className="text-sm font-medium text-slate-300">Tiền thanh toán:</span>
                      <span className="text-sm font-bold text-emerald-400">
                        {Number(selectedBookingDetail.totalEst).toLocaleString('vi-VN')} VNĐ
                      </span>
                    </div>
                  )}
                  
                  {/* Show points earned if available */}
                  {selectedBookingDetail.pointsEarned && Number(selectedBookingDetail.pointsEarned) > 0 && (
                    <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                      <span className="text-sm font-medium text-slate-300">Điểm tích lũy:</span>
                      <span className="text-sm font-bold text-amber-400">
                        +{Number(selectedBookingDetail.pointsEarned).toLocaleString('vi-VN')} điểm
                      </span>
                    </div>
                  )}
                  
                  {/* Show message if no payment info */}
                  {!selectedBookingDetail.servicePrice && 
                   !selectedBookingDetail.roomPrice && 
                   !selectedBookingDetail.totalAmount && 
                   !selectedBookingDetail.finalAmount && 
                   !selectedBookingDetail.paidAmount && 
                   (!selectedBookingDetail.totalEst || Number(selectedBookingDetail.totalEst) === 0 || Number(selectedBookingDetail.totalEst) >= 1000000000) && (
                    <p className="text-sm text-slate-500 italic">Chưa có thông tin thanh toán</p>
                  )}
                </div>
              </div>

              {/* Additional Details */}
              {selectedBookingDetail.notes && (
                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">Ghi chú</h3>
                  <p className="text-sm text-slate-300">{selectedBookingDetail.notes}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Thời gian</h3>
                <div className="grid grid-cols-2 gap-3">
                  {selectedBookingDetail.createdAt && (
                    <div>
                      <p className="text-xs text-slate-500">Tạo lúc</p>
                      <p className="text-sm text-slate-300">
                        {new Date(selectedBookingDetail.createdAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  )}
                  {selectedBookingDetail.updatedAt && (
                    <div>
                      <p className="text-xs text-slate-500">Cập nhật lúc</p>
                      <p className="text-sm text-slate-300">
                        {new Date(selectedBookingDetail.updatedAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button 
              onClick={() => setDetailDialogOpen(false)}
              className="bg-slate-700 hover:bg-slate-600 text-white"
            >
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-white">Xác nhận thanh toán</DialogTitle>
            <DialogDescription className="text-slate-400">
              Nhập số tiền khách hàng đã thanh toán cho đơn đặt phòng này.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="payment-amount" className="text-slate-300">Số tiền thanh toán (VNĐ)</Label>
              <Input
                id="payment-amount"
                type="text"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="Nhập số tiền..."
                className="bg-slate-900 border border-slate-700 text-white"
              />
              {paymentError && (
                <p className="text-red-400 text-sm">{paymentError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleClosePaymentDialog} className="border-slate-600 text-slate-300 hover:bg-slate-700">
              Hủy
            </Button>
            <Button onClick={handleConfirmPayment} className="bg-green-600 hover:bg-green-700 text-white">
              Xác nhận thanh toán
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

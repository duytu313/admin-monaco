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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { CalendarIcon } from 'lucide-react';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Đã hoàn thành':
      return 'bg-green-500/20 text-green-400';
    case 'Đang diễn ra':
      return 'bg-blue-500/20 text-blue-400';
    case 'Đã đặt':
      return 'bg-yellow-500/20 text-yellow-400';
    default:
      return 'bg-slate-500/20 text-slate-400';
  }
};

const hours = Array.from({ length: 14 }, (_, i) => i + 10); // 10:00 to 23:00

// Helper để tính toán vị trí trên lịch
const getBookingStyle = (timeStr: string) => {
  try {
    const [start, end] = timeStr.split(' - ');
    const startHour = parseInt(start.split(':')[0]) + parseInt(start.split(':')[1]) / 60;
    const endHour = parseInt(end.split(':')[0]) + parseInt(end.split(':')[1]) / 60;

    const top = (startHour - 10) * 80; // Mỗi tiếng cao 80px
    const height = (endHour - startHour) * 80;
    return { top: `${top}px`, height: `${height}px` };
  } catch (e) {
    return { top: '0px', height: '0px', display: 'none' };
  }
};

export default function BookingsPage() {
  const [bookingList, setBookingList] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Mặc định chọn ngày hôm nay
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    // format yyyy-mm-dd
    return today.toISOString().split('T')[0];
  });

  // Lọc ra các booking của ngày được chọn
  const filteredBookings = bookingList.filter(b => {
    if (!b.bookingDate) return true; // Nếu dữ liệu cũ không có ngày thì vẫn hiện để không bị mất
    const [y, m, d] = selectedDate.split('-');
    const format1 = selectedDate; // yyyy-mm-dd
    const format2 = `${d}/${m}/${y}`; // dd/mm/yyyy
    return b.bookingDate === format1 || b.bookingDate === format2 || b.bookingDate.includes(format2);
  });

  useEffect(() => {
    const bookingsRef = ref(db, 'bookings');
    const roomsRef = ref(db, 'rooms');

    const unsubBookings = onValue(bookingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          ...value
        }));
        setBookingList(list.reverse()); // Hiển thị mới nhất lên đầu
      } else {
        setBookingList([]);
      }
      setLoading(false);
    });

    const unsubRooms = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          ...value
        }));
        setRooms(list);
      }
    });

    return () => {
      unsubBookings();
      unsubRooms();
    };
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

      <Tabs defaultValue="list" className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <TabsList className="bg-slate-800 border border-slate-700">
            <TabsTrigger value="list" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">Danh sách</TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400">Lịch theo giờ</TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-md px-3 py-1">
            <CalendarIcon className="w-4 h-4 text-slate-400" />
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-300 text-sm outline-none border-none focus:ring-0 [&::-webkit-calendar-picker-indicator]:filter [&::-webkit-calendar-picker-indicator]:invert"
            />
          </div>
        </div>

        <TabsContent value="list">
          <Card className="bg-slate-800 border-slate-700 p-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-300">ID</TableHead>
                    <TableHead className="text-slate-300">User ID</TableHead>
                    <TableHead className="text-slate-300">Dịch vụ</TableHead>
                    <TableHead className="text-slate-300">Thời gian</TableHead>
                    <TableHead className="text-slate-300">Trạng thái</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.length > 0 ? (
                    filteredBookings.map((booking) => (
                      <TableRow key={booking.id} className="border-slate-700 hover:bg-slate-700/50">
                        <TableCell className="text-slate-300">{booking.id}</TableCell>
                        <TableCell className="text-slate-300">{booking.userId}</TableCell>
                        <TableCell className="text-slate-300">{booking.type}</TableCell>
                        <TableCell className="text-slate-300">{booking.bookingTime}</TableCell>
                        <TableCell>
                          <Select
                            defaultValue={booking.status || 'Chưa xác nhận'}
                            onValueChange={(val) => handleStatusChange(booking.id, val)}
                          >
                            <SelectTrigger
                              className="min-w-[10rem] border-0 bg-transparent p-0 shadow-none [&[data-state=open]]:ring-0"
                            >
                              <SelectValue>
                                <Badge className={getStatusColor(booking.status || 'Chưa xác nhận')}>
                                  {booking.status || 'Chưa xác nhận'}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Chưa xác nhận">Chưa xác nhận</SelectItem>
                              <SelectItem value="Đã xác nhận">Đã xác nhận</SelectItem>
                              <SelectItem value="Đã huỷ">Đã huỷ</SelectItem>
                              <SelectItem value="Đã đặt">Đã đặt</SelectItem>
                              <SelectItem value="Đang diễn ra">Đang diễn ra</SelectItem>
                              <SelectItem value="Đã hoàn thành">Đã hoàn thành</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                        Không có đơn đặt phòng nào trong ngày này
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="calendar">
          <Card className="bg-slate-800 border-slate-700 p-6 overflow-x-auto">
            <div className="min-w-[800px]">
              <div className="grid grid-cols-[80px_1fr] gap-4">
                {/* Headers */}
                <div className="sticky left-0 bg-slate-800 z-10"></div>
                <div className="grid grid-cols-4 gap-4">
                  {rooms.slice(0, 4).map(room => (
                    <div key={room.id} className="text-center font-bold text-slate-300 pb-4 border-b border-slate-700">
                      {room.name}
                    </div>
                  ))}
                </div>

                {/* Timeline Grid */}
                <div className="flex flex-col border-r border-slate-700 pr-4">
                  {hours.map(hour => (
                    <div key={hour} className="h-20 flex items-start justify-end text-sm text-slate-500 font-medium relative top-[-10px]">
                      {hour}:00
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-4 gap-4 relative mt-2">
                  {/* Các đường kẻ khung giờ */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col">
                    {hours.map(hour => (
                      <div key={`line-${hour}`} className="h-20 border-t border-slate-700 border-dashed w-full opacity-50"></div>
                    ))}
                  </div>

                  {rooms.slice(0, 4).map((room) => (
                    <div key={`col-${room.id}`} className="relative border-l border-slate-700/50 pl-2 min-h-[1120px] bg-slate-800/30">
                      {filteredBookings
                        .filter((b) => (b.roomId === room.id || b.roomName === room.name) && b.status !== 'Đã huỷ')
                        .map((booking) => {
                          const style = getBookingStyle(booking.bookingTime || '');
                          return (
                            <div
                              key={booking.id}
                              className={`absolute left-2 right-2 border rounded-md p-2 flex flex-col z-10 overflow-hidden ${booking.status === 'Đã hoàn thành' ? 'bg-green-500/20 border-green-500/50' : 'bg-blue-500/20 border-blue-500/50'}`}
                              style={style}
                            >
                              <span className={`font-bold text-[10px] sm:text-xs truncate ${booking.status === 'Đã hoàn thành' ? 'text-green-400' : 'text-blue-400'}`}>{booking.userId}</span>
                              <span className="text-slate-300/80 text-[10px] mt-1">{booking.bookingTime}</span>
                            </div>
                          );
                        })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

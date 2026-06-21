'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { db } from '@/lib/firebase-config';
import { ref, onValue, push, set, remove, get } from 'firebase/database';
import { ArrowLeft, Plus, Trash2, Mic, Heart, Soup } from 'lucide-react';

interface FacilityData {
  id: string;
  name: string;
  type: 'karaoke' | 'massage' | 'restaurant';
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  status: 'Available' | 'Occupied';
  currentCustomer?: string;
}

// Danh sách trạng thái booking chiếm phòng
const OCCUPYING_STATUSES = ['Đang dùng', 'Đã đến', 'Chờ đến', 'Đã xác nhận', 'Chờ thanh toán'];

const facilityTypeLabels: Record<string, string> = {
  karaoke: 'Karaoke',
  massage: 'Massage',
  restaurant: 'Nhà hàng',
};

const facilityTypeIcons: Record<string, React.ReactNode> = {
  karaoke: <Mic size={18} />,
  massage: <Heart size={18} />,
  restaurant: <Soup size={18} />,
};

export default function FacilityDetailPage() {
  const params = useParams();
  const router = useRouter();
  const facilityId = params.id as string;

  const [facility, setFacility] = useState<FacilityData | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    capacity: '',
  });

  useEffect(() => {
    if (!facilityId) return;

    // Fetch facility info
    const facilityRef = ref(db, `facilities/${facilityId}`);
    get(facilityRef).then((snapshot) => {
      const data = snapshot.val();
      if (data) {
        setFacility({
          id: facilityId,
          name: data.name || '',
          type: data.type || 'karaoke',
        });
        setLoading(false);
      } else {
        setErrorMsg('Không tìm thấy cơ sở này.');
        setLoading(false);
      }
    }).catch((error) => {
      console.error('Firebase Read Error:', error);
      setErrorMsg('Không thể tải thông tin cơ sở.');
      setLoading(false);
    });

    // Fetch rooms under this facility
    const roomsRef = ref(db, `facilities/${facilityId}/rooms`);
    const unsubRooms = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([key, value]: [string, any]) => ({
          id: key,
          name: value.name || '',
          capacity: value.capacity || 1,
          status: value.status || 'Available',
          currentCustomer: value.currentCustomer || '',
        }));
        setRooms(list);
      } else {
        setRooms([]);
      }
      setLoading(false);
      setErrorMsg('');
    }, (error) => {
      console.error('Firebase Read Error:', error);
      if (!errorMsg) {
        setErrorMsg('Không thể tải danh sách phòng/bàn.');
      }
      setLoading(false);
    });

    // Listen to all bookings to sync room status
    const bookingsRef = ref(db, 'bookings');
    const unsubBookings = onValue(bookingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, value]: [string, any]) => ({
          id,
          ...value,
        }));
        setAllBookings(list);
      } else {
        setAllBookings([]);
      }
    });

    return () => {
      unsubRooms();
      unsubBookings();
    };
  }, [facilityId]);

  // Tính trạng thái phòng dựa trên booking thực tế
  const syncedRooms = useMemo(() => {
    return rooms.map((room) => {
      // Tìm booking đang active cho phòng này
      const activeBooking = allBookings.find((b) => {
        if (b.status === 'Đã hủy' || b.status === 'Đã thanh toán') return false;
        const roomName = b.room || b.roomName || '';
        return roomName === room.name || roomName === room.id;
      });

      if (activeBooking) {
        return {
          ...room,
          status: 'Occupied' as const,
          currentCustomer: activeBooking.name || activeBooking.customerName || 'Đã đặt',
        };
      }
      return {
        ...room,
        status: 'Available' as const,
        currentCustomer: '',
      };
    });
  }, [rooms, allBookings]);

  const getRoomLabel = () => {
    if (!facility) return 'phòng';
    switch (facility.type) {
      case 'restaurant': return 'bàn';
      case 'massage': return 'phòng';
      case 'karaoke': return 'phòng';
      default: return 'phòng';
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.name || !newRoom.capacity) return;

    setIsSubmitting(true);
    try {
      const roomsRef = ref(db, `facilities/${facilityId}/rooms`);
      const newRoomRef = push(roomsRef);

      await set(newRoomRef, {
        name: newRoom.name,
        capacity: parseInt(newRoom.capacity),
        status: 'Available',
        currentCustomer: '',
      });

      setNewRoom({ name: '', capacity: '' });
      setIsAddModalOpen(false);
      alert(`Thêm ${getRoomLabel()} thành công!`);
    } catch (error) {
      console.error('Firebase Write Error:', error);
      const message = error instanceof Error ? error.message : 'Lỗi không xác định';
      alert(`Không thể lưu ${getRoomLabel()}: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteRoom = async (roomId: string, roomName: string) => {
    const label = getRoomLabel();
    if (!confirm(`Bạn có chắc muốn xóa ${label} "${roomName}"?`)) return;

    try {
      await remove(ref(db, `facilities/${facilityId}/rooms/${roomId}`));
      alert(`Xóa ${label} thành công!`);
    } catch (error) {
      console.error('Firebase Delete Error:', error);
      alert(`Không thể xóa ${label}. Vui lòng thử lại.`);
    }
  };

  if (loading) {
    return (
      <div className="text-center text-slate-400 py-12">Đang tải...</div>
    );
  }

  if (errorMsg && !facility) {
    return (
      <div className="space-y-4">
        <Button
          variant="ghost"
          className="text-slate-400 hover:text-white"
          onClick={() => router.push('/dashboard/facilities')}
        >
          <ArrowLeft size={20} className="mr-2" /> Quay lại danh sách cơ sở
        </Button>
        <Card className="bg-slate-800 border-slate-700 p-6">
          <p className="text-center text-red-400 font-medium">{errorMsg}</p>
        </Card>
      </div>
    );
  }

  const roomLabel = getRoomLabel();
  const roomLabelPlural = roomLabel === 'bàn' ? 'bàn' : 'phòng';

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          className="text-slate-400 hover:text-white"
          onClick={() => router.push('/dashboard/facilities')}
        >
          <ArrowLeft size={20} className="mr-2" /> Quay lại
        </Button>
      </div>

      {/* Facility info */}
      <Card className="bg-slate-800 border-slate-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg border ${
              facility?.type === 'karaoke' ? 'bg-purple-500/20 text-purple-400 border-purple-500/30' :
              facility?.type === 'massage' ? 'bg-pink-500/20 text-pink-400 border-pink-500/30' :
              'bg-orange-500/20 text-orange-400 border-orange-500/30'
            }`}>
              {facility?.type ? facilityTypeIcons[facility.type] : null}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{facility?.name}</h1>
              <p className="text-slate-400 text-sm">
                {facility?.type ? facilityTypeLabels[facility.type] : ''} - {rooms.length} {roomLabelPlural} ({syncedRooms.filter(r => r.status === 'Occupied').length} đang dùng)
              </p>
            </div>
          </div>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            <Plus size={18} className="mr-2" /> Thêm {roomLabel} mới
          </Button>
        </div>
      </Card>

      {/* Rooms table */}
      <Card className="bg-slate-800 border-slate-700 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">
            Danh sách {roomLabelPlural}
          </h2>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700">
              <TableHead className="text-slate-300">Mã</TableHead>
              <TableHead className="text-slate-300">Tên {roomLabel}</TableHead>
              <TableHead className="text-slate-300">Sức chứa</TableHead>
              <TableHead className="text-slate-300">Trạng thái</TableHead>
              <TableHead className="text-slate-300">Khách hiện tại</TableHead>
              <TableHead className="text-slate-300">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rooms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                  Chưa có {roomLabel} nào trong cơ sở này.
                </TableCell>
              </TableRow>
            ) : (
              syncedRooms.map((room) => (
                <TableRow key={room.id} className="border-slate-700 hover:bg-slate-700/50">
                  <TableCell className="text-slate-300 font-medium">{room.id}</TableCell>
                  <TableCell className="text-slate-300 font-semibold">{room.name}</TableCell>
                  <TableCell className="text-slate-300">{room.capacity} người</TableCell>
                  <TableCell>
                    <Badge className={
                      room.status === 'Occupied'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-green-500/20 text-green-400'
                    }>
                      {room.status === 'Occupied' ? 'Đang sử dụng' : 'Trống'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {room.currentCustomer || '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => handleDeleteRoom(room.id, room.name)}
                    >
                      <Trash2 size={16} className="mr-1" />
                      Xóa
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* MODAL THÊM PHÒNG/BÀN */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="bg-slate-800 border-slate-700 w-full max-w-md p-6 relative shadow-2xl">
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl"
              onClick={() => setIsAddModalOpen(false)}
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">Thêm {roomLabel} mới</h2>

            <form onSubmit={handleAddRoom} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300">
                  Tên {roomLabel}
                </Label>
                <Input
                  id="name"
                  placeholder={roomLabel === 'bàn' ? 'VD: Bàn số 1' : 'VD: Phòng 101'}
                  className="bg-slate-900 border-slate-700 text-white"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity" className="text-slate-300">Sức chứa (người)</Label>
                <Input
                  id="capacity"
                  type="number"
                  placeholder="VD: 10"
                  className="bg-slate-900 border-slate-700 text-white"
                  value={newRoom.capacity}
                  onChange={(e) => setNewRoom({ ...newRoom, capacity: e.target.value })}
                  required
                />
              </div>

              <div className="flex gap-4 mt-8">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 text-slate-300 hover:bg-slate-700"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  {isSubmitting ? 'Đang lưu...' : `Lưu ${roomLabel}`}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
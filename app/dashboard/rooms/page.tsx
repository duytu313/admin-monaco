'use client';

import { useState, useEffect } from 'react';
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
import { db } from '@/lib/firebase-config';
import { ref, onValue, push, set } from 'firebase/database';

interface Room {
  id: string;
  name: string;
  capacity: number;
  status: 'Occupied' | 'Available' | 'Empty';
  currentCustomer?: string;
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({
    name: '',
    capacity: '',
    status: 'Available' as const
  });

  useEffect(() => {
    const roomsRef = ref(db, 'rooms');
    const unsubscribe = onValue(roomsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([key, value]: [string, any]) => ({
          id: key,
          ...value,
        }));
        setRooms(list);
      } else {
        setRooms([]);
      }
      setLoading(false);
      setErrorMsg('');
    }, (error) => {
      console.error("Firebase Read Error:", error);
      setErrorMsg('Không có quyền truy cập dữ liệu phòng (Permission Denied). Vui lòng kiểm tra Firebase Rules cho node "rooms".');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoom.name || !newRoom.capacity) return;

    setIsSubmitting(true);
    try {
      const roomsRef = ref(db, 'rooms');
      const newRoomRef = push(roomsRef);
      
      await set(newRoomRef, {
        name: newRoom.name,
        capacity: parseInt(newRoom.capacity),
        status: newRoom.status,
        currentCustomer: ''
      });

      setNewRoom({ name: '', capacity: '', status: 'Available' });
      setIsAddModalOpen(false);
      alert("Thêm phòng thành công!");
    } catch (error) {
      console.error("Firebase Write Error:", error);
      const message = error instanceof Error ? error.message : "Lỗi không xác định";
      alert(`Không thể lưu phòng: ${message}\n\nLưu ý: Hãy kiểm tra lại Project ID trong .env.local và Security Rules trên Firebase.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Quản lý phòng</h1>
        <Button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
        >
          + Thêm phòng mới
        </Button>
      </div>

      <Card className="bg-slate-800 border-slate-700 p-6">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700">
              <TableHead className="text-slate-300">Mã phòng</TableHead>
              <TableHead className="text-slate-300">Tên phòng</TableHead>
              <TableHead className="text-slate-300">Sức chứa</TableHead>
              <TableHead className="text-slate-300">Trạng thái</TableHead>
              <TableHead className="text-slate-300">Khách hiện tại</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-8">Đang tải...</TableCell></TableRow>
            ) : errorMsg ? (
              <TableRow><TableCell colSpan={5} className="text-center text-red-400 py-8 font-medium">{errorMsg}</TableCell></TableRow>
            ) : rooms.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-slate-400 py-8">Không tìm thấy dữ liệu phòng nào trong Database.</TableCell></TableRow>
            ) : (
              rooms.map((room) => (
                <TableRow key={room.id} className="border-slate-700 hover:bg-slate-700/50">
                  <TableCell className="text-slate-300 font-medium">{room.id}</TableCell>
                  <TableCell className="text-slate-300">{room.name}</TableCell>
                  <TableCell className="text-slate-300">{room.capacity} người</TableCell>
                  <TableCell>
                    <Badge className={room.status === 'Occupied' ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}>
                      {room.status === 'Occupied' ? 'Đang sử dụng' : 'Trống'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-300">{room.currentCustomer || '-'}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* MODAL THÊM PHÒNG */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="bg-slate-800 border-slate-700 w-full max-w-md p-6 relative shadow-2xl">
            <button 
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl"
              onClick={() => setIsAddModalOpen(false)}
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">Thêm phòng mới</h2>
            
            <form onSubmit={handleAddRoom} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300">Tên phòng</Label>
                <Input 
                  id="name"
                  placeholder="VD: Phòng 101" 
                  className="bg-slate-900 border-slate-700 text-white"
                  value={newRoom.name}
                  onChange={(e) => setNewRoom({...newRoom, name: e.target.value})}
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
                  onChange={(e) => setNewRoom({...newRoom, capacity: e.target.value})}
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
                  {isSubmitting ? 'Đang lưu...' : 'Lưu phòng'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { db } from '@/lib/firebase-config';
import { ref, onValue, push, set, remove } from 'firebase/database';
import Link from 'next/link';
import { Trash2, Eye, Mic, Soup, Heart } from 'lucide-react';

interface Facility {
  id: string;
  name: string;
  type: 'karaoke' | 'massage' | 'restaurant';
  roomCount: number;
}

const facilityTypeLabels: Record<string, string> = {
  karaoke: 'Karaoke',
  massage: 'Massage',
  restaurant: 'Nhà hàng',
};

const facilityTypeIcons: Record<string, React.ReactNode> = {
  karaoke: <Mic size={16} />,
  massage: <Heart size={16} />,
  restaurant: <Soup size={16} />,
};

const facilityTypeColors: Record<string, string> = {
  karaoke: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  massage: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  restaurant: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFacility, setNewFacility] = useState({
    name: '',
    type: '' as string,
  });

  useEffect(() => {
    const facilitiesRef = ref(db, 'facilities');
    const unsubscribe = onValue(facilitiesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([key, value]: [string, any]) => ({
          id: key,
          name: value.name || '',
          type: value.type || 'karaoke',
          roomCount: value.rooms ? Object.keys(value.rooms).length : 0,
        }));
        setFacilities(list);
      } else {
        setFacilities([]);
      }
      setLoading(false);
      setErrorMsg('');
    }, (error) => {
      console.error('Firebase Read Error:', error);
      setErrorMsg('Không thể tải dữ liệu cơ sở. Vui lòng kiểm tra kết nối và Firebase Rules.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddFacility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFacility.name || !newFacility.type) return;

    setIsSubmitting(true);
    try {
      const facilitiesRef = ref(db, 'facilities');
      const newFacilityRef = push(facilitiesRef);

      await set(newFacilityRef, {
        name: newFacility.name,
        type: newFacility.type,
        createdAt: Date.now(),
        rooms: {},
      });

      setNewFacility({ name: '', type: '' });
      setIsAddModalOpen(false);
      alert('Thêm cơ sở thành công!');
    } catch (error) {
      console.error('Firebase Write Error:', error);
      const message = error instanceof Error ? error.message : 'Lỗi không xác định';
      alert(`Không thể lưu cơ sở: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFacility = async (id: string, name: string) => {
    if (!confirm(`Bạn có chắc muốn xóa cơ sở "${name}"? Tất cả phòng/bàn trong cơ sở này sẽ bị xóa.`)) return;

    try {
      await remove(ref(db, `facilities/${id}`));
      alert('Xóa cơ sở thành công!');
    } catch (error) {
      console.error('Firebase Delete Error:', error);
      alert('Không thể xóa cơ sở. Vui lòng thử lại.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Quản lý cơ sở</h1>
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
        >
          + Thêm cơ sở mới
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(['karaoke', 'massage', 'restaurant'] as const).map((type) => {
          const count = facilities.filter((f) => f.type === type).length;
          return (
            <Card key={type} className="bg-slate-800 border-slate-700 p-4">
              <div className="flex items-center gap-3">
                <div className={`p-3 rounded-lg ${facilityTypeColors[type]} border`}>
                  {facilityTypeIcons[type]}
                </div>
                <div>
                  <p className="text-sm text-slate-400">{facilityTypeLabels[type]}</p>
                  <p className="text-2xl font-bold text-white">{count}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="bg-slate-800 border-slate-700 p-6">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700">
              <TableHead className="text-slate-300">Mã cơ sở</TableHead>
              <TableHead className="text-slate-300">Tên cơ sở</TableHead>
              <TableHead className="text-slate-300">Loại</TableHead>
              <TableHead className="text-slate-300">Số phòng/bàn</TableHead>
              <TableHead className="text-slate-300">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                  Đang tải...
                </TableCell>
              </TableRow>
            ) : errorMsg ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-red-400 py-8 font-medium">
                  {errorMsg}
                </TableCell>
              </TableRow>
            ) : facilities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-400 py-8">
                  Chưa có cơ sở nào. Hãy thêm cơ sở đầu tiên!
                </TableCell>
              </TableRow>
            ) : (
              facilities.map((facility) => (
                <TableRow key={facility.id} className="border-slate-700 hover:bg-slate-700/50">
                  <TableCell className="text-slate-300 font-medium">{facility.id}</TableCell>
                  <TableCell className="text-slate-300 font-semibold">{facility.name}</TableCell>
                  <TableCell>
                    <Badge className={`${facilityTypeColors[facility.type]} border`}>
                      <span className="flex items-center gap-1">
                        {facilityTypeIcons[facility.type]}
                        {facilityTypeLabels[facility.type]}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-300">{facility.roomCount} phòng/bàn</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Link href={`/dashboard/facilities/${facility.id}`}>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                        >
                          <Eye size={16} className="mr-1" />
                          Xem
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => handleDeleteFacility(facility.id, facility.name)}
                      >
                        <Trash2 size={16} className="mr-1" />
                        Xóa
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* MODAL THÊM CƠ SỞ */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="bg-slate-800 border-slate-700 w-full max-w-md p-6 relative shadow-2xl">
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl"
              onClick={() => setIsAddModalOpen(false)}
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">Thêm cơ sở mới</h2>

            <form onSubmit={handleAddFacility} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300">Tên cơ sở</Label>
                <Input
                  id="name"
                  placeholder="VD: Karaoke 999, Massage Thư giãn..."
                  className="bg-slate-900 border-slate-700 text-white"
                  value={newFacility.name}
                  onChange={(e) => setNewFacility({ ...newFacility, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type" className="text-slate-300">Loại cơ sở</Label>
                <Select
                  value={newFacility.type}
                  onValueChange={(value) => setNewFacility({ ...newFacility, type: value })}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Chọn loại cơ sở" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="karaoke">
                      <span className="flex items-center gap-2">
                        <Mic size={16} /> Karaoke
                      </span>
                    </SelectItem>
                    <SelectItem value="massage">
                      <span className="flex items-center gap-2">
                        <Heart size={16} /> Massage
                      </span>
                    </SelectItem>
                    <SelectItem value="restaurant">
                      <span className="flex items-center gap-2">
                        <Soup size={16} /> Nhà hàng
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
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
                  disabled={isSubmitting || !newFacility.type}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  {isSubmitting ? 'Đang lưu...' : 'Lưu cơ sở'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { db } from '@/lib/firebase-config';
import { ref, onValue, push, set, update, remove } from 'firebase/database';
import { Plus, Pencil, Trash2, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Promotion {
  id: string;
  title: string;
  subtitle?: string;
  content: string;
  startDate: string;
  endDate: string;
  imageUrl: string;
  isActive: boolean;
  featured?: boolean;
  rules?: string[];
}

// Form mặc định cho modal thêm/sửa
const emptyForm = {
  title: '',
  subtitle: '',
  content: '',
  startDate: '',
  endDate: '',
  imageUrl: '/images/placeholder.jpg',
  isActive: true,
  featured: false,
  rules: [''],
};

export default function PromotionsPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setError('Firebase chưa sẵn sàng');
      setLoading(false);
      return;
    }

    const newsRef = ref(db, 'news');
    const unsub = onValue(newsRef, (snapshot) => {
      try {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const list = Object.keys(data).map(key => ({
            id: key,
            ...data[key],
          }));
          // Sắp xếp: featured lên đầu, sau đó theo thời gian
          list.sort((a, b) => {
            if (a.featured && !b.featured) return -1;
            if (!a.featured && b.featured) return 1;
            return 0;
          });
          setPromotions(list);
        } else {
          setPromotions([]);
        }
        setError(null);
      } catch (err) {
        console.error('[Promotions] Error:', err);
        setError('Lỗi đọc dữ liệu khuyến mãi');
      }
      setLoading(false);
    }, (err) => {
      console.error('[Promotions] Firebase error:', err);
      setError('Không thể đọc dữ liệu khuyến mãi. Kiểm tra quyền truy cập.');
      setLoading(false);
    });

    return () => unsub();
  }, []);

  /** Mở modal thêm mới */
  const openAddModal = () => {
    setEditingId(null);
    setForm({
      title: '',
      subtitle: '',
      content: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      imageUrl: '/images/placeholder.jpg',
      isActive: true,
      featured: false,
      rules: [''],
    });
    setIsModalOpen(true);
  };

  /** Mở modal sửa */
  const openEditModal = (promo: Promotion) => {
    setEditingId(promo.id);
    setForm({
      title: promo.title,
      subtitle: promo.subtitle || '',
      content: promo.content,
      startDate: promo.startDate?.split('T')[0] || '',
      endDate: promo.endDate?.split('T')[0] || '',
      imageUrl: promo.imageUrl || '/images/placeholder.jpg',
      isActive: promo.isActive ?? true,
      featured: promo.featured || false,
      rules: promo.rules?.length ? promo.rules : [''],
    });
    setIsModalOpen(true);
  };

  /** Xử lý submit form */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    if (!form.title || !form.content) {
      toast.error('Vui lòng nhập tiêu đề và nội dung!');
      return;
    }

    setIsSubmitting(true);
    try {
      const promoData = {
        title: form.title,
        subtitle: form.subtitle,
        content: form.content,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : '',
        endDate: form.endDate ? new Date(form.endDate).toISOString() : '',
        imageUrl: form.imageUrl || '/images/placeholder.jpg',
        isActive: form.isActive,
        featured: form.featured,
        rules: form.rules.filter(r => r.trim() !== ''),
      };

      const newsRef = ref(db, 'news');

      if (editingId) {
        // Cập nhật
        await update(ref(db, `news/${editingId}`), promoData);
        toast.success('Cập nhật khuyến mãi thành công!');
      } else {
        // Thêm mới
        const newRef = push(newsRef);
        await set(newRef, {
          id: newRef.key,
          ...promoData,
        });
        toast.success('Thêm khuyến mãi thành công!');
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error('[Promotions] Submit error:', err);
      toast.error('Lỗi: ' + (err.message || 'Không thể lưu dữ liệu'));
    } finally {
      setIsSubmitting(false);
    }
  };

  /** Xoá khuyến mãi */
  const handleDelete = async (id: string) => {
    if (!db) return;
    try {
      await remove(ref(db, `news/${id}`));
      toast.success('Đã xoá khuyến mãi!');
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error('Lỗi khi xoá: ' + (err.message || ''));
    }
  };

  /** Cập nhật rule tại index */
  const updateRule = (index: number, value: string) => {
    const newRules = [...form.rules];
    newRules[index] = value;
    setForm({ ...form, rules: newRules });
  };

  /** Thêm rule mới */
  const addRule = () => {
    setForm({ ...form, rules: [...form.rules, ''] });
  };

  /** Xoá rule */
  const removeRule = (index: number) => {
    const newRules = form.rules.filter((_, i) => i !== index);
    setForm({ ...form, rules: newRules.length ? newRules : [''] });
  };

  const getStatusBadge = (promo: Promotion) => {
    const now = Date.now();
    const start = promo.startDate ? new Date(promo.startDate).getTime() : 0;
    const end = promo.endDate ? new Date(promo.endDate).getTime() : Infinity;

    if (!promo.isActive) {
      return <Badge className="bg-slate-500/20 text-slate-400 border-none">Tắt</Badge>;
    }
    if (now < start) {
      return <Badge className="bg-blue-500/20 text-blue-400 border-none">Sắp diễn ra</Badge>;
    }
    if (now > end) {
      return <Badge className="bg-red-500/20 text-red-400 border-none">Hết hạn</Badge>;
    }
    return <Badge className="bg-green-500/20 text-green-400 border-none">Đang chạy</Badge>;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Quản lý Khuyến mãi</h1>
          <p className="text-slate-400 mt-2">Thêm, sửa, xoá các chương trình khuyến mãi</p>
        </div>
        <Button
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
        >
          <Plus className="w-4 h-4 mr-2" />
          Thêm khuyến mãi
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-900/30 border border-red-500/30 rounded-lg">
          <AlertCircle className="text-red-400 h-5 w-5 flex-shrink-0" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {/* Table */}
      <Card className="bg-slate-800 border-slate-700 p-6">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700">
              <TableHead className="text-slate-300">Tiêu đề</TableHead>
              <TableHead className="text-slate-300">Phụ đề</TableHead>
              <TableHead className="text-slate-300">Ngày bắt đầu</TableHead>
              <TableHead className="text-slate-300">Ngày kết thúc</TableHead>
              <TableHead className="text-slate-300">Trạng thái</TableHead>
              <TableHead className="text-slate-300 text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                  Đang tải dữ liệu...
                </TableCell>
              </TableRow>
            ) : promotions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                  Chưa có khuyến mãi nào. Nhấn "Thêm khuyến mãi" để tạo mới.
                </TableCell>
              </TableRow>
            ) : (
              promotions.map((promo) => (
                <TableRow key={promo.id} className="border-slate-700 hover:bg-slate-700/50">
                  <TableCell className="text-slate-200 font-medium">
                    {promo.featured && <span className="text-amber-400 mr-1">★</span>}
                    {promo.title}
                  </TableCell>
                  <TableCell className="text-slate-400 text-sm">{promo.subtitle || '-'}</TableCell>
                  <TableCell className="text-slate-300 text-sm">
                    {promo.startDate ? new Date(promo.startDate).toLocaleDateString('vi-VN') : '-'}
                  </TableCell>
                  <TableCell className="text-slate-300 text-sm">
                    {promo.endDate ? new Date(promo.endDate).toLocaleDateString('vi-VN') : '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(promo)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEditModal(promo)}
                        className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                        title="Sửa"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(promo.id)}
                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                        title="Xoá"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* === MODAL THÊM/SỬA === */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="bg-slate-800 border-slate-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl">
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-xl"
              onClick={() => setIsModalOpen(false)}
            >
              ✕
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingId ? 'Sửa khuyến mãi' : 'Thêm khuyến mãi mới'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Tiêu đề */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-slate-300">Tiêu đề *</Label>
                <Input
                  id="title"
                  placeholder="VD: Giờ Vàng Karaoke"
                  className="bg-slate-900 border-slate-700 text-white"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />
              </div>

              {/* Phụ đề */}
              <div className="space-y-2">
                <Label htmlFor="subtitle" className="text-slate-300">Phụ đề</Label>
                <Input
                  id="subtitle"
                  placeholder="VD: Giảm 30% khung giờ 14h-17h"
                  className="bg-slate-900 border-slate-700 text-white"
                  value={form.subtitle}
                  onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                />
              </div>

              {/* Nội dung */}
              <div className="space-y-2">
                <Label htmlFor="content" className="text-slate-300">Nội dung *</Label>
                <textarea
                  id="content"
                  rows={4}
                  placeholder="Mô tả chi tiết chương trình khuyến mãi..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  required
                />
              </div>

              {/* Ngày tháng */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="text-slate-300">Ngày bắt đầu</Label>
                  <Input
                    id="startDate"
                    type="date"
                    className="bg-slate-900 border-slate-700 text-white"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="text-slate-300">Ngày kết thúc</Label>
                  <Input
                    id="endDate"
                    type="date"
                    className="bg-slate-900 border-slate-700 text-white"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
              </div>

              {/* Image URL */}
              <div className="space-y-2">
                <Label htmlFor="imageUrl" className="text-slate-300">URL hình ảnh</Label>
                <Input
                  id="imageUrl"
                  placeholder="/images/placeholder.jpg"
                  className="bg-slate-900 border-slate-700 text-white"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                />
              </div>

              {/* Tuỳ chọn */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-900"
                  />
                  Đang hoạt động
                </label>
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-900"
                  />
                  Nổi bật
                </label>
              </div>

              {/* Rules */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-slate-300">Điều khoản áp dụng</Label>
                  <button
                    type="button"
                    onClick={addRule}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    + Thêm điều khoản
                  </button>
                </div>
                {form.rules.map((rule, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder={`Điều khoản ${index + 1}`}
                      className="bg-slate-900 border-slate-700 text-white flex-1"
                      value={rule}
                      onChange={(e) => updateRule(index, e.target.value)}
                    />
                    {form.rules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeRule(index)}
                        className="text-red-400 hover:text-red-300 px-2"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Submit */}
              <div className="flex gap-4 pt-4 border-t border-slate-700">
                <Button
                  type="button"
                  variant="ghost"
                  className="flex-1 text-slate-300 hover:bg-slate-700"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  {isSubmitting ? 'Đang lưu...' : editingId ? 'Cập nhật' : 'Thêm mới'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* === MODAL XÁC NHẬN XOÁ === */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="bg-slate-800 border-slate-700 w-full max-w-sm p-6 relative shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-4">Xác nhận xoá</h2>
            <p className="text-slate-300 mb-6">
              Bạn có chắc chắn muốn xoá khuyến mãi này? Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-4">
              <Button
                onClick={() => setDeleteTarget(null)}
                variant="ghost"
                className="flex-1 text-slate-300 hover:bg-slate-700"
              >
                Hủy
              </Button>
              <Button
                onClick={() => handleDelete(deleteTarget)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold"
              >
                Xoá
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
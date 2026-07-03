'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Plus, Pencil, Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

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

type RoleTab = 'all' | 'admin' | 'receptionist' | 'customer';

const ROLE_SECTIONS: { key: RoleTab; label: string; color: string }[] = [
  { key: 'all', label: 'Tất cả', color: 'bg-blue-600 text-white' },
  { key: 'admin', label: 'Quản trị viên', color: 'bg-red-600 text-white' },
  { key: 'receptionist', label: 'Lễ tân', color: 'bg-purple-600 text-white' },
  { key: 'customer', label: 'Khách hàng', color: 'bg-green-600 text-white' },
];

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<RoleTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerProfile | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state for add
  const [newNameKey, setNewNameKey] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('customer');
  const [newPoints, setNewPoints] = useState('0');

  // Form state for edit
  const [editPoints, setEditPoints] = useState('');
  const [editRole, setEditRole] = useState('customer');
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/list-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.users) {
        data.users.sort((a: CustomerProfile, b: CustomerProfile) => (b.points || 0) - (a.points || 0));
        setCustomers(data.users);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Không thể tải danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  };

  // Filter by role tab + search
  const filteredCustomers = useMemo(() => {
    let list = customers;

    // Filter by role tab
    if (activeTab === 'admin') {
      list = list.filter(c => c.role === 'admin');
    } else if (activeTab === 'receptionist') {
      list = list.filter(c => c.role === 'receptionist');
    } else if (activeTab === 'customer') {
      list = list.filter(c => !c.role || c.role === 'customer');
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(c =>
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.nameKey && c.nameKey.toLowerCase().includes(q)) ||
        (c.username && c.username.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.phoneNumber && c.phoneNumber.toLowerCase().includes(q))
      );
    }

    return list;
  }, [customers, activeTab, searchQuery]);

  const getRoleStats = (role: string) => {
    if (role === 'customer') {
      return customers.filter(c => !c.role || c.role === 'customer').length;
    }
    return customers.filter(c => c.role === role).length;
  };

  const resetAddForm = () => {
    setNewNameKey('');
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('customer');
    setNewPoints('0');
  };

  const openEditDialog = (customer: CustomerProfile) => {
    setEditingCustomer(customer);
    setEditPoints(String(customer.points || 0));
    setEditRole(customer.role || 'customer');
    setEditName(customer.name || '');
    setEditPhone(customer.phoneNumber || '');
    setEditEmail(customer.email || '');
    setShowEditDialog(true);
  };

  const handleCreateCustomer = async () => {
    setError(null);
    setSuccess(null);
    if (!newNameKey.trim() || !newPassword.trim()) {
      setError('Vui lòng nhập Name Key và Mật khẩu');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nameKey: newNameKey.trim(),
          name: newName.trim() || newNameKey.trim(),
          email: newEmail.trim() || undefined,
          phoneNumber: newPhone.trim(),
          password: newPassword,
          role: newRole,
          points: Number(newPoints) || 0,
        }),
      });
      const result = await res.json();
      if (result.success) {
        setSuccess(result.message);
        resetAddForm();
        setShowAddDialog(false);
        fetchAllUsers();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Lỗi khi tạo người dùng');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi hệ thống');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCustomer = async () => {
    if (!editingCustomer) return;
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      const { getAuth } = await import('firebase/auth');
      const firebaseAuth = getAuth();
      const idToken = await firebaseAuth.currentUser?.getIdToken();
      
      const res = await fetch('/api/update-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          action: 'update',
          data: {
            nameKey: editingCustomer.nameKey,
            points: Number(editPoints),
            role: editRole,
            name: editName,
            phoneNumber: editPhone,
            email: editEmail,
          },
        }),
      });
      const result = await res.json();
      if (result.success) {
        setSuccess(result.message);
        setShowEditDialog(false);
        setEditingCustomer(null);
        fetchAllUsers();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Lỗi khi cập nhật');
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi hệ thống');
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-500/20 text-red-400 hover:bg-red-500/30 border-none">Quản trị viên</Badge>;
      case 'receptionist':
        return <Badge className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 border-none">Lễ tân</Badge>;
      default:
        return <Badge className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border-none">Khách hàng</Badge>;
    }
  };

  const renderCustomerTable = (data: CustomerProfile[]) => {
    if (data.length === 0) {
      return (
        <div className="text-center text-slate-400 py-8">
          {activeTab === 'all' ? 'Chưa có người dùng nào.' : `Không có ${ROLE_SECTIONS.find(s => s.key === activeTab)?.label.toLowerCase()} nào.`}
        </div>
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow className="border-slate-700 hover:bg-transparent">
            <TableHead className="text-slate-300">STT</TableHead>
            <TableHead className="text-slate-300">Tên người dùng</TableHead>
            <TableHead className="text-slate-300">Số điện thoại</TableHead>
            <TableHead className="text-slate-300">Email</TableHead>
            <TableHead className="text-slate-300 text-right">Điểm tích luỹ</TableHead>
            <TableHead className="text-slate-300">Vai trò</TableHead>
            <TableHead className="text-slate-300 text-center">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((customer, index) => (
            <TableRow key={customer.nameKey} className="border-slate-700 hover:bg-slate-800/50">
              <TableCell className="text-slate-400 text-sm">{index + 1}</TableCell>
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
                {getRoleBadge(customer.role)}
              </TableCell>
              <TableCell className="text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditDialog(customer)}
                  className="text-slate-400 hover:text-white hover:bg-slate-700"
                >
                  <Pencil className="h-4 w-4 mr-1" />
                  Sửa
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Quản lý người dùng</h1>
          <p className="text-slate-400 mt-2">Xem và quản lý tất cả người dùng trong hệ thống</p>
        </div>
        <Button
          onClick={() => { resetAddForm(); setShowAddDialog(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Thêm người dùng
        </Button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4 text-sm text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4 text-sm text-green-200">
          {success}
        </div>
      )}

      {/* Role Tabs + Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        {/* Role tabs */}
        <div className="flex gap-2 flex-wrap">
          {ROLE_SECTIONS.map(section => (
            <button
              key={section.key}
              onClick={() => setActiveTab(section.key)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === section.key
                  ? section.color + ' shadow-lg'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {section.label}
              <span className="ml-2 text-xs opacity-80">
                ({activeTab === section.key ? filteredCustomers.length : getRoleStats(section.key === 'all' ? '' : section.key === 'customer' ? 'customer' : section.key)})
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm theo tên, email, SĐT..."
            autoComplete="off"
            className="w-full bg-slate-800 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* Customer Card */}
      <Card className="bg-[#111827] border-slate-800">
        <div className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400 mr-2" />
              <span className="text-slate-400">Đang tải dữ liệu người dùng...</span>
            </div>
          ) : (
            renderCustomerTable(filteredCustomers)
          )}
        </div>
        {!loading && filteredCustomers.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-700 text-sm text-slate-500">
            Hiển thị {filteredCustomers.length} / {customers.length} người dùng
          </div>
        )}
      </Card>

      {/* Add Customer Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="bg-[#1e293b] border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Thêm người dùng mới</DialogTitle>
            <DialogDescription className="text-slate-400">
              Nhập thông tin người dùng cần tạo. Mật khẩu sẽ được dùng để đăng nhập.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-slate-300 block mb-1">Name Key *</label>
              <input
                value={newNameKey}
                onChange={e => setNewNameKey(e.target.value)}
                placeholder="Ví dụ: khachhang001"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-1">Mật khẩu *</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Mật khẩu đăng nhập"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-1">Tên hiển thị</label>
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Tên người dùng"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-1">Email (tùy chọn)</label>
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-1">Số điện thoại</label>
              <input
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                placeholder="Số điện thoại"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-300 block mb-1">Vai trò</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="customer">Khách hàng</option>
                  <option value="receptionist">Lễ tân</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-300 block mb-1">Điểm tích luỹ</label>
                <input
                  type="number"
                  min="0"
                  value={newPoints}
                  onChange={e => setNewPoints(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowAddDialog(false)}
              className="text-slate-300 hover:text-white"
            >
              Huỷ
            </Button>
            <Button
              onClick={handleCreateCustomer}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Tạo người dùng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-[#1e293b] border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">
              Chỉnh sửa: {editingCustomer?.name || editingCustomer?.nameKey}
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Chỉnh sửa thông tin, điểm tích luỹ và vai trò của người dùng.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm text-slate-300 block mb-1">Tên hiển thị</label>
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-1">Số điện thoại</label>
              <input
                value={editPhone}
                onChange={e => setEditPhone(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-1">Email</label>
              <input
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-300 block mb-1">Điểm tích luỹ</label>
                <input
                  type="number"
                  min="0"
                  value={editPoints}
                  onChange={e => setEditPoints(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 block mb-1">Vai trò</label>
                <select
                  value={editRole}
                  onChange={e => setEditRole(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="customer">Khách hàng</option>
                  <option value="receptionist">Lễ tân</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowEditDialog(false)}
              className="text-slate-300 hover:text-white"
            >
              Huỷ
            </Button>
            <Button
              onClick={handleUpdateCustomer}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
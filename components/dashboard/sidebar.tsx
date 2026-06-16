'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BarChart3, Users, ClipboardList, FileText, Building2, Menu, X, Gift, LogOut, Megaphone } from 'lucide-react';
import { useState } from 'react';
import { auth } from '@/lib/firebase-config';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

const navItems = [
  {
    name: 'Tổng quan',
    href: '/dashboard',
    icon: BarChart3,
  },
  {
    name: 'Quản lý đặt phòng',
    href: '/dashboard/bookings',
    icon: ClipboardList,
  },
  {
    name: 'Quản lý khách hàng',
    href: '/dashboard/customers',
    icon: Users,
  },
  {
    name: 'Yêu cầu đổi điểm',
    href: '/dashboard/point-requests',
    icon: Gift,
  },
  {
    name: 'Quản lý cơ sở',
    href: '/dashboard/facilities',
    icon: Building2,
  },
  {
    name: 'Khuyến mãi',
    href: '/dashboard/promotions',
    icon: Megaphone,
  },
  {
    name: 'Báo cáo',
    href: '/dashboard/reports',
    icon: FileText,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-slate-800 text-white"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col gap-8 transition-transform duration-300 md:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        <h1 className="text-2xl font-bold text-white">Giao diện Quản trị</h1>

        <nav className="flex flex-col gap-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors',
                  'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className={cn(
            'mt-4 flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors',
            'text-red-400 hover:bg-red-500/10 hover:text-red-300'
          )}
        >
          <LogOut size={20} />
          <span>Đăng xuất</span>
        </button>

        <div className="mt-auto pt-8 border-t border-slate-800">
          <p className="text-xs text-slate-400 text-center">© 2024 Karaoke Admin</p>
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}

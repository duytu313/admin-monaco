'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase-config';
import { normalizeBookingStatus, BOOKING_STATUSES } from '@/lib/booking-constants';

const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

/** Format Date thành dd/mm/yyyy */
function formatDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Format Date thành mm/yyyy */
function formatMonthYear(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${yyyy}`;
}

/** Format Date thành yyyy */
function formatYear(d: Date): string {
  return `${d.getFullYear()}`;
}

/** Lấy thứ trong tuần bằng tiếng Việt */
function getDayLabel(date: Date): string {
  const day = date.getDay(); // 0=CN, 1=T2, ..., 6=T7
  const labels = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return labels[day];
}

/** Lấy tên tháng viết tắt */
function getMonthLabel(date: Date): string {
  const month = date.getMonth();
  const labels = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
  return labels[month];
}

/** Parse bookingDate từ Firebase về Date */
function parseBookingDate(b: any): Date | null {
  if (!b.bookingDate) return null;
  if (b.bookingDate.includes('/')) {
    const parts = b.bookingDate.split('/');
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
  }
  return new Date(b.bookingDate);
}

/** Lấy start of week (Thứ 2 đầu tuần) */
function getStartOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=CN, 1=T2...6=T7
  const diff = day === 0 ? 6 : day - 1; // Nếu CN (0) lùi 6 ngày, T2 (1) lùi 0
  d.setDate(d.getDate() - diff);
  return d;
}

/** Lấy end of week (Chủ nhật cuối tuần) */
function getEndOfWeek(date: Date): Date {
  const d = getStartOfWeek(date);
  d.setDate(d.getDate() + 6);
  return d;
}

/** Lấy start of month */
function getStartOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Lấy end of month */
function getEndOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

/** Lấy start of year */
function getStartOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 0, 1);
}

/** Lấy end of year */
function getEndOfYear(date: Date): Date {
  return new Date(date.getFullYear(), 11, 31);
}

export default function ReportsPage() {
  const [period, setPeriod] = useState('week');
  const [periodLabel, setPeriodLabel] = useState('');
  const [chartData, setChartData] = useState<{ label: string; revenue: number }[]>([]);
  const [revenueDistributionData, setRevenueDistributionData] = useState<{ name: string; value: number }[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [chartTitle, setChartTitle] = useState('');

  useEffect(() => {
    const bookingsRef = ref(db, 'bookings');
    const unsub = onValue(bookingsRef, (snapshot) => {
      // Tính khoảng thời gian hiện tại
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let periodStart: Date;
      let periodEnd: Date;

      if (period === 'week') {
        periodStart = getStartOfWeek(today);
        periodEnd = getEndOfWeek(today);
        setPeriodLabel(`Tuần từ ${formatDate(periodStart)} - ${formatDate(periodEnd)}`);
        setChartTitle('Doanh thu theo ngày trong tuần');
      } else if (period === 'month') {
        periodStart = getStartOfMonth(today);
        periodEnd = getEndOfMonth(today);
        setPeriodLabel(`Tháng ${formatMonthYear(today)} (từ ${formatDate(periodStart)} - ${formatDate(periodEnd)})`);
        setChartTitle('Doanh thu theo ngày trong tháng');
      } else { // year
        periodStart = getStartOfYear(today);
        periodEnd = getEndOfYear(today);
        setPeriodLabel(`Năm ${formatYear(today)} (từ ${formatDate(periodStart)} - ${formatDate(periodEnd)})`);
        setChartTitle('Doanh thu theo tháng trong năm');
      }

      if (snapshot.exists()) {
        const bookings = snapshot.val();

        let revenue = 0;
        let orders = 0;

        const serviceRevenue: Record<string, number> = {
          'Karaoke': 0,
          'Massage': 0,
          'Restaurant': 0,
          'Khác': 0
        };

        // Tạo map dữ liệu biểu đồ dựa theo period
        let revenueMap: Record<string, number> = {};

        if (period === 'week') {
          // Khởi tạo 7 ngày trong tuần
          const d = new Date(periodStart);
          for (let i = 0; i < 7; i++) {
            const key = getDayLabel(d);
            revenueMap[key] = 0;
            d.setDate(d.getDate() + 1);
          }
        } else if (period === 'month') {
          // Khởi tạo tất cả các ngày trong tháng
          const daysInMonth = periodEnd.getDate();
          for (let i = 1; i <= daysInMonth; i++) {
            revenueMap[String(i)] = 0;
          }
        } else { // year
          // Khởi tạo 12 tháng
          for (let i = 1; i <= 12; i++) {
            revenueMap[getMonthLabel(new Date(today.getFullYear(), i - 1, 1))] = 0;
          }
        }

        Object.keys(bookings).forEach(key => {
          const b = bookings[key];

          // Chuẩn hóa trạng thái và kiểm tra đã thanh toán
          const normalizedStatus = normalizeBookingStatus(b.status);
          const isPaid = normalizedStatus === BOOKING_STATUSES.PAID;

          // Lấy số tiền: ưu tiên paidAmount > finalAmount > totalAmount
          const itemRev = isPaid ? Number(b.paidAmount || b.finalAmount || b.totalAmount || 0) : 0;

          // Parse bookingDate
          const bookingDate = parseBookingDate(b);

          // Kiểm tra booking có nằm trong khoảng thời gian đã chọn không
          if (!bookingDate || isNaN(bookingDate.getTime()) || bookingDate < periodStart || bookingDate > periodEnd) {
            return;
          }

          orders++;
          revenue += itemRev;

          const serviceName = (b.type || '').toLowerCase();
          if (serviceName.includes('karaoke')) {
            serviceRevenue['Karaoke'] += itemRev;
          } else if (serviceName.includes('massage')) {
            serviceRevenue['Massage'] += itemRev;
          } else if (serviceName.includes('restaurant') || serviceName.includes('nhà hàng') || serviceName.includes('ăn uống')) {
            serviceRevenue['Restaurant'] += itemRev;
          } else {
            serviceRevenue['Khác'] += itemRev;
          }

          // Thêm vào biểu đồ
          if (period === 'week') {
            const dayLabel = getDayLabel(bookingDate);
            if (revenueMap[dayLabel] !== undefined) {
              revenueMap[dayLabel] += itemRev;
            }
          } else if (period === 'month') {
            const dayKey = String(bookingDate.getDate());
            if (revenueMap[dayKey] !== undefined) {
              revenueMap[dayKey] += itemRev;
            }
          } else { // year
            const monthLabel = getMonthLabel(bookingDate);
            if (revenueMap[monthLabel] !== undefined) {
              revenueMap[monthLabel] += itemRev;
            }
          }
        });

        setTotalRevenue(revenue);
        setTotalOrders(orders);

        // Chuyển revenueMap thành mảng cho biểu đồ
        const chartArray = Object.entries(revenueMap).map(([label, rev]) => ({
          label,
          revenue: rev
        }));
        setChartData(chartArray);

        const distData = Object.keys(serviceRevenue)
          .filter(k => serviceRevenue[k] > 0)
          .map(k => ({ name: k, value: serviceRevenue[k] }));
        setRevenueDistributionData(distData);
      } else {
        setTotalRevenue(0);
        setTotalOrders(0);
        setChartData([]);
        setRevenueDistributionData([]);
      }
    });

    return () => unsub();
  }, [period]);

  const averageRevenue = chartData.length > 0 ? Math.round(totalRevenue / chartData.length) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Báo cáo</h1>
        <p className="text-slate-400 mt-2">Xem báo cáo chi tiết về hoạt động kinh doanh</p>
      </div>

      {/* Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex gap-3">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Tuần này
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Tháng này
          </button>
          <button
            onClick={() => setPeriod('year')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === 'year'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Năm này
          </button>
        </div>
        {periodLabel && (
          <span className="text-sm text-blue-400 font-medium bg-blue-900/30 px-3 py-1.5 rounded-lg border border-blue-500/30">
            {periodLabel}
          </span>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-800 border-slate-700 p-6">
          <p className="text-sm text-slate-400 font-medium">Tổng doanh thu</p>
          <p className="text-2xl font-bold text-white mt-2">₫{totalRevenue.toLocaleString()}</p>
        </Card>
        <Card className="bg-slate-800 border-slate-700 p-6">
          <p className="text-sm text-slate-400 font-medium">Tổng đơn đặt</p>
          <p className="text-2xl font-bold text-white mt-2">{totalOrders}</p>
        </Card>
        <Card className="bg-slate-800 border-slate-700 p-6">
          <p className="text-sm text-slate-400 font-medium">
            {period === 'week' ? 'Doanh thu trung bình/ngày' : period === 'month' ? 'Doanh thu trung bình/ngày' : 'Doanh thu trung bình/tháng'}
          </p>
          <p className="text-2xl font-bold text-white mt-2">₫{averageRevenue.toLocaleString()}</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Revenue Chart */}
        <Card className="bg-slate-800 border-slate-700 p-6">
          <h3 className="text-lg font-bold text-white mb-4">{chartTitle}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis 
                stroke="#94a3b8" 
                dataKey="label"
                interval={period === 'month' ? Math.max(1, Math.floor(chartData.length / 15)) : 0}
              />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                labelStyle={{ color: '#ffffff' }}
                formatter={(value: any) => [`₫${(Number(value) || 0).toLocaleString()}`, 'Doanh thu']}
              />
              <Legend />
              <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Revenue Distribution */}
        <Card className="bg-slate-800 border-slate-700 p-6">
          <h3 className="text-lg font-bold text-white mb-4">Phân bố doanh thu theo dịch vụ</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={revenueDistributionData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }: { name?: string; percent?: number }) => `${name || ''}: ${((percent || 0) * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {revenueDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                labelStyle={{ color: '#ffffff' }}
                formatter={(value: any) => [`₫${(Number(value) || 0).toLocaleString()}`, 'Doanh thu']}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
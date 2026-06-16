'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Banknote, ShoppingCart, Users, Star, AlertCircle } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { ref, onValue, get } from 'firebase/database';
import { db } from '@/lib/firebase-config';

export default function DashboardOverview() {
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [customersCount, setCustomersCount] = useState(0);
  const [totalPoints, setTotalPoints] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [synced, setSynced] = useState(false);

  const [lineData, setLineData] = useState<{ name: string, revenue: number }[]>([]);
  const [monthlyData, setMonthlyData] = useState<{ name: string, revenue: number }[]>([]);

  const [pieData, setPieData] = useState([
    { name: 'Karaoke', value: 0, color: '#3b82f6' },
    { name: 'Massage', value: 0, color: '#ef4444' },
    { name: 'Restaurant', value: 0, color: '#eab308' },
  ]);

  useEffect(() => {
    if (!db) {
      setError('Firebase chưa sẵn sàng. Vui lòng tải lại trang.');
      return;
    }

    const bookingsRef = ref(db, 'bookings');

    const unsubBookings = onValue(bookingsRef, (snapshot) => {
      try {
        setSynced(true);
        setError(null);

        const orders: Record<string, any> = snapshot.exists() ? snapshot.val() : {};

        let orderCount = 0;
        let revenue = 0;
        const serviceCount: Record<string, number> = { Karaoke: 0, Massage: 0, Restaurant: 0 };
        const uniqueUsers = new Set<string>();

        const initialLineData = [
          { name: 'CN', revenue: 0 },
          { name: 'T2', revenue: 0 },
          { name: 'T3', revenue: 0 },
          { name: 'T4', revenue: 0 },
          { name: 'T5', revenue: 0 },
          { name: 'T6', revenue: 0 },
          { name: 'T7', revenue: 0 },
        ];

        const initialMonthlyData = Array.from({ length: 12 }, (_, i) => ({ name: `Th${i + 1}`, revenue: 0 }));

        Object.keys(orders).forEach(key => {
          const b = orders[key];
          orderCount += 1;
          if (b.userId) uniqueUsers.add(b.userId);

          const itemRevenue = Number(b.totalAmount || 0);
          revenue += itemRevenue;

          const serviceName = (b.type || 'Khác').toLowerCase();
          if (serviceName.includes('karaoke')) serviceCount.Karaoke += 1;
          else if (serviceName.includes('massage')) serviceCount.Massage += 1;
          else if (serviceName.includes('restaurant') || serviceName.includes('nhà hàng') || serviceName.includes('ăn uống')) serviceCount.Restaurant += 1;

          if (b.bookingDate) {
            let d: Date;
            if (b.bookingDate.includes('/')) {
              const parts = b.bookingDate.split('/');
              d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            } else {
              d = new Date(b.bookingDate);
            }

            if (!isNaN(d.getTime())) {
              const day = d.getDay(); // 0 = Sunday
              const month = d.getMonth(); // 0-11
              initialLineData[day].revenue += itemRevenue;
              initialMonthlyData[month].revenue += itemRevenue;
            }
          }
        });

        setTotalOrders(orderCount);
        setTotalRevenue(revenue);
        setCustomersCount(uniqueUsers.size);

        const sortedLineData = [...initialLineData.slice(1), initialLineData[0]];
        setLineData(sortedLineData);
        setMonthlyData(initialMonthlyData);

        setPieData([
          { name: 'Karaoke', value: serviceCount.Karaoke, color: '#3b82f6' },
          { name: 'Massage', value: serviceCount.Massage, color: '#ef4444' },
          { name: 'Restaurant', value: serviceCount.Restaurant, color: '#eab308' },
        ]);

        // Fetch points async (không gây lỗi cho luồng chính)
        setTimeout(() => {
          fetchTotalPoints(Array.from(uniqueUsers)).then(setTotalPoints);
        }, 0);

      } catch (err) {
        console.error('[Dashboard] Error processing data:', err);
        setError('Lỗi xử lý dữ liệu: ' + (err instanceof Error ? err.message : 'Lỗi không xác định'));
      }
    }, (err) => {
      console.error('[Dashboard] Firebase read error:', err);
      setError('Không thể đọc dữ liệu từ Firebase. Vui lòng kiểm tra kết nối và quyền truy cập.');
    });

    return () => {
      unsubBookings();
    };
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white mb-6">Tổng quan hệ thống</h1>

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-900/30 border border-red-500/30 rounded-lg">
          <AlertCircle className="text-red-400 h-5 w-5 flex-shrink-0" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {!synced && !error && (
        <div className="flex items-center gap-3 p-4 bg-blue-900/30 border border-blue-500/30 rounded-lg">
          <div className="animate-spin h-5 w-5 border-2 border-blue-400 border-t-transparent rounded-full" />
          <p className="text-sm text-blue-200">Đang đồng bộ dữ liệu từ Firebase...</p>
        </div>
      )}

      {/* Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#111827] border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Tổng doanh thu</CardTitle>
            <Banknote className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalRevenue.toLocaleString('vi-VN')}đ</div>
          </CardContent>
        </Card>

        <Card className="bg-[#111827] border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Tổng đơn</CardTitle>
            <ShoppingCart className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{totalOrders}</div>
          </CardContent>
        </Card>

        <Card className="bg-[#111827] border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Khách hàng</CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-white">
                {customersCount.toLocaleString('vi-VN')}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-1">Lấy từ dữ liệu đơn đặt phòng</p>
          </CardContent>
        </Card>

        <Card className="bg-[#111827] border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Điểm đã tích luỹ</CardTitle>
            <Star className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {totalPoints > 0 ? totalPoints.toLocaleString('vi-VN') : '0'}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <Card className="col-span-1 lg:col-span-2 bg-[#111827] border-slate-800">
          <Tabs defaultValue="daily" className="w-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base font-medium text-white">Doanh thu</CardTitle>
              <TabsList className="bg-slate-800 border border-slate-700 h-8">
                <TabsTrigger value="daily" className="text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 px-3 py-1">Theo ngày</TabsTrigger>
                <TabsTrigger value="monthly" className="text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 px-3 py-1">Theo tháng</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent>
              <TabsContent value="daily" className="mt-0">
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                      <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#1e293b', stroke: '#3b82f6' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
              <TabsContent value="monthly" className="mt-0">
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                      <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                      <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: '#1e293b', stroke: '#10b981' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        <Card className="col-span-1 bg-[#111827] border-slate-800">
          <CardHeader>
            <CardTitle className="text-base font-medium text-white">Đơn theo dịch vụ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full mt-4">
              {pieData.every(d => d.value === 0) ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">Chưa có dữ liệu</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={0} outerRadius={80} paddingAngle={2} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#fff' }} />
                    <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: '14px', color: '#cbd5e1' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/** Hàm fetch tổng điểm từ Firebase, chạy bất đồng bộ không block UI */
async function fetchTotalPoints(uids: string[]): Promise<number> {
  if (!db || uids.length === 0) return 0;
  let points = 0;
  for (const uid of uids) {
    try {
      const uidMapSnap = await get(ref(db, `users/uidMap/${uid}`));
      if (uidMapSnap.exists()) {
        const nameKey = uidMapSnap.val();
        const profileSnap = await get(ref(db, `users/profiles/${nameKey}`));
        if (profileSnap.exists()) {
          const profile = profileSnap.val();
          points += Number(profile.points || 0);
        }
      }
    } catch (err) {
      console.warn(`[Dashboard] Lỗi lấy điểm user ${uid}:`, err);
    }
  }
  return points;
}
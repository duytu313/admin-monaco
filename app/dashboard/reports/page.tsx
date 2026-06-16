'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { ref, onValue } from 'firebase/database';
import { db } from '@/lib/firebase-config';

const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

export default function ReportsPage() {
  const [period, setPeriod] = useState('week');
  const [dailyRevenueData, setDailyRevenueData] = useState<{day: string, revenue: number}[]>([]);
  const [revenueDistributionData, setRevenueDistributionData] = useState<{name: string, value: number}[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);

  useEffect(() => {
    const bookingsRef = ref(db, 'bookings');
    const unsub = onValue(bookingsRef, (snapshot) => {
      if (snapshot.exists()) {
        const bookings = snapshot.val();
        
        let revenue = 0;
        let orders = 0;
        
        const initialDailyData = [
          { day: 'T2', revenue: 0 },
          { day: 'T3', revenue: 0 },
          { day: 'T4', revenue: 0 },
          { day: 'T5', revenue: 0 },
          { day: 'T6', revenue: 0 },
          { day: 'T7', revenue: 0 },
          { day: 'CN', revenue: 0 },
        ];
        
        const serviceRevenue: Record<string, number> = {
          'Karaoke': 0,
          'Massage': 0,
          'Restaurant': 0,
          'Khác': 0
        };

        Object.keys(bookings).forEach(key => {
          const b = bookings[key];
          orders++;
          
          const itemRev = Number(b.totalAmount || 0);
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
          
          if (b.bookingDate) {
            let d;
            if (b.bookingDate.includes('/')) {
              const parts = b.bookingDate.split('/');
              d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
            } else {
              d = new Date(b.bookingDate);
            }
            
            if (!isNaN(d.getTime())) {
              let dayIdx = d.getDay() - 1;
              if (dayIdx === -1) dayIdx = 6; // Sunday
              initialDailyData[dayIdx].revenue += itemRev;
            }
          }
        });
        
        setTotalRevenue(revenue);
        setTotalOrders(orders);
        setDailyRevenueData(initialDailyData);
        
        const distData = Object.keys(serviceRevenue)
          .filter(k => serviceRevenue[k] > 0)
          .map(k => ({ name: k, value: serviceRevenue[k] }));
        setRevenueDistributionData(distData);
      } else {
        setTotalRevenue(0);
        setTotalOrders(0);
        setDailyRevenueData([]);
        setRevenueDistributionData([]);
      }
    });
    
    return () => unsub();
  }, [period]);

  const averageRevenue = dailyRevenueData.length > 0 ? Math.round(totalRevenue / dailyRevenueData.length) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Báo cáo</h1>
        <p className="text-slate-400 mt-2">Xem báo cáo chi tiết về hoạt động kinh doanh</p>
      </div>

      {/* Period Filter */}
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
          <p className="text-sm text-slate-400 font-medium">Doanh thu trung bình/ngày</p>
          <p className="text-2xl font-bold text-white mt-2">₫{averageRevenue.toLocaleString()}</p>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Revenue */}
        <Card className="bg-slate-800 border-slate-700 p-6">
          <h3 className="text-lg font-bold text-white mb-4">Doanh thu hàng ngày</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={dailyRevenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #475569' }}
                labelStyle={{ color: '#ffffff' }}
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
                label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
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
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}

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
import { CheckCircle2, XCircle, Clock } from 'lucide-react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '@/lib/firebase-config';

export default function PointRequestsPage() {
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    const requestsRef = ref(db, 'pointRequests');
    const unsub = onValue(requestsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const list = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        // Sắp xếp đơn mới nhất lên đầu nếu muốn, giả định theo thời gian hoặc đảo ngược
        setRequests(list.reverse());
      } else {
        setRequests([]);
      }
    });

    return () => unsub();
  }, []);

  const handleApprove = (id: string) => {
    update(ref(db, `pointRequests/${id}`), { status: 'approved' });
  };

  const handleReject = (id: string) => {
    update(ref(db, `pointRequests/${id}`), { status: 'rejected' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="flex items-center text-orange-400 bg-orange-400/10 px-2 py-1 rounded-full text-xs font-medium w-fit">
            <Clock className="w-3 h-3 mr-1" /> Chờ xử lý
          </span>
        );
      case 'approved':
        return (
          <span className="flex items-center text-green-400 bg-green-400/10 px-2 py-1 rounded-full text-xs font-medium w-fit">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Đã duyệt
          </span>
        );
      case 'rejected':
        return (
          <span className="flex items-center text-red-400 bg-red-400/10 px-2 py-1 rounded-full text-xs font-medium w-fit">
            <XCircle className="w-3 h-3 mr-1" /> Từ chối
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Yêu cầu đổi điểm</h1>
        <p className="text-slate-400 mt-2">Quản lý và xét duyệt các yêu cầu đổi điểm thưởng từ khách hàng</p>
      </div>

      <Card className="bg-slate-800 border-slate-700 p-6">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-slate-300">Mã YC</TableHead>
                <TableHead className="text-slate-300">Khách hàng</TableHead>
                <TableHead className="text-slate-300">Phần thưởng</TableHead>
                <TableHead className="text-slate-300">Điểm trừ</TableHead>
                <TableHead className="text-slate-300">Thời gian</TableHead>
                <TableHead className="text-slate-300">Trạng thái</TableHead>
                <TableHead className="text-slate-300 text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((req) => (
                <TableRow key={req.id} className="border-slate-700 hover:bg-slate-700/50">
                  <TableCell className="text-slate-300 font-medium">{req.id}</TableCell>
                  <TableCell className="text-slate-300">{req.customerName}</TableCell>
                  <TableCell className="text-slate-300">{req.reward}</TableCell>
                  <TableCell className="text-blue-400 font-bold">{req.pointsCost.toLocaleString('vi-VN')}</TableCell>
                  <TableCell className="text-slate-400">{req.date}</TableCell>
                  <TableCell>{getStatusBadge(req.status)}</TableCell>
                  <TableCell className="text-right">
                    {req.status === 'pending' ? (
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleApprove(req.id)}
                          className="bg-green-600/20 text-green-400 hover:bg-green-600 hover:text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
                        >
                          Duyệt
                        </button>
                        <button 
                          onClick={() => handleReject(req.id)}
                          className="bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
                        >
                          Từ chối
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-sm italic">Đã xử lý</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

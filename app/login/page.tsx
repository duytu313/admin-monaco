'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase-config';
import { getUserRole } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const setAdminCookie = () => {
    document.cookie = 'adminRole=admin; path=/; max-age=86400; sameSite=lax';
  };

  const clearAdminCookie = () => {
    document.cookie = 'adminRole=; path=/; max-age=0; sameSite=lax';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      const user = auth.currentUser;
      const role = user ? await getUserRole(user.uid) : null;

      if (role !== 'admin') {
        clearAdminCookie();
        await signOut(auth);
        setError('Quyền truy cập bị từ chối. Chỉ admin mới được phép vào.');
        return;
      }

      setAdminCookie();
      router.push('/dashboard');
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/invalid-credential') {
        setError('Sai email hoặc mật khẩu. Vui lòng kiểm tra lại!');
      } else if (err.code === 'auth/user-not-found') {
        setError('Tài khoản không tồn tại.');
      } else if (err.code === 'auth/wrong-password') {
        setError('Sai mật khẩu.');
      } else {
        setError('Đăng nhập thất bại: ' + (err.message || 'Lỗi không xác định.'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-950 p-4">
      <Card className="w-full max-w-md bg-slate-900 border-slate-800 text-slate-100 shadow-2xl">
        <CardHeader className="space-y-4 text-center pb-6">
          <div className="flex justify-center">
            <Image 
              src="/images/logo.png" 
              alt="Logo" 
              width={80}
              height={80}
              priority
              className="w-auto h-auto"
            />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-bold tracking-tight">Đăng nhập</CardTitle>
            <CardDescription className="text-slate-400">
              Nhập email và mật khẩu để truy cập bảng điều khiển
            </CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-400 bg-red-950/50 border border-red-900/50 rounded-md">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-slate-950 border-slate-800 focus-visible:ring-slate-700"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Mật khẩu</Label>
              </div>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-950 border-slate-800 focus-visible:ring-slate-700"
                required
              />
            </div>
          </CardContent>
          <CardFooter className="pt-4">
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors"
              disabled={loading}
            >
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

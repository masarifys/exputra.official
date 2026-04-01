'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, ShieldCheck, Eye, EyeOff } from 'lucide-react';

function ResetPasswordInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
        setError('Token tidak ditemukan. Silakan minta link reset password baru.');
        return;
    }

    if (password.length < 6) {
        setError('Password minimal harus 6 karakter.');
        return;
    }

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak sesuai.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/client/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/client/login');
        }, 3000);
      } else {
        setError(data.message || 'Gagal mengubah password.');
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-slate-100 text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-xl font-bold text-slate-800">Token Tidak Valid</h1>
                <p className="text-slate-500 mt-2 text-sm">
                    Link reset password tidak valid atau sudah kadaluarsa. Silakan minta link baru.
                </p>
                <Link 
                    href="/client/forgot-password"
                    className="mt-6 inline-block w-full py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-all"
                >
                    Minta Link Baru
                </Link>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Reset new password</h1>
          <p className="text-slate-500 mt-2 text-sm px-4">
            Masukkan password baru Anda untuk mengamankan akun.
          </p>
        </div>

        {success ? (
          <div className="p-6 bg-green-50 border border-green-200 rounded-2xl text-center space-y-4">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6 text-green-600" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-green-800">Password Berhasil Diubah!</p>
              <p className="text-xs text-green-700">Mengarahkan Anda ke halaman login dalam 3 detik...</p>
            </div>
            <Link 
              href="/client/login"
              className="block w-full py-3 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
            >
              Login Sekarang
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-1.5 px-1">
                New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-300"
                placeholder="Minimal 6 karakter"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 bottom-3.5 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 px-1">
                Confirm Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full px-4 py-3.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-300"
                placeholder="Ulangi password baru"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20 active:scale-[0.98] mt-4"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Memproses...
                </div>
              ) : (
                'Set password'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordInner />
    </Suspense>
  );
}

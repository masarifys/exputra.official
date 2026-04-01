'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ClientLoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    try {
      const raw = localStorage.getItem('service-last-order');
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        customerEmail?: string;
        customerPhone?: string;
      };

      if (!email && parsed.customerEmail) {
        setEmail(parsed.customerEmail);
      }

      if (!phone && parsed.customerPhone) {
        setPhone(parsed.customerPhone);
      }
    } catch {
      // Ignore malformed local storage payload
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const nextPath = searchParams.get('next') || '/client/dashboard';
      const res = await fetch(`/api/client/login?next=${encodeURIComponent(nextPath)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, phone }),
      });

      const data = await res.json();

      if (res.ok) {
        const destination = typeof data.nextPath === 'string' && data.nextPath.startsWith('/client/')
          ? data.nextPath
          : '/client/dashboard';
        router.push(destination);
      } else {
        setError(data.message || 'Login gagal');
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Cek Status Pesanan</h1>
          <p className="text-gray-600 mt-2">
            Masuk dengan email dan nomor HP yang digunakan saat order
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
              placeholder="email@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1 px-1">
              <label className="block text-sm font-medium text-gray-700">
                Nomor HP atau Password
              </label>
              <Link 
                href="/client/forgot-password"
                className="text-xs font-semibold text-cyan-600 hover:text-cyan-700"
              >
                Lupa Password?
              </Link>
            </div>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
              placeholder="08123456789 atau password baru"
            />
            <p className="text-xs text-gray-500 mt-1">
              Gunakan nomor HP (default) atau password yang telah Anda buat
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 font-semibold transition-colors disabled:opacity-50"
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-cyan-600 hover:text-cyan-700 text-sm">
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ClientLoginPage() {
  return (
    <Suspense fallback={null}>
      <ClientLoginPageInner />
    </Suspense>
  );
}

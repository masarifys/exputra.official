'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/client/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data.message || 'Link reset password telah dikirim ke WhatsApp Anda.');
      } else {
        setError(data.message || 'Gagal mengirim link reset password.');
      }
    } catch (err) {
      setError('Terjadi kesalahan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-slate-100">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">Lupa Password?</h1>
          <p className="text-slate-500 mt-2 text-sm">
            Masukan Nomor WhatsApp yang terhubung dengan Akun yang terdaftar.
          </p>
        </div>

        {message ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center space-y-3">
            <p className="text-sm text-green-700">{message}</p>
            <Link 
              href="/client/login"
              className="inline-block text-sm font-semibold text-green-800 hover:underline"
            >
              Kembali ke Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 px-1">
                Nomor WhatsApp
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all placeholder:text-slate-300"
                placeholder="Contoh: 08123456789"
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
              className="w-full py-3.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-500/20 active:scale-[0.98]"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Mengirim...
                </div>
              ) : (
                'Send reset link'
              )}
            </button>
          </form>
        )}

        <div className="mt-8 text-center">
          <Link href="/client/login" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Kembali ke Login
          </Link>
        </div>
      </div>
    </div>
  );
}

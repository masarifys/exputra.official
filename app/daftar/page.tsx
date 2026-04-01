'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

function RegisterPageInner() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    company: '',
    address: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Client-side validations
    const phoneRegex = /^[0-9]+$/;
    if (!phoneRegex.test(formData.phone) || formData.phone.length < 10) {
      setError('Nomor HP tidak valid. Hanya boleh angka dan minimal 10 digit.');
      setLoading(false);
      return;
    }
    if (!phoneRegex.test(formData.whatsapp) || formData.whatsapp.length < 10) {
      setError('Nomor WhatsApp tidak valid. Hanya boleh angka dan minimal 10 digit.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/client/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        router.push(data.redirect || '/client/dashboard');
      } else {
        setError(data.message || 'Registrasi gagal. Coba lagi nanti.');
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Daftar Akun Baru</h1>
          <p className="text-gray-600 mt-2">
            Lengkapi data diri Anda di bawah ini untuk menjadi bagian dari kami.
          </p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <div className="md:col-span-2">
               <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Lengkap *</label>
               <input
                 type="text"
                 name="name"
                 value={formData.name}
                 onChange={handleChange}
                 required
                 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition transition-shadow bg-gray-50 focus:bg-white"
                 placeholder="Cth: John Doe"
               />
             </div>
             
             <div className="md:col-span-2">
               <label className="block text-sm font-semibold text-gray-700 mb-1">Alamat Email *</label>
               <input
                 type="email"
                 name="email"
                 value={formData.email}
                 onChange={handleChange}
                 required
                 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition transition-shadow bg-gray-50 focus:bg-white"
                 placeholder="name@example.com"
               />
             </div>

             <div>
               <label className="block text-sm font-semibold text-gray-700 mb-1">Nomor HP *</label>
               <input
                 type="tel"
                 name="phone"
                 value={formData.phone}
                 onChange={handleChange}
                 required
                 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition transition-shadow bg-gray-50 focus:bg-white"
                 placeholder="0812xxxx (Minimal 10 digit)"
               />
               <p className="text-xs text-gray-500 mt-1">Nomor ini akan digunakan sebagai Password saat login</p>
             </div>

             <div>
               <label className="block text-sm font-semibold text-gray-700 mb-1">Nomor WhatsApp *</label>
               <input
                 type="tel"
                 name="whatsapp"
                 value={formData.whatsapp}
                 onChange={handleChange}
                 required
                 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition transition-shadow bg-gray-50 focus:bg-white"
                 placeholder="0812xxxx"
               />
             </div>

             <div className="md:col-span-2">
               <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Bisnis / Instansi (Opsional)</label>
               <input
                 type="text"
                 name="company"
                 value={formData.company}
                 onChange={handleChange}
                 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition transition-shadow bg-gray-50 focus:bg-white"
                 placeholder="Kosongkan jika tidak ada"
               />
             </div>

             <div className="md:col-span-2">
               <label className="block text-sm font-semibold text-gray-700 mb-1">Alamat Lengkap *</label>
               <textarea
                 name="address"
                 value={formData.address}
                 onChange={handleChange}
                 required
                 rows={3}
                 className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition transition-shadow bg-gray-50 focus:bg-white resize-none"
                 placeholder="Jl. Nama Jalan No. XX..."
               />
             </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
              <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path></svg>
              <p className="text-sm text-red-600 font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 font-bold text-base transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-cyan-500/20"
          >
            {loading ? 'Mendaftarkan Akun...' : 'Daftar Sekarang'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600">
            Sudah punya akun?{' '}
            <Link href="/client/login" className="text-cyan-600 font-bold hover:text-cyan-700 hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">Loading...</div>}>
      <RegisterPageInner />
    </Suspense>
  );
}

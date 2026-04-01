'use client';

import { useState, useEffect } from 'react';
import { useOrderStore } from '@/store/useOrderStore';

export default function ProfileStep() {
  const personalData = useOrderStore((state) => state.personalData);
  const setPersonalData = useOrderStore((state) => state.setPersonalData);
  const setCurrentStep = useOrderStore((state) => state.setCurrentStep);

  const [errors, setErrors] = useState({
    fullName: '',
    email: '',
    phone: '',
  });

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check session and auto-fill personal data
  useEffect(() => {
    fetch('/api/client/profile')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('not logged in');
      })
      .then((data) => {
        if (data.name && data.email && data.phone) {
          setPersonalData({
            fullName: data.name,
            email: data.email,
            phone: data.phone,
          });
          setIsLoggedIn(true);
          // Auto-skip to step 4
          setCurrentStep(4);
        }
      })
      .catch(() => {
        // Not logged in, show the form normally
        setIsLoggedIn(false);
      })
      .finally(() => setLoading(false));
  }, []);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhone = (phone: string) => {
    const re = /^[0-9]+$/;
    return re.test(phone) && phone.length >= 10;
  };

  const handleChange = (field: string, value: string) => {
    setPersonalData({ ...personalData, [field]: value });
    setErrors({ ...errors, [field]: '' });
  };

  const handleNext = () => {
    const newErrors = {
      fullName: '',
      email: '',
      phone: '',
    };

    if (!personalData.fullName.trim()) {
      newErrors.fullName = 'Nama lengkap wajib diisi';
    }

    if (!personalData.email.trim()) {
      newErrors.email = 'Email wajib diisi';
    } else if (!validateEmail(personalData.email)) {
      newErrors.email = 'Format email tidak valid';
    }

    if (!personalData.phone.trim()) {
      newErrors.phone = 'No. handphone wajib diisi';
    } else if (!validatePhone(personalData.phone)) {
      newErrors.phone = 'No. handphone harus berupa angka (min. 10 digit)';
    }

    if (newErrors.fullName || newErrors.email || newErrors.phone) {
      setErrors(newErrors);
      return;
    }

    setCurrentStep(4);
  };

  const handlePrevious = () => {
    setCurrentStep(2);
  };

  if (loading) {
    return (
      <div className="max-w-2xl animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
        <div className="h-12 bg-gray-200 rounded"></div>
      </div>
    );
  }

  // If logged in, this component will auto-skip via useEffect
  // This is a fallback in case auto-skip somehow doesn't fire
  if (isLoggedIn) {
    return (
      <div className="max-w-2xl">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 flex items-center gap-4">
          <svg className="w-8 h-8 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="font-semibold text-green-800">Data diri sudah terisi otomatis</p>
            <p className="text-sm text-green-700">
              Anda login sebagai <strong>{personalData.fullName}</strong> ({personalData.email})
            </p>
          </div>
        </div>
        <div className="flex justify-between mt-8">
          <button
            onClick={handlePrevious}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Sebelumnya
          </button>
          <button
            onClick={() => setCurrentStep(4)}
            className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 font-medium transition-colors"
          >
            Selanjutnya
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">3. Data Diri</h2>

      <div className="space-y-6">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
            Nama Lengkap
          </label>
          <input
            type="text"
            id="fullName"
            value={personalData.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            placeholder="Masukkan nama lengkap"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none ${
              errors.fullName ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.fullName && (
            <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={personalData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="nama@email.com"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none ${
              errors.email ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.email && (
            <p className="mt-1 text-sm text-red-600">{errors.email}</p>
          )}
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
            No. Handphone
          </label>
          <input
            type="tel"
            id="phone"
            value={personalData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="Nomor handphone"
            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none ${
              errors.phone ? 'border-red-500' : 'border-gray-300'
            }`}
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
          )}
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <button
          onClick={handlePrevious}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
        >
          Sebelumnya
        </button>
        <button
          onClick={handleNext}
          className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 font-medium transition-colors"
        >
          Selanjutnya
        </button>
      </div>
    </div>
  );
}

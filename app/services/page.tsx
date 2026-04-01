'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/Button';
import ServicesStepper from '@/components/ServicesStepper';
import { useServiceOrderStore } from '@/store/useServiceOrderStore';
import { Check } from 'lucide-react';

let _svcIsLoggedInCache: boolean | null = null;

type ServicePriceType = 'ONE_TIME' | 'PER_YEAR' | 'MONTHLY';

type ServiceItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  priceType: ServicePriceType;
  isActive: boolean;
  packages?: ServicePackageOption[];
};

type ServicePackageOption = {
  id: string;
  code?: string;
  name: string;
  etaLabel?: string | null;
  description?: string | null;
  durationMonths?: number | null;
  price: number;
  isActive?: boolean;
  isVisible?: boolean;
  visibleInServices?: boolean;
  internalOnly?: boolean;
};

const PACKAGE_DISPLAY_ORDER: Record<string, number> = {
  REGULAR: 1,
  PRIORITY: 2,
  EXPRESS: 3,
};

const getPackageSortRank = (code?: string) => {
  if (!code) return 99;
  return PACKAGE_DISPLAY_ORDER[code.toUpperCase()] || 99;
};

const isExtensionCode = (code?: string) => Boolean(code && code.toUpperCase().startsWith('EXT_'));

export default function ServicesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [registering, setRegistering] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(_svcIsLoggedInCache ?? false);
  const [registerError, setRegisterError] = useState('');

  const currentStep = useServiceOrderStore((state) => state.currentStep);
  const selectedService = useServiceOrderStore((state) => state.selectedService);
  const selectedPackage = useServiceOrderStore((state) => state.selectedPackage);
  const personalData = useServiceOrderStore((state) => state.personalData);
  const setCurrentStep = useServiceOrderStore((state) => state.setCurrentStep);
  const setSelectedService = useServiceOrderStore((state) => state.setSelectedService);
  const setSelectedPackage = useServiceOrderStore((state) => state.setSelectedPackage);
  const setPersonalData = useServiceOrderStore((state) => state.setPersonalData);
  const getTotalPrice = useServiceOrderStore((state) => state.getTotalPrice);

  const packageOptions = useMemo(
    () => {
      if (!selectedService) return [];
      return (selectedService.packages || [])
        .filter((pkg) => pkg.price > 0)
        .filter((pkg) => !isExtensionCode(pkg.code))
        .sort((a, b) => {
          const rankDiff = getPackageSortRank(a.code) - getPackageSortRank(b.code);
          if (rankDiff !== 0) return rankDiff;
          return a.price - b.price;
        });
    },
    [selectedService]
  );

  const getServiceBasePackages = (service: ServiceItem) => {
    return (service.packages || [])
      .filter((pkg) => pkg.price > 0)
      .filter((pkg) => !isExtensionCode(pkg.code));
  };

  // Check login session
  useEffect(() => {
    if (_svcIsLoggedInCache !== null) {
      setIsLoggedIn(_svcIsLoggedInCache);
      return;
    }
    fetch('/api/client/profile')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('not logged in');
      })
      .then((data) => {
        if (data.name && data.email && data.phone) {
          _svcIsLoggedInCache = true;
          setIsLoggedIn(true);
          setPersonalData({
            fullName: data.name,
            email: data.email,
            phone: data.phone,
            company: data.company || '',
            notes: personalData.notes,
          });
          // If currently on step 3, skip to payment flow
          if (currentStep === 3) {
            setCurrentStep(2);
          }
        }
      })
      .catch(() => { _svcIsLoggedInCache = false; });
  }, []);

  useEffect(() => {
    const affiliateCode = String(searchParams.get('aff') || '').trim();
    if (affiliateCode) {
      localStorage.setItem('affiliate_code', affiliateCode);

      // Track click on server
      fetch('/api/affiliate/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: affiliateCode }),
      }).catch((err) => console.error('Failed to track affiliate click:', err));
    }

    const fetchServices = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/public/services?channel=services');
        const data = await res.json();

        if (!res.ok) {
          throw new Error('Gagal memuat layanan');
        }

        const activeServices = (data || [])
          .filter((item: ServiceItem) => item.isActive)
          .filter((item: ServiceItem) => getServiceBasePackages(item).length > 0);
        setServices(activeServices);

        if (activeServices.length === 0) {
          setSelectedService(null);
          setSelectedPackage(null);
          return;
        }

        const selectedStillExists = selectedService
          ? activeServices.some((item: ServiceItem) => item.id === selectedService.id)
          : false;

        if (!selectedStillExists) {
          setSelectedService(activeServices[0]);
        }

        const targetServicePackageId = String(searchParams.get('spkg') || '').trim();
        if (targetServicePackageId) {
          for (const service of activeServices) {
            const matchedPackage = (service.packages || []).find((pkg: ServicePackageOption) => pkg.id === targetServicePackageId);
            if (matchedPackage) {
              setSelectedService(service);
              setSelectedPackage(matchedPackage);
              break;
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch services:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, [searchParams, setSelectedPackage, setSelectedService]);

  useEffect(() => {
    if (!selectedService) return;
    const options = (selectedService.packages || [])
      .filter((pkg) => pkg.price > 0)
      .filter((pkg) => !isExtensionCode(pkg.code));
    const stillValid = options.some((pkg) => pkg.id === selectedPackage?.id);

    if (!stillValid && options.length > 0) {
      setSelectedPackage(options[0]);
    }
  }, [selectedService?.id]);

  const canContinueStep1 = Boolean(selectedService);
  const canContinueStep2 = Boolean(selectedPackage);
  const canContinueStep3 = Boolean(personalData.fullName && personalData.email && personalData.phone);

  const doBootstrapAndPay = async () => {
    try {
      setRegistering(true);
      setRegisterError('');

      const res = await fetch('/api/client/session/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: personalData.fullName,
          email: personalData.email,
          phone: personalData.phone,
          company: personalData.company,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal menyimpan sesi client');
      }
    } catch (error) {
      setRegisterError(error instanceof Error ? error.message : 'Gagal memproses pendaftaran');
      setRegistering(false);
      return;
    }

    setCurrentStep(4);
    router.push('/services/payment');
    setRegistering(false);
  };

  const handleNext = async () => {
    if (currentStep === 1 && !canContinueStep1) return;
    if (currentStep === 2 && !canContinueStep2) return;

    // If logged in, skip step 3 entirely: go from step 2 -> bootstrap -> payment
    if (isLoggedIn && currentStep === 2) {
      await doBootstrapAndPay();
      return;
    }

    if (currentStep === 3 && !canContinueStep3) return;

    if (currentStep >= 3) {
      await doBootstrapAndPay();
      return;
    }

    setCurrentStep(currentStep + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      // If logged in and on step 4, go back to step 2 (skip step 3)
      if (isLoggedIn && currentStep === 4) {
        setCurrentStep(2);
      } else {
        setCurrentStep(currentStep - 1);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <ServicesStepper currentStep={currentStep} isLoggedIn={isLoggedIn} />

        <div className="flex-1 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Order Layanan Pendukung</h1>
            <p className="text-sm text-gray-600 mt-1">
              Khusus untuk kebutuhan tambahan seperti company profile, email perusahaan, dan layanan pendukung lainnya.
            </p>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500">Memuat data layanan...</p>
            </div>
          ) : null}

          {!loading && currentStep === 1 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">1. Pilih Layanan</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((item) => {
                  const isSelected = selectedService?.id === item.id;
                  const basePackages = getServiceBasePackages(item);
                  const minPrice = basePackages.length > 0
                    ? Math.min(...basePackages.map((pkg) => Math.round(pkg.price)))
                    : item.price;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedService(item)}
                      className={`text-left rounded-xl border p-4 transition-all ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-100'
                          : 'border-gray-200 hover:border-cyan-300 hover:bg-gray-50'
                      }`}
                    >
                      <p className="text-base font-bold text-gray-900">{item.name}</p>
                      {item.description ? (
                        <div className="mt-2 space-y-1 min-h-[40px]">
                          {item.description.split('\n').slice(0, 3).map((line, idx) => (
                            <div key={idx} className="flex items-start gap-1.5 text-xs text-gray-600">
                              <Check className="w-3.5 h-3.5 text-cyan-600 mt-0.5 flex-shrink-0" />
                              <span className="line-clamp-1">{line.trim()}</span>
                            </div>
                          ))}
                          {item.description.split('\n').length > 3 && (
                            <p className="text-[10px] text-gray-400 ml-5">+{item.description.split('\n').length - 3} lainnya</p>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 mt-1 min-h-[40px] italic">Tanpa deskripsi</p>
                      )}
                      <p className="text-lg font-bold text-cyan-600 mt-3">
                        Mulai IDR {minPrice.toLocaleString('id-ID')}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {item.priceType === 'ONE_TIME' ? 'Sekali Bayar' : item.priceType === 'PER_YEAR' ? 'Per Tahun' : 'Bulanan'}
                      </p>
                      <p className="text-xs text-cyan-700 mt-1">{basePackages.length} paket tersedia</p>
                    </button>
                  );
                })}
              </div>
              {services.length === 0 ? (
                <p className="text-sm text-amber-700 mt-4">Belum ada layanan yang punya turunan paket aktif. Atur turunan paket dari halaman admin services.</p>
              ) : null}
            </div>
          ) : null}

          {!loading && currentStep === 2 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">2. Pilih Paket</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {packageOptions.map((pkg) => {
                  const isSelected = selectedPackage?.id === pkg.id;
                  return (
                    <button
                      key={pkg.id}
                      type="button"
                      onClick={() => setSelectedPackage(pkg)}
                      className={`text-left rounded-xl border p-4 transition-all ${
                        isSelected
                          ? 'border-cyan-500 bg-cyan-50 ring-2 ring-cyan-100'
                          : 'border-gray-200 hover:border-cyan-300 hover:bg-gray-50'
                      }`}
                    >
                      <p className="text-base font-bold text-gray-900">{pkg.name}</p>
                      {pkg.description ? (
                        <div className="mt-2 space-y-1.5">
                          {pkg.description.split('\n').filter(line => line.trim() !== '').map((line, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                              <Check className="w-4 h-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                              <span className="leading-tight">{line.trim()}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 mt-1 italic">Tanpa deskripsi paket</p>
                      )}
                      <p className="text-xs text-gray-500 mt-2">Estimasi: {pkg.etaLabel || '-'}</p>
                      {pkg.durationMonths ? (
                        <p className="text-xs text-gray-500 mt-1">Durasi: {pkg.durationMonths} bulan</p>
                      ) : null}
                      <p className="text-lg font-bold text-cyan-600 mt-3">
                        IDR {Math.round(pkg.price).toLocaleString('id-ID')}
                      </p>
                    </button>
                  );
                })}
              </div>
              {packageOptions.length === 0 ? (
                <p className="text-sm text-gray-500 mt-4">Belum ada paket utama (REGULAR/PRIORITY/EXPRESS) untuk layanan ini. Silakan atur turunan paket di admin services.</p>
              ) : null}
            </div>
          ) : null}

          {!loading && currentStep === 3 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">3. Isi Data Diri</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                    Nama Lengkap <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={personalData.fullName}
                    onChange={(e) => setPersonalData({ ...personalData, fullName: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                    placeholder="Nama lengkap"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={personalData.email}
                    onChange={(e) => setPersonalData({ ...personalData, email: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                    placeholder="nama@email.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">
                    Nomor WhatsApp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={personalData.phone}
                    onChange={(e) => setPersonalData({ ...personalData, phone: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Nama Perusahaan</label>
                  <input
                    type="text"
                    value={personalData.company}
                    onChange={(e) => setPersonalData({ ...personalData, company: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                    placeholder="(opsional)"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold uppercase text-gray-500 mb-1">Catatan Brief</label>
                  <textarea
                    rows={4}
                    value={personalData.notes}
                    onChange={(e) => setPersonalData({ ...personalData, notes: e.target.value })}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
                    placeholder="Tuliskan kebutuhan detail layanan Anda"
                  />
                </div>
              </div>
              {registerError ? (
                <p className="text-sm text-red-600 mt-4">{registerError}</p>
              ) : null}
            </div>
          ) : null}

          {!loading ? (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-semibold uppercase text-gray-500 mb-3">Ringkasan</h3>
              <div className="space-y-2 text-sm text-gray-700">
                <p><span className="font-semibold">Layanan:</span> {selectedService?.name || '-'}</p>
                <p><span className="font-semibold">Paket:</span> {selectedPackage?.name || '-'}</p>
                <p><span className="font-semibold">Total:</span> IDR {getTotalPrice().toLocaleString('id-ID')}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-5">
                {currentStep > 1 ? (
                  <Button
                    onClick={handleBack}
                    variant="secondary"
                    size="md"
                    fullWidth
                  >
                    Kembali
                  </Button>
                ) : null}
                <Button
                  onClick={handleNext}
                  variant="primary"
                  size="md"
                  fullWidth
                  isLoading={registering && (currentStep === 3 || (isLoggedIn && currentStep === 2))}
                  disabled={
                    registering ||
                    (currentStep === 1 && !canContinueStep1) ||
                    (currentStep === 2 && !canContinueStep2) ||
                    (!isLoggedIn && currentStep === 3 && !canContinueStep3)
                  }
                >
                  {(isLoggedIn && currentStep === 2) ? 'Lanjut ke Pembayaran' : currentStep < 3 ? 'Lanjut' : 'Lanjut ke Pembayaran'}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

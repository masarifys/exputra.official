'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useOrderStore } from '@/store/useOrderStore';
import { Package, AddOn } from '@/types';

let _pkgIsLoggedInCache: boolean | null = null;

interface PackageFromDB {
  id: string;
  name: string;
  price: number;
  price1Year?: number;
  price2Year?: number;
  price3Year?: number;
  duration: number;
  features: string;
  isPopular: boolean;
  isActive: boolean;
  discountBadge?: string;
  freeDomains: { id: string; extension: string }[];
  freeTemplates: { id: string; name: string }[];
}

interface ServiceFromDB {
  id: string;
  name: string;
  description: string | null;
  price: number;
  priceType: 'ONE_TIME' | 'PER_YEAR';
  isActive: boolean;
}

export default function PackageStep() {
  const [promoInput, setPromoInput] = useState('');
  const [promoError, setPromoError] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  const [packages, setPackages] = useState<PackageFromDB[]>([]);
  const [addOns, setAddOns] = useState<ServiceFromDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoLoading, setPromoLoading] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState(1); // Track selected duration

  const selectedPackage = useOrderStore((state) => state.selectedPackage);
  const setSelectedPackage = useOrderStore((state) => state.setSelectedPackage);
  const selectedAddOns = useOrderStore((state) => state.selectedAddOns);
  const toggleAddOn = useOrderStore((state) => state.toggleAddOn);

  const fetchData = useCallback(async () => {
    try {
      const [packagesRes, servicesRes] = await Promise.all([
        fetch('/api/public/packages'),
        fetch('/api/public/services?channel=order'),
      ]);

      if (packagesRes.ok) {
        const packagesData = await packagesRes.json();
        setPackages(packagesData);
      }

      if (servicesRes.ok) {
        const servicesData = await servicesRes.json();
        setAddOns(servicesData);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePackageSelect = useCallback((pkg: PackageFromDB) => {
    const priceForDuration =
      selectedDuration === 1 ? (pkg.price1Year || pkg.price) :
      selectedDuration === 2 ? (pkg.price2Year || pkg.price * 2) :
      (pkg.price3Year || pkg.price * 3);

    setSelectedPackage({
      id: pkg.id,
      name: pkg.name,
      duration: selectedDuration,
      price: priceForDuration,
      isPopular: pkg.isPopular,
      freeDomains: pkg.freeDomains,
    });
  }, [selectedDuration, setSelectedPackage]);

  useEffect(() => {
    if (loading || packages.length === 0 || selectedPackage) return;

    const affiliatePackageId = localStorage.getItem('affiliate_package_id');
    if (!affiliatePackageId) return;

    const promotedPackage = packages.find((pkg) => pkg.id === affiliatePackageId);
    if (promotedPackage) {
      handlePackageSelect(promotedPackage);
    }
  }, [loading, packages, selectedPackage, handlePackageSelect]);

  // Sync selected add-ons with available add-ons
  // This handles the case where a user selected an add-on that is no longer available/active
  useEffect(() => {
    if (!loading && addOns.length > 0) {
      const invalidAddOns = selectedAddOns.filter(
        (selected) => !addOns.some((available) => available.id === selected.id)
      );

      if (invalidAddOns.length > 0) {
        invalidAddOns.forEach((addon) => {
          toggleAddOn(addon);
        });
      }
    }
  }, [loading, addOns, selectedAddOns, toggleAddOn]);
  const promoCode = useOrderStore((state) => state.promoCode);
  const setPromoCode = useOrderStore((state) => state.setPromoCode);
  const getTotalPrice = useOrderStore((state) => state.getTotalPrice);
  const setCurrentStep = useOrderStore((state) => state.setCurrentStep);
  const [isLoggedIn, setIsLoggedIn] = useState(_pkgIsLoggedInCache ?? false);

  useEffect(() => {
    if (_pkgIsLoggedInCache !== null) {
      setIsLoggedIn(_pkgIsLoggedInCache);
      return;
    }
    fetch('/api/client/profile')
      .then((res) => {
        if (res.ok) { _pkgIsLoggedInCache = true; setIsLoggedIn(true); }
        else { _pkgIsLoggedInCache = false; }
      })
      .catch(() => { _pkgIsLoggedInCache = false; });
  }, []);

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;

    setPromoLoading(true);
    setPromoError('');

    try {
      const subtotal = (selectedPackage?.price || 0) +
        selectedAddOns.reduce((sum, a) => sum + a.price, 0);

      const res = await fetch('/api/public/promos/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: promoInput, subtotal }),
      });

      const data = await res.json();

      if (data.valid) {
        setPromoCode({
          code: data.promo.code,
          discount: data.promo.discountValue,
          type: data.promo.discountType === 'PERCENT' ? 'percentage' : 'fixed',
        });
        setPromoError('');
      } else {
        setPromoError(data.message || 'Kode promo tidak valid');
        setPromoCode(null);
      }
    } catch (error) {
      console.error('Failed to validate promo:', error);
      setPromoError('Gagal memvalidasi promo');
      setPromoCode(null);
    } finally {
      setPromoLoading(false);
    }
  };

  const handleNext = () => {
    if (selectedPackage) {
      setShowSummary(true);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(isLoggedIn ? 2 : 3);
  };

  const isAddOnSelected = (addonId: string) => {
    return selectedAddOns.some((a) => a.id === addonId);
  };

  return (
    <div className="max-w-4xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">4. Pilih Paket Berlangganan</h2>

      {/* Duration Selection */}
      <div className="mb-8">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">Pilih Durasi Berlangganan</h3>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[1, 2, 3].map((duration) => (
            <button
              key={duration}
              onClick={() => {
                setSelectedDuration(duration);
                if (selectedPackage) {
                  handlePackageSelect(packages.find(p => p.id === selectedPackage.id)!);
                }
              }}
              className={`w-full px-2 sm:px-6 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg whitespace-nowrap transition-all duration-200 ${
                selectedDuration === duration
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-xl scale-105 ring-2 ring-offset-2 ring-cyan-400'
                  : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-cyan-400 hover:shadow-md'
              }`}
            >
              {duration} Tahun
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
        {packages.map((pkg) => {
          const isSelected = selectedPackage?.id === pkg.id;
          // Handle features split by comma or pipe
          let features: string[] = [];
          if (pkg.features) {
            // Try splitting by common delimiters
            if (pkg.features.includes('|')) {
              features = pkg.features.split('|').map(f => f.trim()).filter(f => f);
            } else if (pkg.features.includes('\n')) {
              features = pkg.features.split('\n').map(f => f.trim()).filter(f => f);
            } else {
              features = pkg.features.split(',').map(f => f.trim()).filter(f => f);
            }
          }

          return (
            <div
              key={pkg.id}
              onClick={() => handlePackageSelect(pkg)}
              className={`rounded-xl overflow-hidden cursor-pointer transition-all relative ${isSelected
                ? 'ring-2 ring-cyan-500 shadow-xl'
                : 'shadow-lg hover:shadow-xl'
                } ${pkg.isPopular ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-gray-700 to-gray-800'}`}
            >
              {pkg.isPopular && (
                <div className="absolute top-0 right-0">
                  <span className="px-3 py-1 bg-orange-500 text-white text-xs font-semibold rounded-bl-lg">
                    Terpopuler
                  </span>
                </div>
              )}
              {pkg.discountBadge && (
                <div className="absolute top-0 left-0">
                  <span className="px-3 py-1 bg-green-500 text-white text-xs font-semibold rounded-br-lg">
                    {pkg.discountBadge}
                  </span>
                </div>
              )}
              <div className="p-4 sm:p-5">
                <h3 className="font-bold text-white mb-2 text-base sm:text-lg">{pkg.name}</h3>
                <p className="text-xl sm:text-2xl font-bold text-cyan-400 mb-1">
                  Rp {(
                    selectedDuration === 1 ? (pkg.price1Year || pkg.price) :
                    selectedDuration === 2 ? (pkg.price2Year || pkg.price * 2) :
                    (pkg.price3Year || pkg.price * 3)
                  ).toLocaleString('id-ID')}
                </p>
                <p className="text-xs text-gray-400 mb-4">/{selectedDuration} tahun</p>

                {features.length > 0 && (
                  <>
                    <p className="text-white font-semibold text-sm mb-3">Layanan</p>
                    <ul className="space-y-2 mb-4">
                      {features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-gray-300">
                          <svg className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5 min-w-fit" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className="break-words">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {pkg.freeTemplates && pkg.freeTemplates.length > 0 && (
                  <div className="mb-4 p-2 bg-green-500/10 border border-green-500/30 rounded">
                    <p className="text-green-400 font-semibold text-xs mb-2">🎨 Template Gratis</p>
                    <ul className="space-y-1">
                      {pkg.freeTemplates.map((template, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-green-300">
                          <svg className="w-3 h-3 text-green-400 flex-shrink-0 mt-0.5 min-w-fit" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span>{template.name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  className={`w-full py-2.5 rounded-lg font-semibold transition-colors text-sm ${isSelected
                    ? 'bg-cyan-500 text-white'
                    : 'bg-cyan-400 text-gray-900 hover:bg-cyan-300'
                    }`}
                >
                  {isSelected ? 'Terpilih ✓' : 'Pesan Sekarang'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Jasa Tambahan</h3>
        <div className="space-y-3">
          {addOns.map((addon: ServiceFromDB) => {
            const isSelected = isAddOnSelected(addon.id);

            return (
              <div
                key={addon.id}
                onClick={() => toggleAddOn({ id: addon.id, name: addon.name, price: addon.price })}
                className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${isSelected
                  ? 'border-cyan-500 bg-cyan-50'
                  : 'border-gray-200 hover:border-cyan-300'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => { }}
                      className="w-5 h-5 text-cyan-500 rounded focus:ring-cyan-500"
                    />
                    <div>
                      <p className="font-semibold text-gray-900">{addon.name}</p>
                      <p className="text-sm text-gray-500">
                        {addon.description || `${addon.priceType === 'PER_YEAR' ? 'Per Tahun' : 'Sekali Bayar'}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">
                      Rp {addon.price.toLocaleString('id-ID')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {addon.priceType === 'PER_YEAR' ? '/tahun' : ''}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">Punya Kode Promo?</h3>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={promoInput}
            onChange={(e) => {
              setPromoInput(e.target.value);
              setPromoError('');
            }}
            placeholder="Kode promo"
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none text-base"
          />
          <button
            onClick={handleApplyPromo}
            disabled={promoLoading}
            className="w-full sm:w-auto px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {promoLoading ? 'Memvalidasi...' : 'Gunakan Promo'}
          </button>
        </div>
        {promoError && (
          <p className="mt-2 text-sm text-red-600">{promoError}</p>
        )}
        {promoCode && (
          <p className="mt-2 text-sm text-green-600">
            Kode promo "{promoCode.code}" berhasil diterapkan!
          </p>
        )}
      </div>

      <div className="bg-gray-50 rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-900">Total</span>
          <span className="text-2xl font-bold text-cyan-600">
            Rp {getTotalPrice().toLocaleString('id-ID')}
          </span>
        </div>
      </div>

      <div className="flex justify-between">
        <button
          onClick={handlePrevious}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
        >
          Sebelumnya
        </button>
        <button
          onClick={handleNext}
          disabled={!selectedPackage}
          className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium transition-colors"
        >
          Konfirmasi
        </button>
      </div>

      {showSummary && (
        <SummaryModal onClose={() => setShowSummary(false)} selectedDuration={selectedDuration} />
      )}
    </div>
  );
}

function SummaryModal({ onClose, selectedDuration }: { onClose: () => void; selectedDuration: number }) {
  const domainSearch = useOrderStore((state) => state.domainSearch);
  const selectedDomain = useOrderStore((state) => state.selectedDomain);
  const selectedTemplate = useOrderStore((state) => state.selectedTemplate);
  const selectedPackage = useOrderStore((state) => state.selectedPackage);
  const selectedAddOns = useOrderStore((state) => state.selectedAddOns);
  const promoCode = useOrderStore((state) => state.promoCode);
  const getTotalPrice = useOrderStore((state) => state.getTotalPrice);

  const handlePayment = () => {
    window.location.href = '/order/payment';
  };

  const templatePrice = selectedTemplate?.price || 0;
  
  // Calculate package price based on selected duration
  let packagePrice = 0;
  if (selectedPackage) {
    if (selectedDuration === 1) {
      packagePrice = (selectedPackage as any).price1Year || selectedPackage.price;
    } else if (selectedDuration === 2) {
      packagePrice = (selectedPackage as any).price2Year || selectedPackage.price * 2;
    } else {
      packagePrice = (selectedPackage as any).price3Year || selectedPackage.price * 3;
    }
  }
  
  const subtotal = (selectedDomain?.price || 0) + templatePrice + packagePrice +
    selectedAddOns.reduce((sum, addon) => sum + addon.price, 0);

  // Calculate actual total within component for display consistency (or rely on store's getTotalPrice)
  // But store's getTotalPrice already has logic.
  // Let's replicate logic locally for "Domain Price" display or just use condition.
  const isFreeDomain = selectedDomain && selectedPackage?.freeDomains?.some(
    (fd) => selectedDomain.extension === fd.extension || selectedDomain.extension.endsWith(fd.extension)
  );

  const discount = promoCode
    ? promoCode.type === 'percentage'
      ? subtotal * promoCode.discount / 100
      : promoCode.discount
    : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Ringkasan Pembelian</h3>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between">
            <span className="text-gray-600">Domain</span>
            <span className="font-semibold">
              {isFreeDomain ? (
                <span className="text-green-600">Gratis (Paket)</span>
              ) : (
                `Rp ${(selectedDomain?.price || 0).toLocaleString('id-ID')}`
              )}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            {domainSearch}{selectedDomain?.extension}
          </div>

          <div className="flex justify-between pt-3 border-t">
            <span className="text-gray-600">Template</span>
            <span className="font-semibold">
              {templatePrice === 0 ? 'Gratis' : `Rp ${templatePrice.toLocaleString('id-ID')}`}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            {selectedTemplate?.name} {selectedTemplate?.isPaid && '(Premium)'}
          </div>

          <div className="flex justify-between pt-3 border-t">
            <span className="text-gray-600">Biaya Langganan</span>
            <span className="font-semibold">
              Rp {packagePrice.toLocaleString('id-ID')}
            </span>
          </div>
          <div className="text-sm text-gray-500">
            {selectedPackage?.name} - {selectedDuration} Tahun
          </div>
          {selectedPackage && (() => {
            const features = selectedPackage && 'features' in selectedPackage 
              ? (selectedPackage as any).features 
                ? (selectedPackage as any).features.split(',').map((f: string) => f.trim())
                : []
              : [];
            return features.length > 0 ? (
              <div className="mt-2 space-y-2">
                {features.map((feature: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-sm">
                    <svg className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-gray-600">{feature}</span>
                  </div>
                ))}
              </div>
            ) : null;
          })()}

          {selectedAddOns.length > 0 && (
            <>
              <div className="flex justify-between pt-3 border-t">
                <span className="text-gray-600">Biaya Admin</span>
                <span className="font-semibold">
                  Rp {selectedAddOns.reduce((sum, a) => sum + a.price, 0).toLocaleString('id-ID')}
                </span>
              </div>
              {selectedAddOns.map((addon) => (
                <div key={addon.id} className="text-sm text-gray-500">
                  {addon.name}
                </div>
              ))}
            </>
          )}

          {promoCode && (
            <div className="flex justify-between pt-3 border-t text-green-600">
              <span>Diskon ({promoCode.code})</span>
              <span className="font-semibold">
                - Rp {discount.toLocaleString('id-ID')}
              </span>
            </div>
          )}

          <div className="flex justify-between pt-3 border-t font-bold text-lg">
            <span>Total</span>
            <span className="text-cyan-600">
              Rp {getTotalPrice().toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Tutup
          </button>
          <button
            onClick={handlePayment}
            className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 font-medium transition-colors"
          >
            Bayar
          </button>
        </div>
      </div>
    </div>
  );
}

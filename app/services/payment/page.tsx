'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, CreditCard, User, Mail, Phone, Building2, CheckCircle2, CheckCircle, RotateCcw } from 'lucide-react';
import Image from 'next/image';
import Button from '@/components/Button';
import ServicesStepper from '@/components/ServicesStepper';
import { useServiceOrderStore } from '@/store/useServiceOrderStore';

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  duitkuCode: string;
}

const paymentMethods: PaymentMethod[] = [
  { id: 'va-bni', name: 'BNI Virtual Account', icon: '/payment-icons/bni.png', duitkuCode: 'I1' },
  { id: 'va-bri', name: 'BRI Virtual Account', icon: '/payment-icons/bri.png', duitkuCode: 'BR' },
  { id: 'va-mandiri', name: 'Mandiri Virtual Account', icon: '/payment-icons/mandiri.png', duitkuCode: 'M2' },
  { id: 'qris', name: 'QRIS (ALL BANK)', icon: '/payment-icons/qris.png', duitkuCode: 'SP' },
];

function getCountdownText(expiredAt: Date | null): string {
  if (!expiredAt) return '-';

  const diff = expiredAt.getTime() - Date.now();
  if (diff <= 0) return 'EXPIRED';

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `${hours}h ${minutes}m ${seconds}s`;
}

export default function ServicesPaymentPage() {
  const router = useRouter();
  const [selectedPayment, setSelectedPayment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [mounted, setMounted] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoMessage, setPromoMessage] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{
    id: string;
    code: string;
    discount: number;
    discountType: 'PERCENT' | 'NOMINAL';
    discountValue: number;
  } | null>(null);
  const [expiredAt, setExpiredAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState('-');
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [paidAt, setPaidAt] = useState<string | null>(null);

  const currentStep = useServiceOrderStore((state) => state.currentStep);
  const setCurrentStep = useServiceOrderStore((state) => state.setCurrentStep);
  const selectedService = useServiceOrderStore((state) => state.selectedService);
  const selectedPackage = useServiceOrderStore((state) => state.selectedPackage);
  const personalData = useServiceOrderStore((state) => state.personalData);
  const setPersonalData = useServiceOrderStore((state) => state.setPersonalData);
  const invoiceId = useServiceOrderStore((state) => state.invoiceId);
  const setInvoiceId = useServiceOrderStore((state) => state.setInvoiceId);
  const getTotalPrice = useServiceOrderStore((state) => state.getTotalPrice);

  const subtotalPrice = getTotalPrice();
  const discountAmount = Math.min(appliedPromo?.discount || 0, subtotalPrice);
  const totalPrice = Math.max(0, subtotalPrice - discountAmount);

  useEffect(() => {
    setMounted(true);
    setCurrentStep(4);
    
    // Auto-fill from session if logged in
    fetch('/api/client/profile')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && (!personalData.fullName || !personalData.email)) {
          setPersonalData({
            ...personalData,
            fullName: data.name || '',
            email: data.email || '',
            phone: data.phone || '',
            company: data.company || '',
          });
        }
      })
      .catch(() => {});
  }, [setCurrentStep, setPersonalData, personalData]);

  useEffect(() => {
    if (mounted && (!selectedService || !selectedPackage)) {
      router.replace('/services');
      return;
    }

    if (mounted && !invoiceId) {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      
      // 4 random characters to ensure uniqueness
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let random = '';
      for (let i = 0; i < 4; i++) {
        random += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      const generated = `SRV-${day}${month}${year}-${hours}${minutes}${seconds}-${random}`;
      setInvoiceId(generated);
    }

    const expiry = new Date(Date.now() + 60 * 60 * 1000);
    setExpiredAt(expiry);
    setCountdown(getCountdownText(expiry));
  }, [mounted, invoiceId, selectedService, selectedPackage, router, setInvoiceId]);

  // Polling status
  useEffect(() => {
    if (!mounted || !invoiceId) return;

    const checkStatus = async () => {
      try {
        const res = await fetch(`/api/order/update-status?invoiceId=${encodeURIComponent(invoiceId)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.order) {
            setOrderStatus(data.order.status);
            if (data.order.paidAt) {
              setPaidAt(new Date(data.order.paidAt).toLocaleString('id-ID'));
            }
          }
        }
      } catch (e) {
        console.error('Check status error:', e);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [mounted, invoiceId]);

  useEffect(() => {
    if (!expiredAt) return;

    const timer = setInterval(() => {
      setCountdown(getCountdownText(expiredAt));
    }, 1000);

    return () => clearInterval(timer);
  }, [expiredAt]);

  const handlePay = async () => {
    if (!selectedPayment) {
      setError('Pilih metode pembayaran terlebih dahulu');
      return;
    }

    if (!selectedService || !selectedPackage) {
      setError('Data layanan belum lengkap');
      return;
    }

    if (totalPrice <= 0) {
      setError('Total pembayaran tidak valid setelah diskon promo');
      return;
    }

    setError('');
    setInfo('');
    setIsProcessing(true);

    try {
      const method = paymentMethods.find((item) => item.id === selectedPayment);
      const affiliateCode = localStorage.getItem('affiliate_code');
      const res = await fetch('/api/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: invoiceId,
          amount: totalPrice,
          customerName: personalData.fullName,
          customerEmail: personalData.email,
          customerPhone: personalData.phone,
          productDetails: `${selectedService.name} - ${selectedPackage.name}`,
          paymentMethod: method?.duitkuCode || '',
          returnUrl: `${window.location.origin}/services/payment/success`,
          orderData: {
            serviceFlow: true,
            affiliateCode,
            serviceOrder: {
              servicePackageId: selectedPackage.id,
              packageCode: selectedPackage.code,
              serviceId: selectedService.id,
              packageName: selectedPackage.name,
              packageMultiplier: 1,
              packageDescription: selectedPackage.description,
              etaLabel: selectedPackage.etaLabel,
              durationMonths: selectedPackage.durationMonths,
              company: personalData.company,
              notes: personalData.notes,
              subtotal: subtotalPrice,
              discount: discountAmount,
              promoCode: appliedPromo?.code || null,
            },
          },
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Gagal memproses pembayaran layanan');
      }

      setInfo('Tagihan pembayaran berhasil dibuat. Silakan selesaikan pembayaran di tab baru.');

      if (data.data?.paymentUrl) {
        window.open(data.data.paymentUrl, '_blank');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan saat pembayaran');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApplyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) {
      setPromoMessage('Masukkan kode voucher terlebih dahulu');
      return;
    }

    try {
      setIsValidatingPromo(true);
      setPromoMessage('');

      const res = await fetch('/api/public/promos/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          subtotal: subtotalPrice,
        }),
      });

      const data = await res.json();

      if (!data.valid || !data.promo) {
        setAppliedPromo(null);
        setPromoMessage(data.message || 'Kode voucher tidak valid');
        return;
      }

      setAppliedPromo({
        id: data.promo.id,
        code: data.promo.code,
        discount: Number(data.promo.discount || 0),
        discountType: data.promo.discountType,
        discountValue: Number(data.promo.discountValue || 0),
      });
      setPromoCode(data.promo.code);
      setPromoMessage(`Voucher ${data.promo.code} berhasil diterapkan`);
    } catch (e) {
      setAppliedPromo(null);
      setPromoMessage(e instanceof Error ? e.message : 'Gagal memvalidasi voucher');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoMessage('Voucher dihapus');
  };

  if (!mounted) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Memuat detail pembayaran...</p>
      </div>
    );
  }

  // Show PAID status layout
  if (orderStatus === 'PAID') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <ServicesStepper currentStep={5} />
          <div className="flex-1 max-w-2xl mx-auto py-8">
            <div className="bg-white rounded-2xl shadow-lg border border-green-200 p-8 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Pembayaran Berhasil!</h2>
              <p className="text-gray-600 mb-6">
                Layanan Anda <strong className="text-gray-900">{selectedService?.name}</strong> dengan No Invoice <strong className="text-gray-900">{invoiceId}</strong> telah dibayar.
              </p>
              {paidAt && <p className="text-sm text-gray-500 mb-6">Dibayar pada: {paidAt}</p>}
              
              <div className="bg-gray-50 rounded-xl p-5 mb-6 text-left space-y-2 text-sm">
                <p><span className="font-semibold text-gray-700">Layanan:</span> {selectedService?.name}</p>
                <p><span className="font-semibold text-gray-700">Paket:</span> {selectedPackage?.name}</p>
                <p><span className="font-semibold text-gray-700">Total:</span> IDR {totalPrice.toLocaleString('id-ID')}</p>
                <p><span className="font-semibold text-gray-700">Pemesan:</span> {personalData.fullName}</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={() => router.push('/client/dashboard')} variant="primary" size="lg" fullWidth>
                  Ke Dashboard
                </Button>
                <Button onClick={() => { useServiceOrderStore.getState().reset(); router.push('/services'); }} variant="secondary" size="lg" fullWidth>
                  Pesan Lainnya
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show CANCELLED status layout
  if (orderStatus === 'CANCELLED') {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 text-center">
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <RotateCcw className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pembayaran Dibatalkan</h2>
          <p className="text-gray-600 mb-6">Tagihan {invoiceId} sudah dibatalkan atau kedaluwarsa.</p>
          <Button onClick={() => { useServiceOrderStore.getState().reset(); router.push('/services'); }} variant="primary" size="lg">
            Mulai Pesanan Baru
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <ServicesStepper currentStep={currentStep} />

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-gray-600">Batas Pembayaran</p>
                  <p className="text-lg font-bold text-gray-900 mt-1">
                    {expiredAt ? expiredAt.toLocaleString('id-ID') : '-'}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-cyan-700 font-semibold text-sm">
                  <Clock className="w-5 h-5" />
                  <span>{countdown}</span>
                </div>
              </div>

              <div className="text-center py-8">
                <p className="text-sm text-gray-500">Total Pembayaran</p>
                <p className="text-4xl font-bold text-gray-900 mt-2">IDR {totalPrice.toLocaleString('id-ID')}</p>
                {discountAmount > 0 ? (
                  <p className="text-sm text-green-600 mt-2">
                    Diskon voucher: -IDR {discountAmount.toLocaleString('id-ID')} dari subtotal IDR {subtotalPrice.toLocaleString('id-ID')}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Pilih Metode Pembayaran</h2>

              <div className="mb-4 rounded-xl border border-gray-200 p-4 bg-gray-50">
                <p className="text-sm font-semibold text-gray-900 mb-2">Masukan Voucher Promo</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: PROMO10"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleApplyPromo} variant="secondary" size="sm" isLoading={isValidatingPromo} disabled={isValidatingPromo}>
                      Terapkan
                    </Button>
                    {appliedPromo ? (
                      <Button onClick={handleRemovePromo} variant="danger" size="sm">
                        Hapus
                      </Button>
                    ) : null}
                  </div>
                </div>
                {promoMessage ? <p className={`text-xs mt-2 ${appliedPromo ? 'text-green-600' : 'text-gray-600'}`}>{promoMessage}</p> : null}
              </div>

              <div className="space-y-3">
                {paymentMethods.map((method) => {
                  const isSelected = selectedPayment === method.id;
                  return (
                    <div
                      key={method.id}
                      onClick={() => setSelectedPayment(method.id)}
                      className={`border-2 rounded-xl p-3 sm:p-4 cursor-pointer transition-all duration-200 flex items-center justify-between ${
                        isSelected ? 'border-cyan-500 bg-cyan-50 shadow-sm' : 'border-gray-200 hover:border-cyan-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg border flex items-center justify-center overflow-hidden transition-colors ${isSelected ? 'bg-white border-cyan-200' : 'bg-gray-50 border-gray-200'}`}>
                          <Image src={method.icon} alt={method.name} width={34} height={34} className="w-8 h-8 sm:w-[34px] sm:h-[34px] object-contain" />
                        </div>
                        <span className="font-medium text-gray-900 text-sm sm:text-base">{method.name}</span>
                      </div>
                      {isSelected ? <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-cyan-600" /> : <svg className="w-5 h-5 flex-shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>}
                    </div>
                  );
                })}
              </div>

              {error ? <p className="text-sm text-red-600 mt-4">{error}</p> : null}
              {info ? <p className="text-sm text-green-600 mt-4">{info}</p> : null}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
                <Button onClick={() => router.push('/services')} variant="secondary" size="md" fullWidth>
                  Kembali
                </Button>
                <Button onClick={handlePay} disabled={!selectedPayment || isProcessing} variant="primary" size="md" icon={<CreditCard className="w-4 h-4" />} isLoading={isProcessing} fullWidth>
                  {isProcessing ? 'Memproses...' : 'Bayar Sekarang'}
                </Button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6 lg:sticky lg:top-8">
              <h3 className="text-base font-bold text-gray-900">Ringkasan Layanan</h3>
              <p className="text-xs text-gray-500 mt-1">Invoice: {invoiceId || '-'}</p>

              <div className="mt-4 pt-4 border-t space-y-3 text-sm">
                <p><span className="font-semibold">Layanan:</span> {selectedService?.name || '-'}</p>
                <p><span className="font-semibold">Paket:</span> {selectedPackage?.name || '-'}</p>
                <p><span className="font-semibold">Subtotal:</span> IDR {subtotalPrice.toLocaleString('id-ID')}</p>
                <p><span className="font-semibold">Diskon Promo:</span> -IDR {discountAmount.toLocaleString('id-ID')}</p>
                <p><span className="font-semibold">Total:</span> IDR {totalPrice.toLocaleString('id-ID')}</p>
              </div>

              <div className="mt-4 pt-4 border-t space-y-2 text-sm text-gray-700">
                <p className="font-semibold text-gray-900">Informasi Pemesan</p>
                <p className="flex items-start gap-2"><User className="w-4 h-4 mt-0.5" />{personalData.fullName || '-'}</p>
                <p className="flex items-start gap-2"><Mail className="w-4 h-4 mt-0.5" />{personalData.email || '-'}</p>
                <p className="flex items-start gap-2"><Phone className="w-4 h-4 mt-0.5" />{personalData.phone || '-'}</p>
                <p className="flex items-start gap-2"><Building2 className="w-4 h-4 mt-0.5" />{personalData.company || '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

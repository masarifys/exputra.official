'use client';

import { useOrderStore } from '@/store/useOrderStore';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import { RotateCcw, CreditCard, Clock, User, Mail, Phone, CheckCircle2, CheckCircle } from 'lucide-react';
import Image from 'next/image';

interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  duitkuCode: string;
}

function formatExpiryTime(expiryTime?: string): string {
  if (!expiryTime) return '-';
  const d = new Date(expiryTime);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const paymentMethods: PaymentMethod[] = [
  { id: 'va-bni', name: 'BNI Virtual Account', icon: '/payment-icons/bni.png', duitkuCode: 'I1' },
  { id: 'va-bri', name: 'BRI Virtual Account', icon: '/payment-icons/bri.png', duitkuCode: 'BR' },
  { id: 'va-mandiri', name: 'Mandiri Virtual Account', icon: '/payment-icons/mandiri.png', duitkuCode: 'M2' },
  { id: 'qris-nobu', name: 'QRIS (ALL BANK)', icon: '/payment-icons/qris.png', duitkuCode: 'SP' },
];

export default function PaymentPage() {
  const [selectedPayment, setSelectedPayment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [error, setError] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);
  const [expiryTime, setExpiryTime] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState('');
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [paidAt, setPaidAt] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const router = useRouter();

  const domainSearch = useOrderStore((state) => state.domainSearch);
  const selectedDomain = useOrderStore((state) => state.selectedDomain);
  const selectedTemplate = useOrderStore((state) => state.selectedTemplate);
  const selectedPackage = useOrderStore((state) => state.selectedPackage);
  const selectedAddOns = useOrderStore((state) => state.selectedAddOns);
  const promoCode = useOrderStore((state) => state.promoCode);
  const getTotalPrice = useOrderStore((state) => state.getTotalPrice);
  const personalData = useOrderStore((state) => state.personalData);
  const invoiceId = useOrderStore((state) => state.invoiceId);
  const setInvoiceId = useOrderStore((state) => state.setInvoiceId);
  const setPersonalData = useOrderStore((state) => state.setPersonalData);
  const _hasHydrated = useOrderStore((state) => state._hasHydrated);
  const orderInitiated = useOrderStore((state) => state.orderInitiated);
  const setOrderInitiated = useOrderStore((state) => state.setOrderInitiated);

  // Initialize on mount, but wait for store hydration
  useEffect(() => {
    if (!_hasHydrated) return;
    
    setIsHydrated(true);

    // Auto-fill personal data from session if logged in
    fetch('/api/client/profile')
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error('not logged in');
      })
      .then((data) => {
        if (data.name && data.email && data.phone) {
          // Only fill if personalData is empty (don't override store data)
          if (!personalData.fullName && !personalData.email) {
            setPersonalData({
              fullName: data.name,
              email: data.email,
              phone: data.phone,
            });
          }
        }
      })
      .catch(() => {});

    // Generate invoiceId only if not already set
    if (!invoiceId) {
      const now = new Date();
      const day = String(now.getDate()).padStart(2, '0');
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const year = String(now.getFullYear()).slice(-2);
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      
      // Add 4 random chars
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let random = '';
      for (let i = 0; i < 4; i++) {
        random += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      
      const id = `INV-${day}${month}${year}-${hours}${minutes}${seconds}-${random}`;
      setInvoiceId(id);
    }

    // Set expiry time to 60 minutes from now
    const expiryDate = new Date(Date.now() + 60 * 60 * 1000);
    setExpiryTime(expiryDate);
  }, [_hasHydrated, setInvoiceId, setPersonalData, personalData.fullName, personalData.email, invoiceId]);

  // Check order status from server (detect PAID)
  useEffect(() => {
    if (!invoiceId || !isHydrated || !orderInitiated) return;

    const checkOrderStatus = async () => {
      setCheckingStatus(true);
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
      } catch {
        // Order not found yet or network error — ignore
      } finally {
        setCheckingStatus(false);
      }
    };

    checkOrderStatus();

    // Poll every 3 seconds to detect payment completion (faster for user experience)
    const interval = setInterval(checkOrderStatus, 3000);
    return () => clearInterval(interval);
  }, [invoiceId, isHydrated, orderInitiated]);

  // Automatic redirect when PAID
  useEffect(() => {
    if (orderStatus === 'PAID' && invoiceId) {
      console.log(`[PaymentPage] Payment SUCCESS detected for ${invoiceId}, redirecting...`);
      // Short delay to let the user see the "Success" state briefly if they're on the page
      const timer = setTimeout(() => {
        router.push(`/order/payment/success?merchantOrderId=${encodeURIComponent(invoiceId)}&resultCode=00`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [orderStatus, invoiceId, router]);

  // Countdown timer
  useEffect(() => {
    if (!expiryTime) return;

    const updateCountdown = () => {
      const now = new Date();
      const diff = expiryTime.getTime() - now.getTime();
      if (diff <= 0) {
        setCountdown('EXPIRED');
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setCountdown(`${hours}h ${minutes}m ${seconds}s`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [expiryTime]);

  const templatePrice = selectedTemplate?.price || 0;
  const isFreeDomain = selectedDomain && selectedPackage?.freeDomains?.some(
    (fd) => selectedDomain.extension === fd.extension || selectedDomain.extension.endsWith(fd.extension)
  );
  const domainPrice = isFreeDomain ? 0 : (selectedDomain?.price || 0);

  const subtotal = domainPrice + templatePrice + (selectedPackage?.price || 0) + 
    selectedAddOns.reduce((sum, addon) => sum + addon.price, 0);

  const discount = promoCode 
    ? promoCode.type === 'percentage' 
      ? subtotal * promoCode.discount / 100
      : promoCode.discount
    : 0;

  const totalPrice = getTotalPrice();

  const handlePayment = async () => {
    if (!selectedPayment) {
      setError('Silakan pilih metode pembayaran');
      return;
    }

    if (totalPrice === 0) {
      setError('Total pembayaran tidak valid. Silakan ulangi pemesanan.');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const paymentMethod = paymentMethods.find(pm => pm.id === selectedPayment);
      const affiliateCode = localStorage.getItem('affiliate_code');
      
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: invoiceId,
          amount: totalPrice,
          customerName: personalData.fullName,
          customerEmail: personalData.email,
          customerPhone: personalData.phone,
          productDetails: `Website Package - ${selectedPackage?.name}`,
          paymentMethod: paymentMethod?.duitkuCode || '',
          orderData: {
            domainName: domainSearch,
            domainId: selectedDomain?.id,
            templateId: selectedTemplate?.id,
            packageId: selectedPackage?.id,
            affiliateCode,
            promoId: null,
            subtotal: subtotal,
            discount: discount,
            services: selectedAddOns.map(addon => ({ id: addon.id, price: addon.price })),
          }
        }),
      });

      const result = await response.json();

      if (result.success) {
        setPaymentData(result.data);

        // Save order data for success page
        const orderDataForSuccess = {
          invoiceId,
          domainSearch,
          selectedDomain,
          selectedPackage,
          personalData,
          totalPrice,
          timestamp: Date.now(),
        };
        localStorage.setItem('pending-order', JSON.stringify(orderDataForSuccess));
        
        // Mark order as initiated to start polling safely
        setOrderInitiated(true);
        
        if (result.data.paymentUrl) {
          window.open(result.data.paymentUrl, '_blank');
        }
      } else {
        setError(result.error || 'Terjadi kesalahan saat memproses pembayaran');
      }
    } catch (error) {
      console.error('Payment Error:', error);
      setError('Terjadi kesalahan saat memproses pembayaran');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isHydrated) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Memuat data pembayaran...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show PAID status
  if (orderStatus === 'PAID') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl shadow-lg border border-green-200 p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-12 h-12 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pembayaran Berhasil!</h2>
          <p className="text-gray-600 mb-6">
            Pesanan Anda dengan nomor invoice <strong className="text-gray-900">{invoiceId}</strong> telah berhasil dibayar.
          </p>
          {paidAt && (
            <p className="text-sm text-gray-500 mb-6">Dibayar pada: {paidAt}</p>
          )}
          
          <div className="bg-gray-50 rounded-xl p-5 mb-6 text-left space-y-2 text-sm">
            <p><span className="font-semibold text-gray-700">Domain:</span> {domainSearch}{selectedDomain?.extension}</p>
            <p><span className="font-semibold text-gray-700">Paket:</span> {selectedPackage?.name || '-'}</p>
            <p><span className="font-semibold text-gray-700">Total:</span> IDR {totalPrice.toLocaleString('id-ID')}</p>
            <p><span className="font-semibold text-gray-700">Pemesan:</span> {personalData.fullName} ({personalData.email})</p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => window.location.href = '/client/dashboard'}
              variant="primary"
              size="lg"
              fullWidth
            >
              Ke Dashboard
            </Button>
            <Button
              onClick={() => {
                useOrderStore.getState().reset();
                window.location.href = '/order';
              }}
              variant="secondary"
              size="lg"
              fullWidth
            >
              Pesan Lagi
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show CANCELLED status
  if (orderStatus === 'CANCELLED') {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="bg-white rounded-2xl shadow-lg border border-red-200 p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <RotateCcw className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pembayaran Dibatalkan</h2>
          <p className="text-gray-600 mb-6">
            Pesanan <strong>{invoiceId}</strong> telah dibatalkan atau expired. Silakan buat pesanan baru.
          </p>
          <Button
            onClick={() => {
              useOrderStore.getState().reset();
              window.location.href = '/order';
            }}
            variant="primary"
            size="lg"
            fullWidth
          >
            Buat Pesanan Baru
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6 border-l-4 border-cyan-500">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm text-gray-600 mb-1">Batas Pembayaran</p>
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900">
                  {formatExpiryTime(expiryTime?.toISOString())}
                </h2>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-2 text-sm font-semibold">
                  <Clock className={`w-5 h-5 ${countdown === 'EXPIRED' ? 'text-red-500' : 'text-cyan-500'}`} />
                  <span className={countdown === 'EXPIRED' ? 'text-red-600' : 'text-cyan-600'}>
                    {countdown}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-center py-4 sm:py-8">
              <p className="text-3xl sm:text-5xl font-bold text-gray-900 mb-2">
                IDR {totalPrice.toLocaleString('id-ID')}
              </p>
              {totalPrice === 0 && (
                <p className="text-sm text-red-600 mt-2">
                  Total pembayaran tidak valid
                </p>
              )}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-4">METODE PEMBAYARAN</h3>
            <div className="space-y-3">
              {paymentMethods.map((method) => (
                <div
                  key={method.id}
                  onClick={() => setSelectedPayment(method.id)}
                  className={`border-2 rounded-xl p-3 sm:p-4 cursor-pointer transition-all duration-200 flex items-center justify-between ${
                    selectedPayment === method.id
                      ? 'border-cyan-500 bg-cyan-50 shadow-sm'
                      : 'border-gray-200 hover:border-cyan-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg border flex items-center justify-center overflow-hidden transition-colors ${
                      selectedPayment === method.id
                        ? 'bg-white border-cyan-200'
                        : 'bg-gray-50 border-gray-200'
                    }`}>
                      <Image
                        src={method.icon}
                        alt={method.name}
                        width={34}
                        height={34}
                        className="w-8 h-8 sm:w-[34px] sm:h-[34px] object-contain"
                      />
                    </div>
                    <span className="font-medium text-gray-900 text-sm sm:text-base">{method.name}</span>
                  </div>
                  {selectedPayment === method.id ? (
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-cyan-600" />
                  ) : (
                    <svg
                      className="w-5 h-5 flex-shrink-0 text-gray-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {totalPrice === 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
              <h4 className="font-semibold text-red-800 mb-2">Data Pemesanan Tidak Lengkap</h4>
              <p className="text-sm text-red-600 mb-3">
                Terjadi kesalahan dalam memuat data pemesanan. Silakan mulai ulang pemesanan atau kembali ke invoices.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => window.location.href = '/order'}
                  variant="danger"
                  size="md"
                  icon={<RotateCcw className="w-4 h-4" />}
                  fullWidth
                >
                  Mulai Ulang
                </Button>
                <Button
                  onClick={() => window.location.href = '/client/dashboard/invoices'}
                  variant="secondary"
                  size="md"
                  fullWidth
                >
                  Ke Invoices
                </Button>
              </div>
            </div>
          )}

          {paymentData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
              <h4 className="font-semibold text-green-800 mb-2">Pembayaran Diproses!</h4>
              <p className="text-sm text-green-600 mb-2">
                Silakan selesaikan pembayaran di tab baru yang terbuka.
              </p>
              {paymentData.vaNumber && (
                <p className="text-sm text-green-600">
                  Nomor VA: {paymentData.vaNumber}
                </p>
              )}
              {paymentData.expiryTime && (
                <p className="text-sm text-green-600">
                  Berlaku hingga: {new Date(paymentData.expiryTime).toLocaleString('id-ID')}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="lg:col-span-1 lg:order-last">
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 lg:sticky lg:top-8">
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-3 sm:mb-4">Ringkasan Pesanan</h3>
            <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">Invoice # {invoiceId}</p>

            <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
              <div>
                <p className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">📋 Deskripsi</p>
                <p className="text-xs sm:text-sm text-gray-600">
                  {selectedPackage?.name || 'Paket Website'}
                </p>
              </div>

              <div>
                <p className="text-xs sm:text-sm font-semibold text-gray-900 mb-2">
                  🌐 Domain
                </p>
                <p className="text-xs sm:text-sm text-gray-600 break-all">
                  {domainSearch}{selectedDomain?.extension}
                </p>
                {isFreeDomain ? (
                  <p className="text-xs sm:text-sm text-green-600 mt-1">Gratis (Paket)</p>
                ) : (
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    IDR {(selectedDomain?.price || 0).toLocaleString('id-ID')}
                  </p>
                )}
              </div>

              {selectedTemplate && (
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 mb-1">🎨 Template</p>
                  <p className="text-xs sm:text-sm text-gray-600">{selectedTemplate.name}</p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {templatePrice === 0 ? 'Gratis' : `IDR ${templatePrice.toLocaleString('id-ID')}`}
                  </p>
                </div>
              )}

              <div className="pt-3 sm:pt-4 border-t">
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">IDR {subtotal.toLocaleString('id-ID')}</span>
                </div>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-xs sm:text-sm text-green-600">
                  <span>Diskon</span>
                  <span className="font-medium">- IDR {discount.toLocaleString('id-ID')}</span>
                </div>
              )}

              <div className="pt-3 sm:pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm sm:text-base font-bold text-gray-900">Total</span>
                  <span className="text-lg sm:text-2xl font-bold text-cyan-600">
                    IDR {totalPrice.toLocaleString('id-ID')}
                  </span>
                </div>
                {totalPrice === 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    Total pembayaran tidak valid
                  </p>
                )}
              </div>
            </div>

            <Button
              onClick={handlePayment}
              disabled={!selectedPayment || isProcessing}
              variant="primary"
              size="lg"
              fullWidth
              isLoading={isProcessing}
              icon={<CreditCard className="w-5 h-5" />}
            >
              {isProcessing ? 'Memproses...' : 'Bayar Sekarang'}
            </Button>

            <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t">
              <p className="text-xs sm:text-sm font-semibold text-gray-900 mb-3">Informasi Pemesan</p>
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2.5">
                <div className="flex items-start gap-2">
                  <User className="w-4 h-4 text-gray-500 mt-0.5" />
                  <p className="text-xs sm:text-sm text-gray-900 leading-5">{personalData.fullName || '-'}</p>
                </div>
                <div className="flex items-start gap-2">
                  <Mail className="w-4 h-4 text-gray-500 mt-0.5" />
                  <p className="text-xs sm:text-sm text-gray-700 break-all leading-5">{personalData.email || '-'}</p>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="w-4 h-4 text-gray-500 mt-0.5" />
                  <p className="text-xs sm:text-sm text-gray-700 leading-5">{personalData.phone || '-'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

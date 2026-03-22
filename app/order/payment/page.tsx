'use client';

import { useOrderStore } from '@/store/useOrderStore';
import { useEffect, useState } from 'react';
import Button from '@/components/Button';
import { RotateCcw, CreditCard } from 'lucide-react';

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
  { id: 'va-bni', name: 'BNI Virtual Account', icon: '🏦', duitkuCode: 'I1' },
  { id: 'va-bri', name: 'BRI Virtual Account', icon: '🏦', duitkuCode: 'BR' },
  { id: 'va-mandiri', name: 'Mandiri Virtual Account', icon: '🏦', duitkuCode: 'M2' },
  { id: 'qris-nobu', name: 'QRIS (ALL BANK)', icon: '📲', duitkuCode: 'SP' },
];

export default function PaymentPage() {
  const [invoiceId, setInvoiceId] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [error, setError] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);

  const domainSearch = useOrderStore((state) => state.domainSearch);
  const selectedDomain = useOrderStore((state) => state.selectedDomain);
  const selectedTemplate = useOrderStore((state) => state.selectedTemplate);
  const selectedPackage = useOrderStore((state) => state.selectedPackage);
  const selectedAddOns = useOrderStore((state) => state.selectedAddOns);
  const promoCode = useOrderStore((state) => state.promoCode);
  const getTotalPrice = useOrderStore((state) => state.getTotalPrice);
  const personalData = useOrderStore((state) => state.personalData);

  useEffect(() => {
    setIsHydrated(true);
    // Format: INV-DDMMYY-HHMMSS (contoh: INV-230126-004623)
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const id = `INV-${day}${month}${year}-${hours}${minutes}${seconds}`;
    setInvoiceId(id);
  }, []);

  const templatePrice = selectedTemplate?.price || 0;
  const subtotal = (selectedDomain?.price || 0) + templatePrice + (selectedPackage?.price || 0) + 
    selectedAddOns.reduce((sum, addon) => sum + addon.price, 0);

  const discount = promoCode 
    ? promoCode.type === 'percentage' 
      ? subtotal * promoCode.discount / 100
      : promoCode.discount
    : 0;

  const totalPrice = getTotalPrice();

  useEffect(() => {
    if (isHydrated) {
      console.log('Payment Page Debug:', {
        selectedDomain,
        selectedPackage,
        selectedAddOns,
        promoCode,
        subtotal,
        discount,
        totalPrice
      });
    }
  }, [isHydrated, selectedDomain, selectedPackage, selectedAddOns, promoCode, subtotal, discount, totalPrice]);

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

    // Simpan data order ke localStorage sebelum redirect ke Duitku
    const orderData = {
      invoiceId,
      domainSearch,
      selectedDomain,
      selectedPackage,
      personalData,
      totalPrice,
      timestamp: Date.now()
    };
    localStorage.setItem('pending-order', JSON.stringify(orderData));

    try {
      const paymentMethod = paymentMethods.find(pm => pm.id === selectedPayment);
      
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 mb-6">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center sm:text-left">
              Batas Pembayaran: {formatExpiryTime(paymentData?.expiryTime)}
            </h2>
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
                  className={`border-2 rounded-lg p-3 sm:p-4 cursor-pointer transition-all flex items-center justify-between ${
                    selectedPayment === method.id
                      ? 'border-cyan-500 bg-cyan-50'
                      : 'border-gray-200 hover:border-cyan-300'
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xl sm:text-2xl">{method.icon}</span>
                    <span className="font-medium text-gray-900 text-sm sm:text-base">{method.name}</span>
                  </div>
                  <svg
                    className={`w-5 h-5 flex-shrink-0 ${
                      selectedPayment === method.id ? 'text-cyan-500' : 'text-gray-400'
                    }`}
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

        <div className="lg:col-span-1 order-first lg:order-last">
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
                <p className="text-xs sm:text-sm text-gray-600 mt-1">
                  IDR {(selectedDomain?.price || 0).toLocaleString('id-ID')}
                </p>
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
              <p className="text-xs text-gray-500 mb-2">Informasi Pemesan:</p>
              <p className="text-xs sm:text-sm text-gray-900">{personalData.fullName}</p>
              <p className="text-xs sm:text-sm text-gray-600 break-all">{personalData.email}</p>
              <p className="text-xs sm:text-sm text-gray-600">{personalData.phone}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Button from '@/components/Button';
import { useServiceOrderStore } from '@/store/useServiceOrderStore';

type ServiceOrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
type ViewState = 'checking' | 'paid' | 'unpaid' | 'pending';

export default function ServicesPaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setCurrentStep = useServiceOrderStore((state) => state.setCurrentStep);
  const [orderStatus, setOrderStatus] = useState<ServiceOrderStatus | null>(null);
  const [viewState, setViewState] = useState<ViewState>('checking');
  const [invoiceId, setInvoiceId] = useState('');
  const [gatewayResultCode, setGatewayResultCode] = useState('');

  useEffect(() => {
    setCurrentStep(5);

    const resultCode = String(searchParams.get('resultCode') || '').trim();
    setGatewayResultCode(resultCode);
    const invoiceFromQuery = String(searchParams.get('merchantOrderId') || '').trim();

    let resolvedInvoiceId = invoiceFromQuery;

    if (!resolvedInvoiceId) {
      const rawOrder = localStorage.getItem('service-last-order');
      if (rawOrder) {
        try {
          const parsed = JSON.parse(rawOrder);
          if (parsed?.invoiceId) {
            resolvedInvoiceId = String(parsed.invoiceId);
          }
        } catch (error) {
          console.error('Failed to parse service-last-order:', error);
        }
      }
    }

    if (!resolvedInvoiceId) {
      setViewState('pending');
      return;
    }

    setInvoiceId(resolvedInvoiceId);

    let pollingStopped = false;

    const confirmOrder = async (id: string, ref: string) => {
      try {
        console.log('[ServicesSuccess] Confirming order status via API:', id);
        const res = await fetch('/api/order/confirm-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            invoiceId: id,
            reference: ref,
          }),
        });
        const data = await res.json();
        if (data.success && data.status === 'PAID') {
          setOrderStatus('PAID');
          setViewState('paid');
          pollingStopped = true;
          setTimeout(() => {
            router.replace('/client/dashboard/services');
          }, 1500);
          return true;
        }
      } catch (e) {
        console.error('[ServicesSuccess] Confirm payment error:', e);
      }
      return false;
    };

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/services/orders?invoiceId=${encodeURIComponent(resolvedInvoiceId)}`);
        const data = await res.json();

        if (!res.ok || !data?.data?.status) {
          if (resultCode && resultCode !== '00') {
            setViewState('unpaid');
          }
          return;
        }

        const status = data.data.status as ServiceOrderStatus;
        setOrderStatus(status);

        if (status === 'PAID' || status === 'PROCESSING' || status === 'COMPLETED') {
          setViewState('paid');
          pollingStopped = true;
          setTimeout(() => {
            router.replace('/client/dashboard/services');
          }, 1200);
          return;
        }

        if (status === 'CANCELLED') {
          setViewState('unpaid');
          pollingStopped = true;
          return;
        }

        // If resultCode from gateway is success '00', but status in DB is PENDING,
        // try to forcefully update the order status via confirm-payment endpoint.
        if (status === 'PENDING' && resultCode === '00') {
          console.log('[ServicesSuccess] Status is PENDING but gateway succeeded. Triggering confirmation...');
          const reference = searchParams.get('reference') || '';
          await confirmOrder(resolvedInvoiceId, reference);
        } else {
          setViewState('pending');
        }
      } catch (error) {
        console.error('Failed to read service payment status:', error);
      }
    };

    fetchStatus();

    const interval = setInterval(async () => {
      if (pollingStopped) return;
      await fetchStatus();
    }, 2500);

    const maxWaitTimer = setTimeout(() => {
      pollingStopped = true;
      setViewState((prev) => {
        if (prev !== 'checking') return prev;
        if (resultCode && resultCode !== '00') return 'unpaid';
        return 'pending';
      });
    }, 30000);

    return () => {
      pollingStopped = true;
      clearInterval(interval);
      clearTimeout(maxWaitTimer);
    };
  }, [router, searchParams, setCurrentStep]);

  const isPaid = viewState === 'paid';
  const isUnpaid = viewState === 'unpaid';
  const isPending = viewState === 'pending' || viewState === 'checking';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div
        className={`bg-white rounded-xl p-8 text-center border ${
          isPaid
            ? 'border-green-200'
            : isUnpaid
              ? 'border-red-200'
              : 'border-yellow-200'
        }`}
      >
        <h1 className="text-2xl font-bold text-green-700">
          {isPaid
            ? 'Pembayaran Berhasil'
            : isUnpaid
              ? 'Pembayaran Belum Diterima'
              : 'Menunggu Konfirmasi Pembayaran'}
        </h1>
        <p className={`text-sm mt-3 ${isUnpaid ? 'text-red-700' : 'text-gray-600'}`}>
          {isPaid
            ? 'Pembayaran layanan Anda sudah diterima. Anda akan diarahkan langsung ke dashboard layanan untuk memantau proses pengerjaan.'
            : isUnpaid
              ? 'Pembayaran Anda belum diterima. Silakan ulangi pembayaran dari halaman pembayaran.'
              : 'Status pembayaran sedang diverifikasi dari gateway. Jika Anda sudah bayar, status akan otomatis berubah menjadi paid.'}
        </p>

        {invoiceId ? (
          <p className="text-xs text-gray-500 mt-2">Invoice: {invoiceId}</p>
        ) : null}

        {orderStatus ? (
          <p className="text-xs text-gray-500 mt-1">Status saat ini: {orderStatus}</p>
        ) : null}

        {gatewayResultCode ? (
          <p className="text-xs text-gray-400 mt-1">Gateway resultCode: {gatewayResultCode}</p>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {isUnpaid ? (
            <Button
              onClick={() => router.replace('/services/payment')}
              variant="primary"
              size="md"
            >
              Coba Bayar Lagi
            </Button>
          ) : null}

          {isPending ? (
            <Button
              onClick={() => window.location.reload()}
              variant="secondary"
              size="md"
            >
              Cek Ulang Status
            </Button>
          ) : null}

          <Button
            onClick={() => router.replace('/client/dashboard/services')}
            variant={isUnpaid ? 'secondary' : 'primary'}
            size="md"
          >
            Lihat Status Pesanan Layanan
          </Button>
        </div>
      </div>
    </div>
  );
}

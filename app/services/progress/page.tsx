'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/Button';
import ServicesStepper from '@/components/ServicesStepper';
import { useServiceOrderStore } from '@/store/useServiceOrderStore';

type LastOrder = {
  invoiceId: string;
  serviceName: string;
  packageName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  company: string;
  notes: string;
  amount: number;
  createdAt: string;
};

type ServiceOrderApi = {
  id: string;
  invoiceId: string;
  packageName: string;
  etaLabel?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  company?: string | null;
  notes?: string | null;
  total: number;
  status: 'PENDING' | 'PAID' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  progressNotes?: string | null;
  service: {
    name: string;
  };
};

const processSteps = [
  {
    id: 'payment',
    title: 'Pembayaran Terkonfirmasi',
    desc: 'Sistem telah menerima pembayaran Anda dan order masuk ke antrean tim.',
  },
  {
    id: 'briefing',
    title: 'Review Brief',
    desc: 'Tim melakukan review kebutuhan dan menyiapkan ruang kerja layanan.',
  },
  {
    id: 'execution',
    title: 'Pengerjaan',
    desc: 'Tim menjalankan proses layanan sesuai paket yang dipilih.',
  },
  {
    id: 'delivery',
    title: 'Hasil & Revisi',
    desc: 'Hasil dikirim untuk ditinjau, termasuk revisi sesuai paket.',
  },
  {
    id: 'done',
    title: 'Selesai',
    desc: 'Layanan dinyatakan selesai dan siap digunakan.',
  },
];

export default function ServicesProgressPage() {
  const router = useRouter();
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);
  const [serviceOrder, setServiceOrder] = useState<ServiceOrderApi | null>(null);
  const setCurrentStep = useServiceOrderStore((state) => state.setCurrentStep);
  const reset = useServiceOrderStore((state) => state.reset);

  useEffect(() => {
    setCurrentStep(5);

    const raw = localStorage.getItem('service-last-order');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setLastOrder(parsed);

        if (parsed?.invoiceId) {
          const fetchOrder = async () => {
            try {
              const res = await fetch(`/api/services/orders?invoiceId=${encodeURIComponent(parsed.invoiceId)}`);
              const data = await res.json();

              if (res.ok && data?.data) {
                setServiceOrder(data.data);
              }
            } catch (error) {
              console.error('Failed to fetch service order progress:', error);
            }
          };

          fetchOrder();
          const interval = setInterval(fetchOrder, 8000);
          return () => clearInterval(interval);
        }
      } catch {
        setLastOrder(null);
      }
    }
  }, [setCurrentStep]);

  const handleNewOrder = () => {
    localStorage.removeItem('service-last-order');
    reset();
    router.push('/services');
  };

  const effectiveStatus = serviceOrder?.status || 'PENDING';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <ServicesStepper currentStep={5} />

        <div className="flex-1 space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h1 className="text-2xl font-bold text-gray-900">5. Proses Pengerjaan</h1>
            <p className="text-sm text-gray-600 mt-1">
              Pantau status pengerjaan layanan Anda sampai selesai.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h2 className="text-lg font-bold text-gray-900">Timeline Layanan</h2>
              <span
                className={`text-xs px-3 py-1 rounded-full font-semibold ${
                  effectiveStatus === 'PAID' || effectiveStatus === 'PROCESSING' || effectiveStatus === 'COMPLETED'
                    ? 'bg-green-50 text-green-700 border border-green-200'
                    : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}
              >
                {effectiveStatus === 'COMPLETED'
                  ? 'Layanan Selesai'
                  : effectiveStatus === 'PROCESSING'
                    ? 'Sedang Diproses Tim'
                    : effectiveStatus === 'PAID'
                      ? 'Pembayaran Terkonfirmasi'
                      : effectiveStatus === 'CANCELLED'
                        ? 'Pesanan Dibatalkan'
                        : 'Menunggu Konfirmasi Pembayaran'}
              </span>
            </div>

            {serviceOrder?.progressNotes ? (
              <p className="text-sm text-cyan-700 bg-cyan-50 border border-cyan-200 rounded-lg px-3 py-2 mb-4">
                Catatan Tim: {serviceOrder.progressNotes}
              </p>
            ) : null}

            <div className="space-y-4">
              {processSteps.map((step, index) => {
                const isActive =
                  effectiveStatus === 'COMPLETED'
                    ? true
                    : effectiveStatus === 'PROCESSING'
                      ? index <= 2
                      : effectiveStatus === 'PAID'
                        ? index <= 1
                        : index === 0;

                return (
                  <div key={step.id} className="flex gap-3">
                    <div
                      className={`w-7 h-7 rounded-full mt-0.5 flex-shrink-0 ${
                        isActive ? 'bg-cyan-500' : 'bg-gray-200'
                      }`}
                    />
                    <div>
                      <p className={`font-semibold ${isActive ? 'text-gray-900' : 'text-gray-500'}`}>{step.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-base font-bold text-gray-900">Ringkasan Pesanan Layanan</h3>
            {lastOrder ? (
              <div className="mt-4 space-y-2 text-sm text-gray-700">
                <p><span className="font-semibold">Invoice:</span> {lastOrder.invoiceId}</p>
                <p><span className="font-semibold">Layanan:</span> {serviceOrder?.service?.name || lastOrder.serviceName}</p>
                <p><span className="font-semibold">Paket:</span> {serviceOrder?.packageName || lastOrder.packageName}</p>
                <p><span className="font-semibold">Total:</span> IDR {(serviceOrder?.total || lastOrder.amount).toLocaleString('id-ID')}</p>
                <p><span className="font-semibold">Pemesan:</span> {serviceOrder?.customerName || lastOrder.customerName} ({serviceOrder?.customerEmail || lastOrder.customerEmail})</p>
                <p><span className="font-semibold">No. HP:</span> {serviceOrder?.customerPhone || lastOrder.customerPhone}</p>
                <p><span className="font-semibold">Perusahaan:</span> {serviceOrder?.company || lastOrder.company || '-'}</p>
                <p><span className="font-semibold">Brief:</span> {serviceOrder?.notes || lastOrder.notes || '-'}</p>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-3">Belum ada data pesanan layanan.</p>
            )}

            <div className="mt-6">
              <Button onClick={handleNewOrder} variant="primary" size="md">
                Buat Pesanan Layanan Baru
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Wrench, Search, X, AlertCircle } from 'lucide-react';
import { Badge } from '@/metronic-components/ui/badge';
import { Alert, AlertDescription } from '@/metronic-components/ui/alert';

interface ServiceItem {
  id: string;
  source: 'WEBSITE_ORDER' | 'SERVICE_ORDER';
  status?: 'PENDING' | 'PAID' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  progressNotes?: string | null;
  packageName?: string | null;
  etaLabel?: string | null;
  price: number;
  service: {
    id: string;
    name: string;
    description: string | null;
    priceType: 'ONE_TIME' | 'PER_YEAR' | 'MONTHLY';
  };
  order: {
    id: string;
    invoiceId: string;
    domainName: string;
    createdAt: string;
  };
}

const priceTypeLabels: Record<string, string> = {
  ONE_TIME: 'Sekali Bayar',
  PER_YEAR: 'Per Tahun',
  MONTHLY: 'Per Bulan',
};

const priceTypeColors: Record<string, string> = {
  ONE_TIME: 'bg-purple-50 text-purple-700',
  PER_YEAR: 'bg-blue-50 text-blue-700',
  MONTHLY: 'bg-emerald-50 text-emerald-700',
};

const statusLabels: Record<string, string> = {
  PENDING: 'Menunggu Pembayaran',
  PAID: 'Dibayar',
  PROCESSING: 'Sedang Diproses',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700',
  PAID: 'bg-blue-50 text-blue-700',
  PROCESSING: 'bg-indigo-50 text-indigo-700',
  COMPLETED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-700',
};

export default function ClientServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/client/services');

      if (res.status === 401) {
        router.push('/client/login');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setServices(data);
      } else {
        setError('Gagal mengambil data layanan');
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
      setError('Terjadi kesalahan saat mengambil data');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const filteredServices = useMemo(() => {
    if (!searchQuery) return services;
    const query = searchQuery.toLowerCase();
    return services.filter(
      (item) =>
        item.service.name.toLowerCase().includes(query) ||
        item.order.invoiceId.toLowerCase().includes(query) ||
        item.order.domainName.toLowerCase().includes(query) ||
        (item.service.description?.toLowerCase() || '').includes(query)
    );
  }, [services, searchQuery]);

  // Group services by order
  const groupedServices = useMemo(() => {
    const grouped: Record<string, ServiceItem[]> = {};
    filteredServices.forEach((item) => {
      if (!grouped[item.order.invoiceId]) {
        grouped[item.order.invoiceId] = [];
      }
      grouped[item.order.invoiceId].push(item);
    });
    return grouped;
  }, [filteredServices]);

  return (
    <>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Wrench className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Layanan Saya</h1>
            <p className="text-gray-600 mt-1">Kelola semua layanan tambahan Anda</p>
          </div>
        </div>
      </div>

      {error && (
        <Alert className="mb-6 bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">{error}</AlertDescription>
        </Alert>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm mb-6">
        <div className="flex items-center gap-2">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Cari layanan, invoice, atau domain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 border-none focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl h-40 animate-pulse"></div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredServices.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 text-lg font-medium">
            {services.length === 0 ? 'Anda belum memiliki layanan' : 'Tidak ada layanan yang ditemukan'}
          </p>
          <p className="text-gray-500 text-sm mt-1">
            {services.length === 0 ? 'Buat pesanan baru dan tambahkan layanan untuk melihatnya di sini' : 'Coba ubah pencarian Anda'}
          </p>
        </div>
      )}

      {/* Services List */}
      {!loading && filteredServices.length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedServices).map(([invoiceId, groupItems]) => (
            <div key={invoiceId} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              {/* Order Header */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Pesanan</p>
                    <p className="text-lg font-bold text-gray-900 mt-1">
                      {groupItems[0].order.domainName}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">{groupItems[0].order.invoiceId}</p>
                    {groupItems[0].source === 'SERVICE_ORDER' && groupItems[0].status ? (
                      <Badge className={statusColors[groupItems[0].status]}>
                        {statusLabels[groupItems[0].status]}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Tanggal</p>
                    <p className="text-gray-900 font-semibold mt-1">
                      {new Date(groupItems[0].order.createdAt).toLocaleDateString('id-ID', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Services List */}
              <div className="divide-y divide-gray-200">
                {groupItems.map((item) => (
                  <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-900">{item.service.name}</h3>
                          <Badge className={priceTypeColors[item.service.priceType]}>
                            {priceTypeLabels[item.service.priceType]}
                          </Badge>
                          {item.source === 'SERVICE_ORDER' && item.status ? (
                            <Badge className={statusColors[item.status]}>
                              {statusLabels[item.status]}
                            </Badge>
                          ) : null}
                        </div>
                        {item.service.description && (
                          <p className="text-gray-600 text-sm mt-2">{item.service.description}</p>
                        )}
                        {item.packageName ? (
                          <p className="text-xs text-gray-600 mt-2">Paket: {item.packageName}</p>
                        ) : null}
                        {item.etaLabel ? (
                          <p className="text-xs text-gray-600 mt-1">Estimasi: {item.etaLabel}</p>
                        ) : null}
                        {item.progressNotes ? (
                          <p className="text-xs text-cyan-700 mt-2 bg-cyan-50 border border-cyan-200 rounded px-2 py-1 inline-block">
                            Catatan Tim: {item.progressNotes}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <p className="text-xs text-gray-500 font-medium uppercase mb-1">Harga</p>
                        <p className="text-2xl font-bold text-blue-600">
                          IDR {item.price.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Summary */}
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Total {groupItems.length} layanan
                  </p>
                  <p className="font-bold text-gray-900">
                    Total: IDR {groupItems.reduce((sum, item) => sum + item.price, 0).toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

'use client';

import { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PaymentInfoCard from '@/components/PaymentInfoCard';
import SubscriptionSummary from '@/components/SubscriptionSummary';
import { DashboardHeader } from '@/metronic-components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/metronic-components/ui/card';
import { Badge } from '@/metronic-components/ui/badge';
import { Button } from '@/metronic-components/ui/button';
import { Alert, AlertDescription } from '@/metronic-components/ui/alert';
import { ShoppingCart, CheckCircle2, Clock, AlertCircle, Globe, Package, Calendar, DollarSign, Search, X } from 'lucide-react';

interface Order {
  id: string;
  invoiceId: string;
  domainName: string;
  customerName: string;
  customerEmail: string;
  total: number;
  status: string;
  createdAt: string;
  domain?: { extension: string } | null;
  template?: { name: string } | null;
  package?: { name: string; duration?: number | null } | null;
  websiteUsername?: string;
  websitePassword?: string;
  loginUrl?: string;
  websiteEmail?: string;
  notes?: string;
  progressNotes?: string | null;
  etaLabel?: string | null;
  serviceFlow?: boolean;
  service?: {
    id: string;
    name: string;
    description?: string | null;
    priceType?: 'ONE_TIME' | 'PER_YEAR' | 'MONTHLY';
  } | null;
}

const statusColors: Record<string, string> = {
  PENDING: 'warning',
  PAID: 'success',
  PROCESSING: 'info',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
} as const;

const statusLabels: Record<string, string> = {
  PENDING: 'Menunggu Pembayaran',
  PAID: 'Sudah Dibayar',
  PROCESSING: 'Sedang Diproses',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

const statusDescriptions: Record<string, string> = {
  PENDING: 'Silakan selesaikan pembayaran Anda',
  PAID: 'Pembayaran diterima, website akan segera diproses',
  PROCESSING: 'Tim kami sedang mengerjakan website Anda',
  COMPLETED: 'Website Anda sudah selesai dan siap digunakan',
  CANCELLED: 'Pesanan dibatalkan',
};

const servicePriceTypeLabels: Record<string, string> = {
  ONE_TIME: 'Sekali Bayar',
  PER_YEAR: 'Per Tahun',
  MONTHLY: 'Per Bulan',
};

export default function ClientDashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch('/api/public/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.socialWhatsapp) {
          setWhatsappNumber(data.socialWhatsapp);
        } else if (data.contactPhone) {
          const phone = data.contactPhone.replace(/[^0-9]/g, '');
          setWhatsappNumber(`https://wa.me/${phone.startsWith('0') ? '62' + phone.slice(1) : phone}`);
        }
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/client/orders');
      
      if (res.status === 401) {
        router.push('/client/login');
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setOrders(data);
        if (data.length > 0) {
          setCustomerName(data[0].customerName);
        }
      }
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Fetch orders and settings in parallel
    Promise.all([fetchOrders(), fetchSettings()]);
  }, [fetchOrders, fetchSettings]);

  // Memoize filtered orders to prevent recalculation
  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;
    const query = searchQuery.toLowerCase();
    return orders.filter(order =>
      order.domainName.toLowerCase().includes(query) ||
      order.invoiceId.toLowerCase().includes(query) ||
      (order.package?.name || '').toLowerCase().includes(query)
    );
  }, [orders, searchQuery]);

  const filteredWebsiteOrders = useMemo(
    () => filteredOrders.filter((order) => !order.serviceFlow),
    [filteredOrders]
  );

  const paymentInfoOrders = useMemo(
    () =>
      filteredWebsiteOrders.map((order) => ({
        ...order,
        domain: {
          extension: order.domain?.extension || '',
        },
        package: order.package
          ? {
              name: order.package.name,
              duration: Number(order.package.duration || 1),
            }
          : null,
      })),
    [filteredWebsiteOrders]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-8 shadow-lg animate-pulse">
          <div className="max-w-7xl mx-auto">
            <div className="h-10 bg-blue-400 rounded w-1/3"></div>
            <div className="h-4 bg-blue-400 rounded w-1/2 mt-4"></div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-xl h-32 animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-8 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
                <ShoppingCart className="w-8 h-8" />
                Pesanan Saya
              </h1>
              <p className="text-blue-100 mt-2">Pantau dan kelola semua pesanan website Anda dengan mudah</p>
            </div>
            <div className="hidden md:block text-right">
              <p className="text-sm text-blue-100">Selamat datang,</p>
              <p className="text-xl font-semibold">{customerName || 'Pelanggan'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Subscription Summary Cards */}
        {filteredWebsiteOrders.length > 0 && (
          <SubscriptionSummary orders={filteredWebsiteOrders as any} />
        )}

        {/* Payment Info Cards for Latest Orders */}
        {filteredWebsiteOrders.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-blue-600" />
              Status Pembayaran & Pesanan
            </h2>
            {paymentInfoOrders.map((order) => (
              <PaymentInfoCard key={order.id} order={order} />
            ))}
          </div>
        )}

        {/* Search and Filter */}
        {orders.length > 0 && (
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari domain atau No. Invoice..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
            </div>
          </div>
        )}

        {/* Orders List */}
        {filteredOrders.length > 0 ? (
          <div className="space-y-4">
            {filteredOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    {/* Domain Info */}
                    <div className="flex-1">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg h-fit">
                          <Globe className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            {order.domainName}{order.domain?.extension || ''}
                            <Badge variant={statusColors[order.status] as any || 'default'} className="ml-2">
                              {statusLabels[order.status]}
                            </Badge>
                          </h3>
                          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            {order.package && (
                              <>
                                <div className="flex items-center gap-2 text-gray-600">
                                  <Package className="w-4 h-4 text-blue-600" />
                                  <span>{order.package.name}</span>
                                </div>
                                {order.package.duration ? (
                                  <div className="flex items-center gap-2 text-gray-600">
                                    <Calendar className="w-4 h-4 text-blue-600" />
                                    <span>{order.package.duration} Tahun</span>
                                  </div>
                                ) : null}
                              </>
                            )}
                            {!order.package && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Package className="w-4 h-4 text-gray-400" />
                                <span className="text-gray-500 italic">Hanya Layanan</span>
                              </div>
                            )}
                            {order.serviceFlow && order.etaLabel ? (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Clock className="w-4 h-4 text-blue-600" />
                                <span>Estimasi: {order.etaLabel}</span>
                              </div>
                            ) : null}
                            {order.serviceFlow && order.service?.priceType ? (
                              <div className="flex items-center gap-2 text-gray-600">
                                <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                                  {servicePriceTypeLabels[order.service.priceType] || order.service.priceType}
                                </span>
                              </div>
                            ) : null}
                            <div className="flex items-center gap-2 text-gray-600">
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">#{order.invoiceId}</span>
                            </div>
                          </div>
                          {order.progressNotes ? (
                            <p className="mt-3 text-xs text-cyan-700 bg-cyan-50 border border-cyan-200 rounded px-2 py-1 inline-block">
                              Catatan Tim: {order.progressNotes}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Amount & Action */}
                    <div className="flex flex-col md:flex-row items-end md:items-center gap-4">
                      <div className="text-right md:text-center">
                        <p className="text-xs text-gray-600 mb-1">Total Pembayaran</p>
                        <p className="text-2xl md:text-3xl font-bold text-blue-600">
                          IDR {order.total.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(order.createdAt).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                      >
                        Lihat Detail
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-gray-600 font-medium">Progress Pesanan</span>
                      <span className="text-gray-900 font-semibold">
                        {order.status === 'COMPLETED' ? '100%' : order.status === 'PROCESSING' ? '75%' : order.status === 'PAID' ? '50%' : '25%'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all ${
                          order.status === 'COMPLETED' ? 'bg-green-500 w-full' :
                          order.status === 'PROCESSING' ? 'bg-blue-500 w-3/4' :
                          order.status === 'PAID' ? 'bg-cyan-500 w-1/2' :
                          'bg-orange-500 w-1/4'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : orders.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-md">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Tidak Ada Pesanan yang Cocok</h3>
            <p className="text-gray-600">Coba gunakan kata kunci lain untuk pencarian</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-md">
            <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Belum Ada Pesanan</h3>
            <p className="text-gray-600 mb-6">Anda belum membuat pesanan apapun. Mari buat website impian Anda sekarang!</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Pesan Website Sekarang
            </Link>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between border-b">
              <div>
                <h2 className="text-xl font-bold">Detail Pesanan</h2>
                <p className="text-blue-100 text-sm mt-1">Invoice: {selectedOrder.invoiceId}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-blue-600 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Status Alert */}
              <Alert variant={statusColors[selectedOrder.status] as any}>
                <AlertDescription className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  {statusDescriptions[selectedOrder.status]}
                </AlertDescription>
              </Alert>

              {/* Order Details Grid */}
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Domain</p>
                  <p className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <Globe className="w-5 h-5 text-blue-600" />
                    {selectedOrder.domainName}{selectedOrder.domain?.extension || ''}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Template</p>
                  <p className="text-lg font-bold text-gray-900">
                    {selectedOrder.template?.name || <span className="text-gray-500 italic text-sm">-</span>}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Paket</p>
                  <p className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    {selectedOrder.package ? (
                      <>
                        <Package className="w-5 h-5 text-blue-600" />
                        {selectedOrder.package.name}
                      </>
                    ) : (
                      <span className="text-gray-500 italic text-sm">Hanya Layanan</span>
                    )}
                  </p>
                </div>
                {selectedOrder.package?.duration && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Durasi</p>
                    <p className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      {selectedOrder.package.duration} Tahun
                    </p>
                  </div>
                )}
                {selectedOrder.serviceFlow && selectedOrder.etaLabel ? (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs text-gray-600 font-semibold uppercase mb-2">Estimasi</p>
                    <p className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-blue-600" />
                      {selectedOrder.etaLabel}
                    </p>
                  </div>
                ) : null}
              </div>

              {/* Notes Section - Show when available */}
              {selectedOrder.notes && (
                <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-purple-600" />
                    Catatan Pesanan
                  </h3>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap leading-relaxed">{selectedOrder.notes}</p>
                </div>
              )}

              {selectedOrder.progressNotes ? (
                <div className="bg-cyan-50 rounded-lg p-6 border border-cyan-200">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-cyan-600" />
                    Catatan Progress Tim
                  </h3>
                  <p className="text-sm text-cyan-800 whitespace-pre-wrap">{selectedOrder.progressNotes}</p>
                </div>
              ) : null}

              {/* Login Credentials Section - Show when available */}
              {(selectedOrder.loginUrl || selectedOrder.websiteUsername || selectedOrder.websitePassword || selectedOrder.websiteEmail) && (
                <div className="bg-green-50 rounded-lg p-6 border border-green-200">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase mb-4 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Akses Website Anda
                  </h3>
                  <div className="space-y-3">
                    {selectedOrder.loginUrl && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 font-medium min-w-fit">Login Link:</span>
                        <a 
                          href={selectedOrder.loginUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700 underline break-all flex-1"
                        >
                          {selectedOrder.loginUrl}
                        </a>
                      </div>
                    )}
                    {selectedOrder.websiteUsername && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 font-medium min-w-fit">Username:</span>
                        <code className="text-sm bg-white px-3 py-1 rounded border border-green-200 font-mono flex-1 break-all">
                          {selectedOrder.websiteUsername}
                        </code>
                      </div>
                    )}
                    {selectedOrder.websitePassword && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 font-medium min-w-fit">Password:</span>
                        <code className="text-sm bg-white px-3 py-1 rounded border border-green-200 font-mono flex-1 break-all">
                          {selectedOrder.websitePassword}
                        </code>
                      </div>
                    )}
                    {selectedOrder.websiteEmail && (
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-600 font-medium min-w-fit">Email:</span>
                        <a
                          href={`mailto:${selectedOrder.websiteEmail}`}
                          className="text-sm text-blue-600 hover:text-blue-700 underline break-all flex-1"
                        >
                          {selectedOrder.websiteEmail}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pricing Summary */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-6 border border-blue-200">
                <h3 className="text-sm font-semibold text-gray-600 uppercase mb-4">Ringkasan Pembayaran</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Total Pembayaran</span>
                    <span className="font-semibold text-gray-900">IDR {selectedOrder.total.toLocaleString()}</span>
                  </div>
                  <div className="border-t border-blue-200 pt-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-gray-900">Total Akhir</span>
                      <span className="text-2xl font-bold text-blue-600">IDR {selectedOrder.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition-colors"
                >
                  Tutup
                </button>
                {selectedOrder.status === 'PENDING' && (
                  <Link
                    href="/client/dashboard/invoices"
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors text-center"
                  >
                    Lanjutkan Pembayaran
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Floating Button */}
      {whatsappNumber && (
        <a
          href={whatsappNumber}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 w-14 h-14 bg-green-500 rounded-full flex items-center justify-center shadow-lg hover:bg-green-600 hover:scale-110 transition-all z-40"
          title="Hubungi Admin via WhatsApp"
        >
          <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </a>
      )}
    </div>
  );
}

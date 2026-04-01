'use client';

import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Plus, Save, X } from 'lucide-react';
import Button from '@/components/Button';

type ServiceOrderStatus = 'PENDING' | 'PAID' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
type OrderTab = 'detail' | 'service' | 'pricing' | 'extension';
type PricingMode = 'REGULAR' | 'EXPRESS' | 'CUSTOM';
type TabDirtyState = Record<OrderTab, boolean>;

type ServicePackage = {
  id: string;
  serviceId: string;
  code: string;
  name: string;
  description?: string | null;
  etaLabel?: string | null;
  price: number;
  durationMonths?: number | null;
  isVisible: boolean;
  visibleInOrder: boolean;
  visibleInServices: boolean;
  internalOnly: boolean;
  isActive: boolean;
  sortOrder: number;
};

type ServiceCatalogItem = {
  id: string;
  name: string;
  isActive: boolean;
  isVisible: boolean;
  packages?: ServicePackage[];
};

type ServiceOrder = {
  id: string;
  invoiceId: string;
  serviceId?: string;
  servicePackageId?: string | null;
  packageName: string;
  etaLabel?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  company?: string | null;
  notes?: string | null;
  progressNotes?: string | null;
  total: number;
  status: ServiceOrderStatus;
  createdAt: string;
  service: {
    id: string;
    name: string;
    priceType: string;
  };
  servicePackage?: {
    id: string;
    code: string;
    name: string;
    price: number;
    etaLabel?: string | null;
    durationMonths?: number | null;
    isVisible: boolean;
    visibleInOrder: boolean;
    visibleInServices: boolean;
    internalOnly: boolean;
    isActive: boolean;
  } | null;
};

type PricingDraft = {
  mode: PricingMode;
  price: number;
  packageName: string;
  etaLabel: string;
  isVisible: boolean;
  visibleInOrder: boolean;
  visibleInServices: boolean;
  internalOnly: boolean;
  isActive: boolean;
};

type CreateInvoiceForm = {
  serviceId: string;
  servicePackageId: string;
  durationMonths: 1 | 2 | 3;
  pricingType: 'AUTO' | 'MANUAL';
  manualPrice: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  company: string;
  notes: string;
};

const statusLabels: Record<ServiceOrderStatus, string> = {
  PENDING: 'Menunggu Pembayaran',
  PAID: 'Dibayar',
  PROCESSING: 'Sedang Diproses',
  COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan',
};

const statusColor: Record<ServiceOrderStatus, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  PAID: 'bg-blue-50 text-blue-700 border-blue-200',
  PROCESSING: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  COMPLETED: 'bg-green-50 text-green-700 border-green-200',
  CANCELLED: 'bg-red-50 text-red-700 border-red-200',
};

function getInitialCreateForm(serviceId = '', servicePackageId = ''): CreateInvoiceForm {
  return {
    serviceId,
    servicePackageId,
    durationMonths: 1,
    pricingType: 'AUTO',
    manualPrice: 0,
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    company: '',
    notes: '',
  };
}

function defaultDirtyState(): TabDirtyState {
  return {
    detail: false,
    service: false,
    pricing: false,
    extension: false,
  };
}

function packageRank(code: string): number {
  const upper = code.toUpperCase();
  if (upper === 'REGULAR') return 1;
  if (upper === 'PRIORITY') return 2;
  if (upper === 'EXPRESS') return 3;
  if (upper === 'EXT_1M') return 4;
  if (upper === 'EXT_2M') return 5;
  if (upper === 'EXT_3M') return 6;
  return 99;
}

export default function AdminServiceOrdersPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<ServiceOrder[]>([]);
  const [services, setServices] = useState<ServiceCatalogItem[]>([]);

  const [activeId, setActiveId] = useState('');
  const [statusFilter, setStatusFilter] = useState<ServiceOrderStatus | 'ALL'>('ALL');

  const [tabs, setTabs] = useState<Record<string, OrderTab>>({});
  const [dirtyTabs, setDirtyTabs] = useState<Record<string, TabDirtyState>>({});
  const [savedTabs, setSavedTabs] = useState<Record<string, OrderTab | null>>({});
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [serviceDraft, setServiceDraft] = useState<Record<string, string>>({});
  const [packageDraft, setPackageDraft] = useState<Record<string, string>>({});
  const [pricingDraft, setPricingDraft] = useState<Record<string, PricingDraft>>({});
  const [extensionDraft, setExtensionDraft] = useState<Record<string, 1 | 2 | 3>>({});

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState<CreateInvoiceForm>(getInitialCreateForm());

  const getPackagesByServiceId = (serviceId: string) => {
    const selected = services.find((s) => s.id === serviceId);
    return [...(selected?.packages || [])]
      .filter((pkg) => pkg.isActive)
      .sort((a, b) => {
        const rankDiff = packageRank(a.code) - packageRank(b.code);
        if (rankDiff !== 0) return rankDiff;
        const orderDiff = a.sortOrder - b.sortOrder;
        if (orderDiff !== 0) return orderDiff;
        return a.name.localeCompare(b.name);
      });
  };

  const setTabDirty = (orderId: string, tab: OrderTab, value: boolean) => {
    setDirtyTabs((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || defaultDirtyState()),
        [tab]: value,
      },
    }));
  };

  const setTabSaved = (orderId: string, tab: OrderTab) => {
    setSavedTabs((prev) => ({ ...prev, [orderId]: tab }));
    setTimeout(() => {
      setSavedTabs((prev) => (prev[orderId] === tab ? { ...prev, [orderId]: null } : prev));
    }, 2500);
  };

  const switchTab = (orderId: string, nextTab: OrderTab) => {
    const currentTab = tabs[orderId] || 'detail';
    if (currentTab === nextTab) return;

    const hasUnsaved = dirtyTabs[orderId]?.[currentTab] || false;
    if (hasUnsaved) {
      const ok = confirm('Perubahan pada tab saat ini belum disimpan. Tetap pindah tab?');
      if (!ok) return;
    }

    setTabs((prev) => ({ ...prev, [orderId]: nextTab }));
  };

  const findPackageByCode = (serviceId: string, code: string) => {
    return getPackagesByServiceId(serviceId).find((pkg) => pkg.code.toUpperCase() === code.toUpperCase()) || null;
  };

  const findExtensionPackage = (serviceId: string, months: 1 | 2 | 3) => {
    return findPackageByCode(serviceId, `EXT_${months}M`);
  };

  const fetchServices = async () => {
    try {
      const res = await fetch('/api/admin/services?includePackages=true');
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal memuat layanan');
      setServices(data || []);
    } catch (error) {
      console.error('Failed to fetch services:', error);
      setServices([]);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const query = statusFilter === 'ALL' ? '' : `?status=${statusFilter}`;
      const res = await fetch(`/api/admin/service-orders${query}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal memuat service orders');
      }

      const list: ServiceOrder[] = data.orders || [];
      setOrders(list);

      const nextTabs: Record<string, OrderTab> = {};
      const nextNotes: Record<string, string> = {};
      const nextService: Record<string, string> = {};
      const nextPackage: Record<string, string> = {};
      const nextPricing: Record<string, PricingDraft> = {};
      const nextExtension: Record<string, 1 | 2 | 3> = {};
      const nextDirty: Record<string, TabDirtyState> = {};

      list.forEach((item) => {
        const packageCode = item.servicePackage?.code?.toUpperCase() || '';
        const mode: PricingMode = packageCode === 'REGULAR' ? 'REGULAR' : packageCode === 'EXPRESS' ? 'EXPRESS' : 'CUSTOM';

        nextTabs[item.id] = tabs[item.id] || 'detail';
        nextNotes[item.id] = item.progressNotes || '';
        nextService[item.id] = item.service?.id || '';
        nextPackage[item.id] = item.servicePackage?.id || item.servicePackageId || '';
        nextPricing[item.id] = {
          mode,
          price: item.total || 0,
          packageName: item.packageName || item.servicePackage?.name || 'Paket Custom',
          etaLabel: item.etaLabel || item.servicePackage?.etaLabel || '',
          isVisible: item.servicePackage?.isVisible ?? true,
          visibleInOrder: item.servicePackage?.visibleInOrder ?? true,
          visibleInServices: item.servicePackage?.visibleInServices ?? true,
          internalOnly: item.servicePackage?.internalOnly ?? false,
          isActive: item.servicePackage?.isActive ?? true,
        };
        nextExtension[item.id] = 1;
        nextDirty[item.id] = defaultDirtyState();
      });

      setTabs(nextTabs);
      setNotesDraft(nextNotes);
      setServiceDraft(nextService);
      setPackageDraft(nextPackage);
      setPricingDraft(nextPricing);
      setExtensionDraft(nextExtension);
      setDirtyTabs(nextDirty);
    } catch (error) {
      console.error('Failed to fetch service orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const stats = useMemo(() => ({
    total: orders.length,
    pending: orders.filter((item) => item.status === 'PENDING').length,
    paid: orders.filter((item) => item.status === 'PAID').length,
    processing: orders.filter((item) => item.status === 'PROCESSING').length,
    completed: orders.filter((item) => item.status === 'COMPLETED').length,
  }), [orders]);

  const handleUpdateOrder = async (id: string, payload: Record<string, unknown>) => {
    try {
      setActiveId(id);
      const res = await fetch(`/api/admin/service-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal update service order');
      }

      await fetchOrders();
      await fetchServices();
      return true;
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Gagal update data');
      return false;
    } finally {
      setActiveId('');
    }
  };

  const handleSaveServicePackage = async (item: ServiceOrder) => {
    const selectedServiceId = serviceDraft[item.id];
    const selectedPackageId = packageDraft[item.id];

    if (!selectedServiceId || !selectedPackageId) {
      alert('Pilih layanan dan paket terlebih dahulu');
      return;
    }

    const ok = await handleUpdateOrder(item.id, {
      serviceId: selectedServiceId,
      servicePackageId: selectedPackageId,
    });

    if (ok) {
      setTabDirty(item.id, 'service', false);
      setTabSaved(item.id, 'service');
    }
  };

  const handleSavePricing = async (item: ServiceOrder) => {
    const draft = pricingDraft[item.id];
    if (!draft) return;

    const selectedServiceId = serviceDraft[item.id] || item.service.id;
    const selectedPackageId = packageDraft[item.id];

    if (draft.mode === 'CUSTOM') {
      const ok = await handleUpdateOrder(item.id, {
        serviceId: selectedServiceId,
        customPackageName: draft.packageName || 'Paket Custom',
        customEtaLabel: draft.etaLabel,
        customPrice: draft.price,
      });
      if (ok) {
        setTabDirty(item.id, 'pricing', false);
        setTabSaved(item.id, 'pricing');
      }
      return;
    }

    const targetByMode = findPackageByCode(selectedServiceId, draft.mode);
    const targetPackage = targetByMode || getPackagesByServiceId(selectedServiceId).find((pkg) => pkg.id === selectedPackageId) || null;

    if (!targetPackage) {
      alert('Paket layanan tidak ditemukan untuk mode ini');
      return;
    }

    try {
      setActiveId(item.id);

      const updatePackagePayload = {
        serviceId: targetPackage.serviceId,
        code: targetPackage.code,
        name: targetPackage.name,
        description: targetPackage.description || '',
        etaLabel: draft.etaLabel,
        price: Math.max(0, Math.round(draft.price || 0)),
        durationMonths: targetPackage.durationMonths ?? null,
        isVisible: draft.isVisible,
        visibleInOrder: draft.internalOnly ? false : draft.visibleInOrder,
        visibleInServices: draft.internalOnly ? false : draft.visibleInServices,
        internalOnly: draft.internalOnly,
        isActive: draft.isActive,
        sortOrder: targetPackage.sortOrder,
      };

      const resUpdatePackage = await fetch(`/api/admin/services/packages/${targetPackage.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePackagePayload),
      });

      const updatedPackageData = await resUpdatePackage.json();
      if (!resUpdatePackage.ok) {
        throw new Error(updatedPackageData.message || 'Gagal update paket');
      }

      const resUpdateOrder = await fetch(`/api/admin/service-orders/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          servicePackageId: targetPackage.id,
        }),
      });

      const updatedOrderData = await resUpdateOrder.json();
      if (!resUpdateOrder.ok) {
        throw new Error(updatedOrderData.message || 'Gagal sinkronisasi order');
      }

      await fetchOrders();
      await fetchServices();
      setTabDirty(item.id, 'pricing', false);
      setTabSaved(item.id, 'pricing');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Gagal menyimpan paket & harga');
    } finally {
      setActiveId('');
    }
  };

  const handleCreateExtensionInvoice = async (item: ServiceOrder) => {
    const selectedServiceId = serviceDraft[item.id] || item.service.id;
    const duration = extensionDraft[item.id] || 1;
    const extensionPackage = findExtensionPackage(selectedServiceId, duration);

    if (!extensionPackage) {
      alert('Paket perpanjangan tidak ditemukan. Pastikan EXT_1M/EXT_2M/EXT_3M tersedia.');
      return;
    }

    try {
      setActiveId(item.id);
      const res = await fetch('/api/admin/service-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          servicePackageId: extensionPackage.id,
          customerName: item.customerName,
          customerEmail: item.customerEmail,
          customerPhone: item.customerPhone,
          company: item.company || '',
          notes: `Perpanjangan ${duration} bulan untuk invoice ${item.invoiceId}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal membuat invoice perpanjangan');
      }

      await fetchOrders();
      setTabDirty(item.id, 'extension', false);
      setTabSaved(item.id, 'extension');
      alert(`Invoice perpanjangan berhasil dibuat dengan status Pending (${data?.data?.invoiceId || '-'})`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Gagal membuat invoice perpanjangan');
    } finally {
      setActiveId('');
    }
  };

  const openCreateModal = () => {
    const firstService = services[0];
    const firstPackage = firstService ? findExtensionPackage(firstService.id, 1) || getPackagesByServiceId(firstService.id)[0] : null;
    setCreateForm(getInitialCreateForm(firstService?.id || '', firstPackage?.id || ''));
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateForm(getInitialCreateForm());
  };

  const getCreateModalResolvedPackage = () => {
    const ext = findExtensionPackage(createForm.serviceId, createForm.durationMonths);
    if (ext) return ext;
    return getPackagesByServiceId(createForm.serviceId).find((pkg) => pkg.id === createForm.servicePackageId) || null;
  };

  const getCreateModalPreviewPrice = () => {
    const resolved = getCreateModalResolvedPackage();
    if (!resolved) return 0;
    if (createForm.pricingType === 'MANUAL') return Math.max(0, Math.round(createForm.manualPrice || 0));
    return resolved.price;
  };

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();

    const resolvedPackage = getCreateModalResolvedPackage();
    if (!createForm.serviceId || !resolvedPackage) {
      alert('Pilih service dan paket yang valid');
      return;
    }

    try {
      setCreating(true);
      const res = await fetch('/api/admin/service-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: createForm.serviceId,
          servicePackageId: resolvedPackage.id,
          customerName: createForm.customerName,
          customerEmail: createForm.customerEmail,
          customerPhone: createForm.customerPhone,
          company: createForm.company,
          notes: createForm.notes,
          manualPrice: createForm.pricingType === 'MANUAL' ? Math.max(0, Math.round(createForm.manualPrice || 0)) : undefined,
          packageNameOverride: createForm.durationMonths > 0 ? `${resolvedPackage.name} (${createForm.durationMonths} bulan)` : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Gagal membuat invoice');
      }

      closeCreateModal();
      await fetchOrders();
      alert('Invoice baru berhasil dibuat dengan status Pending.');
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Gagal membuat invoice');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Orders & Invoice</h1>
          <p className="text-sm text-gray-600 mt-1">Kelola order, ubah layanan, atur varian paket, dan buat invoice perpanjangan.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateModal} variant="primary" size="md" icon={<Plus className="w-4 h-4" />}>
            Buat Invoice
          </Button>
          <Button onClick={fetchOrders} variant="secondary" size="md" icon={<RefreshCw className="w-4 h-4" />}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs uppercase text-gray-500 font-semibold">Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{stats.total}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs uppercase text-gray-500 font-semibold">Pending</p>
          <p className="text-2xl font-bold text-yellow-700 mt-2">{stats.pending}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs uppercase text-gray-500 font-semibold">Paid</p>
          <p className="text-2xl font-bold text-blue-700 mt-2">{stats.paid}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs uppercase text-gray-500 font-semibold">Processing</p>
          <p className="text-2xl font-bold text-indigo-700 mt-2">{stats.processing}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs uppercase text-gray-500 font-semibold">Completed</p>
          <p className="text-2xl font-bold text-green-700 mt-2">{stats.completed}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-6">
        <div className="flex flex-wrap gap-2 mb-4">
          {(['ALL', 'PENDING', 'PAID', 'PROCESSING', 'COMPLETED', 'CANCELLED'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
                statusFilter === status
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {status === 'ALL' ? 'Semua' : statusLabels[status]}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Memuat service orders...</p>
        ) : orders.length === 0 ? (
          <p className="text-sm text-gray-500">Belum ada service order.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((item) => {
              const currentTab = tabs[item.id] || 'detail';
              const selectedServiceId = serviceDraft[item.id] || item.service.id;
              const packagesForService = getPackagesByServiceId(selectedServiceId);
              const selectedPackageId = packageDraft[item.id] || item.servicePackage?.id || '';
              const activePackage = packagesForService.find((pkg) => pkg.id === selectedPackageId) || null;
              const draftPricing = pricingDraft[item.id];
              const extensionMonths = extensionDraft[item.id] || 1;
              const extensionPkg = findExtensionPackage(selectedServiceId, extensionMonths);
              const extensionPreview = extensionPkg?.price || 0;

              return (
                <div key={item.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-base font-bold text-gray-900">{item.service.name}</p>
                      <p className="text-sm text-gray-700">{item.packageName} {item.etaLabel ? `• ${item.etaLabel}` : ''}</p>
                      <p className="text-xs text-gray-500">Invoice: {item.invoiceId}</p>
                      <p className="text-xs text-gray-600">{item.customerName} • {item.customerEmail} • {item.customerPhone}</p>
                      <p className="text-xs text-gray-700">Perusahaan: {item.company || '-'}</p>
                      <p className="text-xs text-gray-700">Brief: {item.notes || '-'}</p>
                      <p className="text-sm font-semibold text-gray-900">Total: IDR {item.total.toLocaleString('id-ID')}</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {[
                          { key: 'detail' as const, label: 'Detail' },
                          { key: 'service' as const, label: 'Ubah Layanan' },
                          { key: 'pricing' as const, label: 'Paket & Harga' },
                          { key: 'extension' as const, label: 'Perpanjangan' },
                        ].map((tabItem) => (
                          <button
                            key={tabItem.key}
                            onClick={() => switchTab(item.id, tabItem.key)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                              currentTab === tabItem.key
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              <span>{tabItem.label}</span>
                              {dirtyTabs[item.id]?.[tabItem.key] ? (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  currentTab === tabItem.key ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  Edited
                                </span>
                              ) : null}
                              {!dirtyTabs[item.id]?.[tabItem.key] && savedTabs[item.id] === tabItem.key ? (
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  currentTab === tabItem.key ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  Saved
                                </span>
                              ) : null}
                            </span>
                          </button>
                        ))}
                      </div>

                      {currentTab === 'detail' ? (
                        <div className="space-y-3">
                          <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full border ${statusColor[item.status]}`}>
                            {statusLabels[item.status]}
                          </span>
                          <select
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                            defaultValue={item.status}
                            onChange={async (e) => {
                              const ok = await handleUpdateOrder(item.id, { status: e.target.value as ServiceOrderStatus });
                              if (ok) {
                                setTabSaved(item.id, 'detail');
                              }
                            }}
                            disabled={activeId === item.id}
                          >
                            <option value="PENDING">Menunggu Pembayaran</option>
                            <option value="PROCESSING">Sedang Diproses</option>
                            <option value="COMPLETED">Selesai</option>
                            <option value="CANCELLED">Dibatalkan</option>
                          </select>
                          <textarea
                            rows={3}
                            value={notesDraft[item.id] || ''}
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                            placeholder="Catatan progres untuk ditampilkan ke client"
                            onChange={(e) => {
                              setNotesDraft((prev) => ({ ...prev, [item.id]: e.target.value }));
                              setTabDirty(item.id, 'detail', true);
                            }}
                          />
                          <Button
                            onClick={async () => {
                              const ok = await handleUpdateOrder(item.id, { progressNotes: notesDraft[item.id] || '' });
                              if (ok) {
                                setTabDirty(item.id, 'detail', false);
                                setTabSaved(item.id, 'detail');
                              }
                            }}
                            variant="secondary"
                            size="sm"
                            icon={<Save className="w-4 h-4" />}
                            disabled={activeId === item.id}
                            fullWidth
                          >
                            Simpan Detail
                          </Button>
                          <p className="text-xs text-gray-500">
                            {savedTabs[item.id] === 'detail'
                              ? 'Tersimpan'
                              : dirtyTabs[item.id]?.detail
                                ? 'Perubahan belum disimpan'
                                : 'Tidak ada perubahan'}
                          </p>
                        </div>
                      ) : null}

                      {currentTab === 'service' ? (
                        <div className="space-y-3">
                          <select
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                            value={selectedServiceId}
                            onChange={(e) => {
                              const nextServiceId = e.target.value;
                              const nextPackages = getPackagesByServiceId(nextServiceId);
                              setServiceDraft((prev) => ({ ...prev, [item.id]: nextServiceId }));
                              setPackageDraft((prev) => ({ ...prev, [item.id]: nextPackages[0]?.id || '' }));
                              setTabDirty(item.id, 'service', true);
                            }}
                            disabled={activeId === item.id}
                          >
                            <option value="">Pilih layanan</option>
                            {services.map((service) => (
                              <option key={service.id} value={service.id}>
                                {service.name}
                              </option>
                            ))}
                          </select>

                          <select
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                            value={selectedPackageId}
                            onChange={(e) => {
                              setPackageDraft((prev) => ({ ...prev, [item.id]: e.target.value }));
                              setTabDirty(item.id, 'service', true);
                            }}
                            disabled={activeId === item.id}
                          >
                            <option value="">Pilih paket</option>
                            {packagesForService.map((pkg) => (
                              <option key={pkg.id} value={pkg.id}>
                                {pkg.name} - IDR {pkg.price.toLocaleString('id-ID')}
                              </option>
                            ))}
                          </select>

                          <div className="text-xs text-gray-600 bg-gray-50 rounded-lg border border-gray-200 p-3">
                            Harga otomatis: <span className="font-semibold">IDR {(activePackage?.price || 0).toLocaleString('id-ID')}</span>
                          </div>

                          <Button
                            onClick={() => handleSaveServicePackage(item)}
                            variant="secondary"
                            size="sm"
                            icon={<Save className="w-4 h-4" />}
                            disabled={activeId === item.id}
                            fullWidth
                          >
                            Simpan Ubah Layanan
                          </Button>
                          <p className="text-xs text-gray-500">
                            {savedTabs[item.id] === 'service'
                              ? 'Tersimpan'
                              : dirtyTabs[item.id]?.service
                                ? 'Perubahan belum disimpan'
                                : 'Tidak ada perubahan'}
                          </p>
                        </div>
                      ) : null}

                      {currentTab === 'pricing' ? draftPricing ? (
                        <div className="space-y-3">
                          <select
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                            value={draftPricing.mode}
                            onChange={(e) => {
                              const mode = e.target.value as PricingMode;
                              const mapped = mode === 'CUSTOM' ? null : findPackageByCode(selectedServiceId, mode);
                              setPricingDraft((prev) => ({
                                ...prev,
                                [item.id]: {
                                  ...prev[item.id],
                                  mode,
                                  packageName: mode === 'CUSTOM' ? prev[item.id].packageName : mapped?.name || prev[item.id].packageName,
                                  etaLabel: mode === 'CUSTOM' ? prev[item.id].etaLabel : mapped?.etaLabel || '',
                                  price: mode === 'CUSTOM' ? prev[item.id].price : mapped?.price || prev[item.id].price,
                                  isVisible: mapped?.isVisible ?? prev[item.id].isVisible,
                                  visibleInOrder: mapped?.visibleInOrder ?? prev[item.id].visibleInOrder,
                                  visibleInServices: mapped?.visibleInServices ?? prev[item.id].visibleInServices,
                                  internalOnly: mapped?.internalOnly ?? prev[item.id].internalOnly,
                                  isActive: mapped?.isActive ?? prev[item.id].isActive,
                                },
                              }));
                              setTabDirty(item.id, 'pricing', true);
                            }}
                            disabled={activeId === item.id}
                          >
                            <option value="REGULAR">Regular</option>
                            <option value="EXPRESS">Express</option>
                            <option value="CUSTOM">Custom</option>
                          </select>

                          <input
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                            value={draftPricing.packageName}
                            onChange={(e) => {
                              setPricingDraft((prev) => ({ ...prev, [item.id]: { ...prev[item.id], packageName: e.target.value } }));
                              setTabDirty(item.id, 'pricing', true);
                            }}
                            placeholder="Nama paket"
                            disabled={activeId === item.id || draftPricing.mode !== 'CUSTOM'}
                          />

                          <input
                            type="number"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                            value={draftPricing.price}
                            onChange={(e) => {
                              setPricingDraft((prev) => ({ ...prev, [item.id]: { ...prev[item.id], price: parseInt(e.target.value, 10) || 0 } }));
                              setTabDirty(item.id, 'pricing', true);
                            }}
                            placeholder="Harga"
                            disabled={activeId === item.id}
                          />

                          <input
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                            value={draftPricing.etaLabel}
                            onChange={(e) => {
                              setPricingDraft((prev) => ({ ...prev, [item.id]: { ...prev[item.id], etaLabel: e.target.value } }));
                              setTabDirty(item.id, 'pricing', true);
                            }}
                            placeholder="SLA / estimasi"
                            disabled={activeId === item.id}
                          />

                          <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={draftPricing.visibleInOrder}
                                onChange={(e) => {
                                  setPricingDraft((prev) => ({ ...prev, [item.id]: { ...prev[item.id], visibleInOrder: e.target.checked } }));
                                  setTabDirty(item.id, 'pricing', true);
                                }}
                                disabled={activeId === item.id || draftPricing.mode === 'CUSTOM' || draftPricing.internalOnly}
                              />
                              Tampil di order
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={draftPricing.visibleInServices}
                                onChange={(e) => {
                                  setPricingDraft((prev) => ({ ...prev, [item.id]: { ...prev[item.id], visibleInServices: e.target.checked } }));
                                  setTabDirty(item.id, 'pricing', true);
                                }}
                                disabled={activeId === item.id || draftPricing.mode === 'CUSTOM' || draftPricing.internalOnly}
                              />
                              Tampil di services
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={draftPricing.internalOnly}
                                onChange={(e) =>
                                  {
                                    setPricingDraft((prev) => ({
                                      ...prev,
                                      [item.id]: {
                                        ...prev[item.id],
                                        internalOnly: e.target.checked,
                                        visibleInOrder: e.target.checked ? false : prev[item.id].visibleInOrder,
                                        visibleInServices: e.target.checked ? false : prev[item.id].visibleInServices,
                                      },
                                    }));
                                    setTabDirty(item.id, 'pricing', true);
                                  }
                                }
                                disabled={activeId === item.id || draftPricing.mode === 'CUSTOM'}
                              />
                              Internal only
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={draftPricing.isActive}
                                onChange={(e) => {
                                  setPricingDraft((prev) => ({ ...prev, [item.id]: { ...prev[item.id], isActive: e.target.checked } }));
                                  setTabDirty(item.id, 'pricing', true);
                                }}
                                disabled={activeId === item.id || draftPricing.mode === 'CUSTOM'}
                              />
                              Paket aktif
                            </label>
                          </div>

                          <Button
                            onClick={() => handleSavePricing(item)}
                            variant="secondary"
                            size="sm"
                            icon={<Save className="w-4 h-4" />}
                            disabled={activeId === item.id}
                            fullWidth
                          >
                            Simpan Paket & Harga
                          </Button>
                          <p className="text-xs text-gray-500">
                            {savedTabs[item.id] === 'pricing'
                              ? 'Tersimpan'
                              : dirtyTabs[item.id]?.pricing
                                ? 'Perubahan belum disimpan'
                                : 'Tidak ada perubahan'}
                          </p>
                        </div>
                      ) : null : null}

                      {currentTab === 'extension' ? (
                        <div className="space-y-3">
                          <div className="space-y-2 text-sm text-gray-700">
                            <p className="font-semibold text-gray-900">Perpanjang:</p>
                            {[1, 2, 3].map((month) => (
                              <label key={month} className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name={`ext-${item.id}`}
                                  checked={extensionMonths === month}
                                  onChange={() => {
                                    setExtensionDraft((prev) => ({ ...prev, [item.id]: month as 1 | 2 | 3 }));
                                    setTabDirty(item.id, 'extension', true);
                                  }}
                                  disabled={activeId === item.id}
                                />
                                {month} bulan
                              </label>
                            ))}
                          </div>

                          <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 text-sm">
                            <p className="text-gray-600">Preview:</p>
                            <p className="font-semibold text-gray-900">Total harga: IDR {extensionPreview.toLocaleString('id-ID')}</p>
                            {!extensionPkg ? <p className="text-xs text-red-600 mt-1">Paket EXT belum tersedia untuk service ini.</p> : null}
                          </div>

                          <Button
                            onClick={() => handleCreateExtensionInvoice(item)}
                            variant="primary"
                            size="sm"
                            disabled={activeId === item.id || !extensionPkg}
                            fullWidth
                          >
                            Perpanjang + Buat Invoice
                          </Button>
                          <p className="text-xs text-gray-500">
                            {savedTabs[item.id] === 'extension'
                              ? 'Tersimpan'
                              : dirtyTabs[item.id]?.extension
                                ? 'Perubahan belum disimpan'
                                : 'Tidak ada perubahan'}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showCreateModal ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl overflow-hidden shadow-xl">
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
              <h2 className="text-lg font-bold text-gray-900">Generate Invoice Baru</h2>
              <button onClick={closeCreateModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGenerateInvoice} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <select
                  value={createForm.serviceId}
                  onChange={(e) => {
                    const serviceId = e.target.value;
                    const ext = findExtensionPackage(serviceId, createForm.durationMonths);
                    const fallback = getPackagesByServiceId(serviceId)[0];
                    setCreateForm((prev) => ({
                      ...prev,
                      serviceId,
                      servicePackageId: ext?.id || fallback?.id || '',
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  required
                >
                  <option value="">Pilih layanan</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>{service.name}</option>
                  ))}
                </select>

                <select
                  value={createForm.servicePackageId}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, servicePackageId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  required
                >
                  <option value="">Pilih paket</option>
                  {getPackagesByServiceId(createForm.serviceId).map((pkg) => (
                    <option key={pkg.id} value={pkg.id}>{pkg.name} - IDR {pkg.price.toLocaleString('id-ID')}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={createForm.durationMonths}
                  onChange={(e) => {
                    const months = Number(e.target.value) as 1 | 2 | 3;
                    const ext = findExtensionPackage(createForm.serviceId, months);
                    setCreateForm((prev) => ({
                      ...prev,
                      durationMonths: months,
                      servicePackageId: ext?.id || prev.servicePackageId,
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value={1}>1 bulan</option>
                  <option value={2}>2 bulan</option>
                  <option value={3}>3 bulan</option>
                </select>

                <select
                  value={createForm.pricingType}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, pricingType: e.target.value as 'AUTO' | 'MANUAL' }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="AUTO">Harga Otomatis</option>
                  <option value="MANUAL">Harga Manual</option>
                </select>

                <input
                  type="number"
                  value={createForm.manualPrice}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, manualPrice: parseInt(e.target.value, 10) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="Harga manual"
                  disabled={createForm.pricingType !== 'MANUAL'}
                />
              </div>

              <div className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                Preview Harga: <span className="font-semibold">IDR {getCreateModalPreviewPrice().toLocaleString('id-ID')}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  value={createForm.customerName}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, customerName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="Nama customer"
                  required
                />
                <input
                  type="email"
                  value={createForm.customerEmail}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, customerEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="Email customer"
                  required
                />
                <input
                  value={createForm.customerPhone}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, customerPhone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="Nomor WhatsApp"
                  required
                />
                <input
                  value={createForm.company}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, company: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="Perusahaan (opsional)"
                />
              </div>

              <textarea
                rows={3}
                value={createForm.notes}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                placeholder="Catatan brief"
              />

              <div className="flex gap-3 pt-2">
                <Button type="button" onClick={closeCreateModal} variant="secondary" size="md" fullWidth>
                  Batal
                </Button>
                <Button type="submit" variant="primary" size="md" isLoading={creating} disabled={creating} fullWidth>
                  {creating ? 'Generating...' : 'Generate Invoice'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Wrench, Plus, Search, Edit, Trash2, X, Save, Layers } from 'lucide-react';
import Button from '@/components/Button';

type Service = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  priceType: 'ONE_TIME' | 'PER_YEAR' | 'MONTHLY';
  isActive: boolean;
  isVisible: boolean;
  availableInOrder: boolean;
  availableInServices: boolean;
  packages?: ServicePackage[];
  _count?: {
    serviceOrders: number;
  };
};

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
  _count?: {
    serviceOrders: number;
  };
};

type ServiceForm = {
  name: string;
  description: string;
  price: number;
  priceType: 'ONE_TIME' | 'PER_YEAR' | 'MONTHLY';
  isActive: boolean;
  isVisible: boolean;
  availableInOrder: boolean;
  availableInServices: boolean;
};

type PackageForm = {
  serviceId: string;
  code: string;
  name: string;
  description: string;
  etaLabel: string;
  price: number;
  durationMonths: number | null;
  sortOrder: number;
  isVisible: boolean;
  visibleInOrder: boolean;
  visibleInServices: boolean;
  internalOnly: boolean;
  isActive: boolean;
};

const initialServiceForm: ServiceForm = {
  name: '',
  description: '',
  price: 0,
  priceType: 'ONE_TIME',
  isActive: true,
  isVisible: true,
  availableInOrder: true,
  availableInServices: true,
};

const initialPackageForm: PackageForm = {
  serviceId: '',
  code: '',
  name: '',
  description: '',
  etaLabel: '',
  price: 0,
  durationMonths: null,
  sortOrder: 0,
  isVisible: true,
  visibleInOrder: true,
  visibleInServices: true,
  internalOnly: false,
  isActive: true,
};

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'services' | 'packages'>('services');

  const [showServiceModal, setShowServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState<ServiceForm>(initialServiceForm);

  const [showPackageModal, setShowPackageModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);
  const [packageForm, setPackageForm] = useState<PackageForm>(initialPackageForm);

  const [saving, setSaving] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [generatingForServiceId, setGeneratingForServiceId] = useState('');

  const fetchServices = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/services?includePackages=true');
      if (!res.ok) throw new Error('Failed to fetch services');
      const data = await res.json();
      setServices(data || []);

      if (!selectedServiceId && data?.length > 0) {
        setSelectedServiceId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch services:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const filteredServices = useMemo(() => {
    const q = search.toLowerCase();
    return services.filter((s) =>
      s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q)
    );
  }, [services, search]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === selectedServiceId) || null,
    [services, selectedServiceId]
  );

  const filteredPackages = useMemo(() => {
    if (!selectedService) return [];
    return [...(selectedService.packages || [])].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [selectedService]);

  const duplicateServiceGroups = useMemo(() => {
    const groups: Record<string, Service[]> = {};

    const normalizeName = (name: string) =>
      name
        .toLowerCase()
        .replace(/\d+\s*gb/g, '')
        .replace(/\d+/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    services.forEach((service) => {
      const key = normalizeName(service.name);
      if (!key) return;
      if (!groups[key]) groups[key] = [];
      groups[key].push(service);
    });

    return Object.entries(groups)
      .filter(([, items]) => items.length > 1)
      .map(([key, items]) => ({ key, items }));
  }, [services]);

  useEffect(() => {
    if (services.length === 0) {
      if (selectedServiceId) setSelectedServiceId('');
      return;
    }

    const stillExists = services.some((service) => service.id === selectedServiceId);
    if (!stillExists) {
      setSelectedServiceId(services[0].id);
    }
  }, [services, selectedServiceId]);

  const openServiceModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setServiceForm({
        name: service.name,
        description: service.description || '',
        price: service.price,
        priceType: service.priceType,
        isActive: service.isActive,
        isVisible: service.isVisible,
        availableInOrder: service.availableInOrder,
        availableInServices: service.availableInServices,
      });
    } else {
      setEditingService(null);
      setServiceForm(initialServiceForm);
    }
    setShowServiceModal(true);
  };

  const closeServiceModal = () => {
    setShowServiceModal(false);
    setEditingService(null);
  };

  const openPackageModal = (pkg?: ServicePackage) => {
    if (pkg) {
      setEditingPackage(pkg);
      setPackageForm({
        serviceId: pkg.serviceId,
        code: pkg.code,
        name: pkg.name,
        description: pkg.description || '',
        etaLabel: pkg.etaLabel || '',
        price: pkg.price,
        durationMonths: pkg.durationMonths || null,
        sortOrder: pkg.sortOrder,
        isVisible: pkg.isVisible,
        visibleInOrder: pkg.visibleInOrder,
        visibleInServices: pkg.visibleInServices,
        internalOnly: pkg.internalOnly,
        isActive: pkg.isActive,
      });
    } else {
      setEditingPackage(null);
      setPackageForm({
        ...initialPackageForm,
        serviceId: selectedServiceId,
      });
    }
    setShowPackageModal(true);
  };

  const closePackageModal = () => {
    setShowPackageModal(false);
    setEditingPackage(null);
  };

  const submitService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const url = editingService ? `/api/admin/services/${editingService.id}` : '/api/admin/services';
      const method = editingService ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menyimpan layanan');

      closeServiceModal();
      await fetchServices();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Gagal menyimpan layanan');
    } finally {
      setSaving(false);
    }
  };

  const submitPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (!packageForm.serviceId) throw new Error('Pilih layanan terlebih dahulu');

      const payload = {
        ...packageForm,
        code: packageForm.code.trim().toUpperCase(),
      };

      const url = editingPackage
        ? `/api/admin/services/packages/${editingPackage.id}`
        : `/api/admin/services/${packageForm.serviceId}/packages`;
      const method = editingPackage ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menyimpan paket layanan');

      closePackageModal();
      await fetchServices();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Gagal menyimpan paket layanan');
    } finally {
      setSaving(false);
    }
  };

  const deleteService = async (id: string) => {
    if (!confirm('Yakin hapus layanan ini?')) return;
    try {
      const res = await fetch(`/api/admin/services/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menghapus layanan');
      await fetchServices();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Gagal menghapus layanan');
    }
  };

  const deletePackage = async (id: string) => {
    if (!confirm('Yakin hapus paket layanan ini?')) return;
    try {
      const res = await fetch(`/api/admin/services/packages/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Gagal menghapus paket layanan');
      await fetchServices();
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Gagal menghapus paket layanan');
    }
  };

  const generateStandardPackages = async (service: Service) => {
    try {
      setGeneratingForServiceId(service.id);

      const existingCodes = new Set((service.packages || []).map((pkg) => pkg.code.toUpperCase()));

      const templates = [
        {
          code: 'REGULAR',
          name: 'Regular',
          description: 'Pengerjaan standar dengan biaya paling hemat.',
          etaLabel: '3-5 hari kerja',
          price: Math.max(0, Math.round(service.price)),
          durationMonths: null,
          sortOrder: 1,
        },
        {
          code: 'PRIORITY',
          name: 'Priority',
          description: 'Prioritas pengerjaan lebih tinggi dari regular.',
          etaLabel: '2-3 hari kerja',
          price: Math.max(0, Math.round(service.price * 1.25)),
          durationMonths: null,
          sortOrder: 2,
        },
        {
          code: 'EXPRESS',
          name: 'Express',
          description: 'Pengerjaan dipercepat untuk kebutuhan urgent.',
          etaLabel: '1-2 hari kerja',
          price: Math.max(0, Math.round(service.price * 1.5)),
          durationMonths: null,
          sortOrder: 3,
        },
      ];

      const missing = templates.filter((tpl) => !existingCodes.has(tpl.code));

      if (missing.length === 0) {
        alert('Paket standar (REGULAR/PRIORITY/EXPRESS) sudah lengkap untuk layanan ini.');
        return;
      }

      for (const item of missing) {
        const res = await fetch(`/api/admin/services/${service.id}/packages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            serviceId: service.id,
            code: item.code,
            name: item.name,
            description: item.description,
            etaLabel: item.etaLabel,
            price: item.price,
            durationMonths: item.durationMonths,
            isVisible: true,
            visibleInOrder: true,
            visibleInServices: true,
            internalOnly: false,
            isActive: true,
            sortOrder: item.sortOrder,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.message || `Gagal membuat paket ${item.code}`);
        }
      }

      await fetchServices();
      alert(`Berhasil generate ${missing.length} paket standar untuk ${service.name}.`);
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Gagal generate paket standar');
    } finally {
      setGeneratingForServiceId('');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Wrench className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Layanan Tambahan</h1>
            <p className="text-gray-600 mt-1">Atur produk layanan, visibility, channel, ketersediaan, dan paket.</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-3 inline-flex gap-2">
        <button
          onClick={() => setTab('services')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            tab === 'services' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Layanan
        </button>
        <button
          onClick={() => setTab('packages')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold ${
            tab === 'packages' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Paket Layanan
        </button>
      </div>

      {duplicateServiceGroups.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p className="font-semibold">Terdeteksi layanan mirip (saran merge parent-child):</p>
          <div className="mt-1 space-y-1">
            {duplicateServiceGroups.map((group) => (
              <p key={group.key}>- {group.items.map((item) => item.name).join(' / ')}</p>
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'services' ? (
        <>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cari layanan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg"
              />
            </div>
            <Button onClick={() => openServiceModal()} variant="primary" size="md" icon={<Plus className="w-5 h-5" />}>
              Tambah Layanan
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <p className="text-sm text-gray-500">Memuat layanan...</p>
            ) : filteredServices.length === 0 ? (
              <p className="text-sm text-gray-500">Belum ada layanan.</p>
            ) : (
              filteredServices.map((service) => (
                <div key={service.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                  <div>
                    <p className="font-bold text-gray-900">{service.name}</p>
                    <p className="text-sm text-gray-600">{service.description || 'Tanpa deskripsi'}</p>
                  </div>
                  <p className="text-lg font-bold text-blue-600">IDR {service.price.toLocaleString('id-ID')}</p>
                  <div className="text-xs rounded-lg border border-blue-100 bg-blue-50 text-blue-700 px-3 py-2">
                    Turunan paket: <span className="font-semibold">{service.packages?.length || 0}</span>
                    {service.packages?.length ? '' : ' (belum ada, order akan membingungkan di step Pilih Paket)'}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                    <p>Visibility: {service.isVisible ? 'Tampil' : 'Sembunyi'}</p>
                    <p>Ketersediaan: {service.isActive ? 'Aktif' : 'Nonaktif'}</p>
                    <p>Masuk /order: {service.availableInOrder ? 'Ya' : 'Tidak'}</p>
                    <p>Masuk /services: {service.availableInServices ? 'Ya' : 'Tidak'}</p>
                    <p className="font-bold text-blue-600 mt-2 bg-blue-50 px-2 py-1 rounded inline-block">
                      Order: {service._count?.serviceOrders || 0} Pengguna
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => openServiceModal(service)} variant="secondary" size="sm" icon={<Edit className="w-4 h-4" />} fullWidth>
                      Edit
                    </Button>
                    <Button
                      onClick={() => generateStandardPackages(service)}
                      variant="primary"
                      size="sm"
                      icon={<Plus className="w-4 h-4" />}
                      disabled={generatingForServiceId === service.id}
                      isLoading={generatingForServiceId === service.id}
                      fullWidth
                    >
                      Paket Standar
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedServiceId(service.id);
                        setTab('packages');
                      }}
                      variant="primary"
                      size="sm"
                      icon={<Layers className="w-4 h-4" />}
                      fullWidth
                    >
                      Kelola Turunan
                    </Button>
                    <Button onClick={() => deleteService(service.id)} variant="danger" size="sm" icon={<Trash2 className="w-4 h-4" />} fullWidth>
                      Hapus
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <div className="rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
            Konsep parent-child: pilih <span className="font-semibold">1 layanan</span>, lalu buat <span className="font-semibold">turunan paket</span> (mis. 1GB/5GB/10GB, Regular/Express).
            Paket inilah yang akan tampil di step <span className="font-semibold">Pilih Paket</span> pada halaman /services.
          </div>

          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="w-full md:w-[320px]">
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
              >
                <option value="">Pilih layanan</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={() => openPackageModal()} variant="primary" size="md" icon={<Plus className="w-5 h-5" />} disabled={!selectedServiceId}>
              Tambah Paket
            </Button>
          </div>

          {selectedService ? (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
              Layanan aktif: <span className="font-semibold">{selectedService.name}</span> • Turunan paket: <span className="font-semibold">{filteredPackages.length}</span>
            </div>
          ) : (
            <p className="text-sm text-amber-700">Pilih layanan dulu untuk melihat dan membuat turunan paket.</p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <p className="text-sm text-gray-500">Memuat paket...</p>
            ) : !selectedService ? (
              <p className="text-sm text-gray-500">Pilih layanan terlebih dahulu.</p>
            ) : filteredPackages.length === 0 ? (
              <p className="text-sm text-gray-500">Belum ada paket untuk layanan ini.</p>
            ) : (
              filteredPackages.map((pkg) => (
                <div key={pkg.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">{pkg.name}</p>
                      <p className="text-xs text-gray-500">Code: {pkg.code}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">Urutan {pkg.sortOrder}</span>
                  </div>
                  <p className="text-sm text-gray-600">{pkg.description || 'Tanpa deskripsi paket'}</p>
                  <p className="text-sm text-gray-700">Estimasi: {pkg.etaLabel || '-'}</p>
                  <p className="text-sm text-gray-700">Durasi: {pkg.durationMonths ? `${pkg.durationMonths} bulan` : '-'}</p>
                  <p className="text-lg font-bold text-blue-600">IDR {pkg.price.toLocaleString('id-ID')}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                    <p>Visibility: {pkg.isVisible ? 'Tampil' : 'Sembunyi'}</p>
                    <p>Ketersediaan: {pkg.isActive ? 'Aktif' : 'Nonaktif'}</p>
                    <p>Tampil di /order: {pkg.visibleInOrder ? 'Ya' : 'Tidak'}</p>
                    <p>Tampil di /services: {pkg.visibleInServices ? 'Ya' : 'Tidak'}</p>
                    <p>Internal only: {pkg.internalOnly ? 'Ya' : 'Tidak'}</p>
                    <p className="font-bold text-blue-600 mt-2 bg-blue-50 px-2 py-1 rounded inline-block col-span-2">
                       Order Paket: {pkg._count?.serviceOrders || 0} Pemakai
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => openPackageModal(pkg)} variant="secondary" size="sm" icon={<Edit className="w-4 h-4" />} fullWidth>
                      Edit
                    </Button>
                    <Button onClick={() => deletePackage(pkg.id)} variant="danger" size="sm" icon={<Trash2 className="w-4 h-4" />} fullWidth>
                      Hapus
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {showServiceModal ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Wrench className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">{editingService ? 'Edit Layanan' : 'Tambah Layanan'}</h2>
              </div>
              <button onClick={closeServiceModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitService} className="p-6 space-y-4">
              <input
                required
                value={serviceForm.name}
                onChange={(e) => setServiceForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                placeholder="Nama layanan"
              />
              <textarea
                rows={3}
                value={serviceForm.description}
                onChange={(e) => setServiceForm((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                placeholder="Deskripsi layanan"
              />

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  required
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm((prev) => ({ ...prev, price: parseInt(e.target.value, 10) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="Harga"
                />
                <select
                  value={serviceForm.priceType}
                  onChange={(e) =>
                    setServiceForm((prev) => ({ ...prev, priceType: e.target.value as ServiceForm['priceType'] }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                >
                  <option value="ONE_TIME">Sekali Bayar</option>
                  <option value="PER_YEAR">Per Tahun</option>
                  <option value="MONTHLY">Bulanan</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={serviceForm.isVisible}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, isVisible: e.target.checked }))}
                  />
                  Tampilkan layanan
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={serviceForm.isActive}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  />
                  Layanan tersedia
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={serviceForm.availableInOrder}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, availableInOrder: e.target.checked }))}
                  />
                  Tersedia di /order
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={serviceForm.availableInServices}
                    onChange={(e) => setServiceForm((prev) => ({ ...prev, availableInServices: e.target.checked }))}
                  />
                  Tersedia di /services
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" onClick={closeServiceModal} variant="secondary" size="md" fullWidth>
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  variant="primary"
                  size="md"
                  isLoading={saving}
                  icon={!saving ? <Save className="w-4 h-4" /> : undefined}
                  fullWidth
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showPackageModal ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg overflow-hidden shadow-xl">
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Layers className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">{editingPackage ? 'Edit Paket Layanan' : 'Tambah Paket Layanan'}</h2>
              </div>
              <button onClick={closePackageModal} className="text-gray-500 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitPackage} className="p-6 space-y-4">
              <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-gray-700">
                Parent layanan: <span className="font-semibold">{services.find((service) => service.id === packageForm.serviceId)?.name || '-'}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input
                  required
                  value={packageForm.code}
                  onChange={(e) => setPackageForm((prev) => ({ ...prev, code: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="Code (REGULAR/EXPRESS/EXT_1M)"
                />
                <input
                  required
                  value={packageForm.name}
                  onChange={(e) => setPackageForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="Nama paket"
                />
              </div>

              <textarea
                rows={2}
                value={packageForm.description}
                onChange={(e) => setPackageForm((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                placeholder="Deskripsi paket"
              />

              <div className="grid grid-cols-3 gap-3">
                <input
                  type="number"
                  required
                  value={packageForm.price}
                  onChange={(e) => setPackageForm((prev) => ({ ...prev, price: parseInt(e.target.value, 10) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="Harga"
                />
                <input
                  type="number"
                  value={packageForm.durationMonths ?? ''}
                  onChange={(e) =>
                    setPackageForm((prev) => ({
                      ...prev,
                      durationMonths: e.target.value ? parseInt(e.target.value, 10) : null,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="Durasi bln"
                />
                <input
                  type="number"
                  value={packageForm.sortOrder}
                  onChange={(e) => setPackageForm((prev) => ({ ...prev, sortOrder: parseInt(e.target.value, 10) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                  placeholder="Urutan"
                />
              </div>

              <input
                value={packageForm.etaLabel}
                onChange={(e) => setPackageForm((prev) => ({ ...prev, etaLabel: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                placeholder="Estimasi (mis. 1-2 hari kerja)"
              />

              <div className="grid grid-cols-2 gap-2 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={packageForm.isVisible}
                    onChange={(e) => setPackageForm((prev) => ({ ...prev, isVisible: e.target.checked }))}
                  />
                  Tampilkan paket
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={packageForm.isActive}
                    onChange={(e) => setPackageForm((prev) => ({ ...prev, isActive: e.target.checked }))}
                  />
                  Paket tersedia
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={packageForm.visibleInOrder}
                    onChange={(e) => setPackageForm((prev) => ({ ...prev, visibleInOrder: e.target.checked }))}
                    disabled={packageForm.internalOnly}
                  />
                  Tampil di /order
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={packageForm.visibleInServices}
                    onChange={(e) => setPackageForm((prev) => ({ ...prev, visibleInServices: e.target.checked }))}
                    disabled={packageForm.internalOnly}
                  />
                  Tampil di /services
                </label>
                <label className="flex items-center gap-2 md:col-span-2">
                  <input
                    type="checkbox"
                    checked={packageForm.internalOnly}
                    onChange={(e) =>
                      setPackageForm((prev) => ({
                        ...prev,
                        internalOnly: e.target.checked,
                        visibleInOrder: e.target.checked ? false : prev.visibleInOrder,
                        visibleInServices: e.target.checked ? false : prev.visibleInServices,
                      }))
                    }
                  />
                  Internal only
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" onClick={closePackageModal} variant="secondary" size="md" fullWidth>
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  variant="primary"
                  size="md"
                  isLoading={saving}
                  icon={!saving ? <Save className="w-4 h-4" /> : undefined}
                  fullWidth
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

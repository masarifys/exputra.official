'use client';

import { useEffect, useState } from 'react';
import { Package as PackageIcon, Plus, Trash2, Edit, X, Check, Save, ArrowLeft } from 'lucide-react';
import Button from '@/components/Button';

interface Package {
  id: string;
  name: string;
  price: number;
  price1Year?: number;
  price2Year?: number;
  price3Year?: number;
  duration: number;
  features: string;
  isPopular: boolean;
  freeDomain: boolean;
  freeTemplate: boolean;
  discountBadge?: string;
  isActive: boolean;
}

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingPackage, setEditingPackage] = useState<Package | null>(null);
  const [domains, setDomains] = useState<{ id: string, extension: string }[]>([]);
  const [templates, setTemplates] = useState<{ id: string, name: string }[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    price1Year: 0,
    price2Year: 0,
    price3Year: 0,
    duration: 1,
    features: '',
    isPopular: false,
    freeDomain: false,
    freeDomainIds: [] as string[],
    freeTemplate: false,
    freeTemplateIds: [] as string[],
    discountBadge: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPackages();
    fetchDomains();
    fetchTemplates();
  }, []);

  const fetchDomains = async () => {
    try {
      const res = await fetch('/api/admin/domains');
      if (res.ok) {
        const data = await res.json();
        setDomains(data);
      }
    } catch (error) {
      console.error('Failed to fetch domains:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/admin/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const fetchPackages = async () => {
    try {
      const res = await fetch('/api/admin/packages');
      if (res.ok) {
        const data = await res.json();
        setPackages(data);
      }
    } catch (error) {
      console.error('Failed to fetch packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (pkg?: any) => {
    if (pkg) {
      setEditingPackage(pkg);
      setFormData({
        name: pkg.name,
        price: pkg.price,
        price1Year: pkg.price1Year || pkg.price,
        price2Year: pkg.price2Year || 0,
        price3Year: pkg.price3Year || 0,
        duration: pkg.duration,
        features: pkg.features,
        isPopular: pkg.isPopular,
        freeDomain: pkg.freeDomain ?? false,
        freeDomainIds: pkg.freeDomains ? pkg.freeDomains.map((d: any) => d.id) : [],
        freeTemplate: pkg.freeTemplate ?? false,
        freeTemplateIds: pkg.freeTemplates ? pkg.freeTemplates.map((t: any) => t.id) : [],
        discountBadge: pkg.discountBadge || '',
        isActive: pkg.isActive,
      });
    } else {
      setEditingPackage(null);
      setFormData({
        name: '',
        price: 0,
        price1Year: 0,
        price2Year: 0,
        price3Year: 0,
        duration: 1,
        features: '',
        isPopular: false,
        freeDomain: false,
        freeDomainIds: [],
        freeTemplate: false,
        freeTemplateIds: [],
        discountBadge: '',
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingPackage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingPackage
        ? `/api/admin/packages/${editingPackage.id}`
        : '/api/admin/packages';
      const method = editingPackage ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        fetchPackages();
        closeModal();
      } else {
        const error = await res.json();
        alert(error.message || 'Gagal menyimpan paket');
      }
    } catch (error) {
      console.error('Failed to save package:', error);
      alert('Gagal menyimpan paket');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus paket ini?')) return;

    try {
      const res = await fetch(`/api/admin/packages/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchPackages();
      } else {
        alert('Gagal menghapus paket');
      }
    } catch (error) {
      console.error('Failed to delete package:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <PackageIcon className="w-8 h-8 text-blue-600" />
            </div>
            Packages
          </h1>
          <p className="text-gray-600 mt-2">Kelola paket berlangganan</p>
        </div>
        <Button
          onClick={() => openModal()}
          variant="primary"
          size="lg"
          icon={<Plus className="w-5 h-5" />}
        >
          Tambah Paket
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            className={`bg-white rounded-xl border-2 overflow-hidden hover:shadow-lg transition-all duration-200 relative ${
              pkg.isPopular ? 'border-blue-500 shadow-lg' : 'border-gray-100'
            }`}
          >
            {pkg.isPopular && (
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white text-center py-2 text-sm font-bold">
                ⭐ POPULER
              </div>
            )}
            <div className="p-6">
              {/* Header with status */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{pkg.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{pkg.duration} Tahun</p>
                </div>
                <span
                  className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                    pkg.isActive
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {pkg.isActive ? '✓ Aktif' : 'Nonaktif'}
                </span>
              </div>

              {/* Price */}
              <div className="mb-6 pb-6 border-b border-gray-100">
                <p className="text-sm text-gray-500 mb-1">Harga</p>
                <p className="text-4xl font-bold text-blue-600">
                  IDR {pkg.price.toLocaleString('id-ID')}
                </p>
              </div>

              {/* Free Domain Badge */}
              {(pkg.freeDomain ?? false) && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-semibold text-green-700">Domain Gratis</span>
                  </div>
                </div>
              )}

              {/* Free Template Badge */}
              {(pkg.freeTemplate ?? false) && (
                <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-purple-600" />
                    <span className="text-sm font-semibold text-purple-700">Template Gratis</span>
                  </div>
                </div>
              )}

              {/* Features */}
              <div className="mb-6">
                <p className="text-sm font-semibold text-gray-900 mb-3">Fitur Included:</p>
                <ul className="space-y-2">
                  {pkg.features.split('\n').map((feature, idx) => (
                    <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-6 border-t border-gray-100">
                <Button
                  onClick={() => openModal(pkg)}
                  variant="secondary"
                  size="md"
                  icon={<Edit className="w-4 h-4" />}
                  fullWidth
                >
                  Edit
                </Button>
                <Button
                  onClick={() => handleDelete(pkg.id)}
                  variant="danger"
                  size="md"
                  icon={<Trash2 className="w-4 h-4" />}
                  fullWidth
                >
                  Hapus
                </Button>
              </div>
            </div>
          </div>
        ))}
        {packages.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500">
            Belum ada paket. Klik &quot;Tambah Paket&quot; untuk menambahkan.
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start sm:items-center justify-center z-50 overflow-y-auto py-4 sm:py-8">
          <div className="bg-white rounded-xl w-full max-w-3xl mx-3 sm:mx-4 shadow-2xl max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingPackage ? 'Edit Paket' : 'Tambah Paket'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Nama Paket
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Basic, Premium, Custom"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Harga 1 Tahun (IDR)
                  </label>
                  <input
                    type="number"
                    value={formData.price1Year}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setFormData({ ...formData, price1Year: val, price: val });
                    }}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Durasi (Tahun)
                  </label>
                  <select
                    value={formData.duration}
                    onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={1}>1 Tahun</option>
                    <option value={2}>2 Tahun</option>
                    <option value={3}>3 Tahun</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Harga 2 Tahun (IDR)
                  </label>
                  <input
                    type="number"
                    value={formData.price2Year}
                    onChange={(e) => setFormData({ ...formData, price2Year: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Harga 3 Tahun (IDR)
                  </label>
                  <input
                    type="number"
                    value={formData.price3Year}
                    onChange={(e) => setFormData({ ...formData, price3Year: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Badge Diskon (Opsional)
                </label>
                <input
                  type="text"
                  value={formData.discountBadge}
                  onChange={(e) => setFormData({ ...formData, discountBadge: e.target.value })}
                  placeholder="Contoh: 90% OFF, Limited Promo, Hemat 50%"
                  className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Fitur (satu per baris)
                </label>
                <textarea
                  value={formData.features}
                  onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                  rows={5}
                  placeholder="Hosting 1GB&#10;SSL Gratis&#10;Support 24/7"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isPopular}
                      onChange={(e) => setFormData({ ...formData, isPopular: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-semibold text-gray-900">Paket Populer</span>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={!!formData.freeDomain}
                      onChange={(e) => setFormData({ ...formData, freeDomain: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-semibold text-gray-900">🎁 Domain Gratis (Free Domain)</span>
                  </label>

                  {formData.freeDomain && (
                    <div className="pl-6 mt-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pilih Ekstensi Domain</label>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-52 overflow-y-auto border p-2 rounded bg-gray-50">
                        {domains.map((domain) => (
                          <label key={domain.id} className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={formData.freeDomainIds.includes(domain.id)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setFormData(prev => ({
                                  ...prev,
                                  freeDomainIds: checked
                                    ? [...prev.freeDomainIds, domain.id]
                                    : prev.freeDomainIds.filter(id => id !== domain.id)
                                }));
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>{domain.extension}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Pilih satu atau lebih ekstensi yang digratiskan.</p>
                    </div>
                  )}

                  <label className="flex items-center mt-3">
                    <input
                      type="checkbox"
                      checked={!!formData.freeTemplate}
                      onChange={(e) => setFormData({ ...formData, freeTemplate: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-semibold text-gray-900">🎨 Template Gratis (Free Template)</span>
                  </label>

                  {formData.freeTemplate && (
                    <div className="pl-6 mt-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pilih Template</label>
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 max-h-52 overflow-y-auto border p-2 rounded bg-gray-50">
                        {templates.map((template) => (
                          <label key={template.id} className="flex items-center space-x-2 text-sm">
                            <input
                              type="checkbox"
                              checked={formData.freeTemplateIds.includes(template.id)}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setFormData(prev => ({
                                  ...prev,
                                  freeTemplateIds: checked
                                    ? [...prev.freeTemplateIds, template.id]
                                    : prev.freeTemplateIds.filter(id => id !== template.id)
                                }));
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span>{template.name}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Pilih satu atau lebih template yang digratiskan.</p>
                    </div>
                  )}

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-semibold text-gray-900">Aktif</span>
                  </label>
                </div>

              <div className="flex gap-3 mt-6">
                <Button
                  type="button"
                  onClick={closeModal}
                  variant="secondary"
                  size="md"
                  fullWidth
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  variant="primary"
                  size="md"
                  isLoading={saving}
                  icon={!saving && <Save className="w-4 h-4" />}
                  fullWidth
                >
                  {saving ? 'Menyimpan...' : 'Simpan'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

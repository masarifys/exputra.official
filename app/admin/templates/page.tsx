'use client';

import { useEffect, useState } from 'react';
import { Type, Plus, Edit, Trash2, X, ExternalLink, Save } from 'lucide-react';
import Button from '@/components/Button';
import Image from 'next/image';

interface Template {
  id: string;
  name: string;
  thumbnail: string | null;
  previewUrl: string | null;
  category: string;
  price: number;
  isPaid: boolean;
  description: string | null;
  isActive: boolean;
}

const categories = ['Landing Page', 'Company Profile', 'E-Commerce', 'Portfolio', 'Blog', 'Custom'];

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    thumbnail: '',
    previewUrl: '',
    category: '',
    price: 0,
    isPaid: false,
    description: '',
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/admin/templates');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (template?: Template) => {
    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        thumbnail: template.thumbnail || '',
        previewUrl: template.previewUrl || '',
        category: template.category,
        price: template.price,
        isPaid: template.isPaid,
        description: template.description || '',
        isActive: template.isActive,
      });
    } else {
      setEditingTemplate(null);
      setFormData({
        name: '',
        thumbnail: '',
        previewUrl: '',
        category: '',
        price: 0,
        isPaid: false,
        description: '',
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const url = editingTemplate
        ? `/api/admin/templates/${editingTemplate.id}`
        : '/api/admin/templates';
      const method = editingTemplate ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        fetchTemplates();
        closeModal();
      } else {
        const error = await res.json();
        alert(error.message || 'Gagal menyimpan template');
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Gagal menyimpan template');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin ingin menghapus template ini?')) return;

    try {
      const res = await fetch(`/api/admin/templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTemplates();
      } else {
        alert('Gagal menghapus template');
      }
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  };

  const toggleStatus = async (template: Template) => {
    try {
      await fetch(`/api/admin/templates/${template.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...template, isActive: !template.isActive }),
      });
      fetchTemplates();
    } catch (error) {
      console.error('Failed to toggle status:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Type className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Templates</h1>
            <p className="text-gray-600 mt-1">Kelola template website</p>
          </div>
        </div>
        <Button
          onClick={() => openModal()}
          variant="primary"
          size="md"
          icon={<Plus className="w-5 h-5" />}
        >
          Tambah Template
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all"
          >
            {/* Thumbnail */}
            <div className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 relative overflow-hidden">
              {template.thumbnail ? (
                <Image
                  src={template.thumbnail}
                  alt={template.name}
                  fill
                  className="object-cover hover:scale-105 transition-transform"
                  sizes="(max-width: 768px) 100vw, 33vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Type className="w-12 h-12 text-gray-300" />
                </div>
              )}
              <div className="absolute top-2 right-2 flex gap-2">
                {template.isPaid && (
                  <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-semibold rounded-full">
                    Berbayar
                  </span>
                )}
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  template.isActive
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'
                }`}>
                  {template.isActive ? 'Aktif' : 'Nonaktif'}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              <div>
                <h3 className="font-bold text-gray-900">{template.name}</h3>
                <p className="text-xs text-gray-600 font-semibold mt-1 uppercase">{template.category}</p>
              </div>

              <div className="pb-3 border-b border-gray-200">
                <p className="text-2xl font-bold text-blue-600">
                  {template.price === 0 ? 'Gratis' : `IDR ${template.price.toLocaleString('id-ID')}`}
                </p>
              </div>

              {template.previewUrl && (
                <a
                  href={template.previewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-semibold"
                >
                  <ExternalLink className="w-4 h-4" />
                  Lihat Preview
                </a>
              )}

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  onClick={() => openModal(template)}
                  variant="secondary"
                  size="sm"
                  icon={<Edit className="w-4 h-4" />}
                  fullWidth
                >
                  Edit
                </Button>
                <Button
                  onClick={() => handleDelete(template.id)}
                  variant="danger"
                  size="sm"
                  icon={<Trash2 className="w-4 h-4" />}
                  fullWidth
                >
                  Hapus
                </Button>
              </div>
            </div>
          </div>
        ))}
        {templates.length === 0 && (
          <div className="col-span-full text-center py-12">
            <Type className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Belum ada template. Klik &quot;Tambah Template&quot; untuk menambahkan.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-8">
          <div className="bg-white rounded-xl w-full max-w-lg mx-4 overflow-hidden shadow-xl">
            {/* Sticky Header */}
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Type className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editingTemplate ? 'Edit Template' : 'Tambah Template'}
                </h2>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Nama Template
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Thumbnail URL
                </label>
                <input
                  type="text"
                  value={formData.thumbnail}
                  onChange={(e) => setFormData({ ...formData, thumbnail: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Link Preview
                </label>
                <input
                  type="text"
                  value={formData.previewUrl}
                  onChange={(e) => setFormData({ ...formData, previewUrl: e.target.value })}
                  placeholder="https://demo.example.com/template-name"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">URL untuk melihat preview template</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Kategori
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Harga (IDR)
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.isPaid}
                      onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-semibold text-gray-900">Template Berbayar</span>
                  </label>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Deskripsi
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="ml-2 text-sm font-semibold text-gray-900">
                  Aktif
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

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Users, Search, Plus, Trash2, Edit, Mail, Phone, MapPin, X } from 'lucide-react';
import Button from '@/components/Button';
import DataExportImport from '@/components/DataExportImport';

interface Client {
    id: string;
    email: string;
    name: string;
    phone: string;
    whatsapp?: string;
    company?: string;
    address?: string;
    notes?: string;
    userId?: string;
    password?: string;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt: string;
    _count?: {
        domains: number;
        servers: number;
    };
}

export default function ClientsPage() {
    const router = useRouter();
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [selectedClients, setSelectedClients] = useState<string[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editingClient, setEditingClient] = useState<Client | null>(null);

    const fetchClients = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (search) params.append('search', search);

            const res = await fetch(`/api/admin/clients?${params}`);
            const data = await res.json();
            setClients(data);
        } catch (error) {
            console.error('Failed to fetch clients:', error);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, search]);

    useEffect(() => {
        fetchClients();
    }, [fetchClients]);

    const handleSelectAll = () => {
        if (selectedClients.length === clients.length) {
            setSelectedClients([]);
        } else {
            setSelectedClients(clients.map((c) => c.email));
        }
    };

    const handleSelect = (email: string) => {
        if (selectedClients.includes(email)) {
            setSelectedClients(selectedClients.filter((e) => e !== email));
        } else {
            setSelectedClients([...selectedClients, email]);
        }
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selectedClients.length} clients?`)) return;

        try {
            await fetch('/api/admin/clients/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emails: selectedClients }),
            });
            setSelectedClients([]);
            fetchClients();
        } catch (error) {
            console.error('Bulk delete failed:', error);
        }
    };

    const handleDelete = async (email: string) => {
        if (!confirm('Delete this client?')) return;

        try {
            await fetch(`/api/admin/clients/${encodeURIComponent(email)}`, {
                method: 'DELETE',
            });
            fetchClients();
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const handleEdit = (client: Client) => {
        setEditingClient(client);
        setShowModal(true);
    };

    const handleImportClients = async (importedData: any[]) => {
        try {
            const response = await fetch('/api/admin/clients/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: importedData }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Gagal mengimpor data');
            }

            // Show success with details
            alert(`✓ ${result.message}`);
            
            fetchClients();
        } catch (error) {
            throw error;
        }
    };

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="bg-blue-100 p-3 rounded-lg">
                            <Users className="w-8 h-8 text-blue-600" />
                        </div>
                        Clients
                    </h1>
                    <p className="text-gray-600 mt-2">Manage your clients and their information</p>
                </div>
                <Link
                    href="/admin/clients/add"
                    className="inline-flex"
                >
                    <Button
                        variant="primary"
                        size="lg"
                        icon={<Plus className="w-5 h-5" />}
                    >
                        Add Client
                    </Button>
                </Link>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex gap-4 flex-wrap items-center justify-between">
                    <div className="flex gap-4 flex-wrap flex-1 items-center">
                        <div className="flex-1 min-w-64 relative">
                            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by email, name, or company..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">All Status</option>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <DataExportImport
                            data={clients}
                            fileName="clients"
                            sheetName="Clients"
                            columns={['email', 'name', 'company', 'phone', 'whatsapp', 'address', 'status', 'createdAt']}
                            onImport={handleImportClients}
                        />
                        {selectedClients.length > 0 && (
                            <Button
                                onClick={handleBulkDelete}
                                variant="danger"
                                size="md"
                                icon={<Trash2 className="w-5 h-5" />}
                            >
                                Delete ({selectedClients.length})
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Clients Grid/List */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-600">Loading clients...</div>
                </div>
            ) : clients.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 text-lg">No clients found</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {clients.map((client) => (
                        <div
                            key={client.id}
                            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200"
                        >
                            {/* Header with checkbox and status */}
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <input
                                        type="checkbox"
                                        checked={selectedClients.includes(client.email)}
                                        onChange={() => handleSelect(client.email)}
                                        className="rounded border-gray-300"
                                    />
                                </div>
                                <span
                                    className={`px-3 py-1 text-xs rounded-full font-medium ${
                                        client.status === 'ACTIVE'
                                            ? 'bg-green-100 text-green-700'
                                            : 'bg-gray-100 text-gray-700'
                                    }`}
                                >
                                    {client.status}
                                </span>
                            </div>

                            {/* Client Info */}
                            <div className="mb-4">
                                <h3 className="text-lg font-bold text-gray-900">{client.name}</h3>
                                {client.company && (
                                    <p className="text-sm text-gray-600 mt-1">{client.company}</p>
                                )}
                            </div>

                            {/* Contact Info */}
                            <div className="space-y-3 mb-6 py-4 border-t border-b border-gray-100">
                                <div className="flex items-center gap-3">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">{client.email}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Phone className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">{client.phone}</span>
                                </div>
                                {client.address && (
                                    <div className="flex items-center gap-3">
                                        <MapPin className="w-4 h-4 text-gray-400" />
                                        <span className="text-sm text-gray-600">{client.address}</span>
                                    </div>
                                )}
                            </div>

                            {/* Stats */}
                            {client._count && (
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                                        <p className="text-2xl font-bold text-blue-600">{client._count.domains}</p>
                                        <p className="text-xs text-gray-600">Domains</p>
                                    </div>
                                    <div className="bg-green-50 rounded-lg p-3 text-center">
                                        <p className="text-2xl font-bold text-green-600">{client._count.servers}</p>
                                        <p className="text-xs text-gray-600">Servers</p>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => handleEdit(client)}
                                    variant="secondary"
                                    size="md"
                                    icon={<Edit className="w-4 h-4" />}
                                    fullWidth
                                >
                                    Edit
                                </Button>
                                <Button
                                    onClick={() => handleDelete(client.email)}
                                    variant="danger"
                                    size="md"
                                    icon={<Trash2 className="w-4 h-4" />}
                                    fullWidth
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal for Edit Only */}
            {showModal && editingClient && (
                <ClientModal
                    client={editingClient}
                    onClose={() => {
                        setShowModal(false);
                        setEditingClient(null);
                    }}
                    onSuccess={() => {
                        setShowModal(false);
                        setEditingClient(null);
                        fetchClients();
                    }}
                />
            )}
        </div>
    );
}

function ClientModal({ client, onClose, onSuccess }: { client: Client | null; onClose: () => void; onSuccess: () => void; }) {
    const [formData, setFormData] = useState({
        email: client?.email || '',
        name: client?.name || '',
        phone: client?.phone || '',
        password: client?.password || '',
        whatsapp: client?.whatsapp || '',
        company: client?.company || '',
        address: client?.address || '',
        notes: client?.notes || '',
        status: client?.status || 'ACTIVE',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const url = `/api/admin/clients/${encodeURIComponent(client!.email)}`;
            const res = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                onSuccess();
            } else {
                const error = await res.json();
                alert(error.message || 'Failed to save client');
            }
        } catch (error) {
            console.error('Save failed:', error);
            alert('Failed to save client');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Edit Client</h2>
                        <p className="text-sm text-gray-600 mt-1">{client?.name}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="w-6 h-6 text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                Email *
                            </label>
                            <input
                                type="email"
                                required
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                Company
                            </label>
                            <input
                                type="text"
                                value={formData.company}
                                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                Status
                            </label>
                            <select
                                value={formData.status}
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                Phone *
                            </label>
                            <input
                                type="tel"
                                required
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-900 mb-2">
                                Password Login
                            </label>
                            <input
                                type="text"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="Kosongkan jika tidak ingin mengubah password"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                            Address
                        </label>
                        <textarea
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            rows={2}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-900 mb-2">
                            Notes
                        </label>
                        <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Additional details..."
                        />
                    </div>

                    <div className="flex gap-3 pt-6 border-t mt-6">
                        <Button
                            type="button"
                            onClick={onClose}
                            variant="secondary"
                            size="lg"
                            fullWidth
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            isLoading={loading}
                            fullWidth
                        >
                            {loading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

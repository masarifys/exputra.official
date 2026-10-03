'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Globe, Search, Plus, Trash2, Edit, X, Zap, RefreshCw } from 'lucide-react';
import DataExportImport from '@/components/DataExportImport';
import { formatDateShort } from '@/lib/utils';

interface Client {
    email: string;
    name: string;
    company?: string;
}

interface Registrar {
    id: string;
    name: string;
}

interface Domain {
    id: string;
    clientEmail: string;
    domainName: string;
    registrar: string;
    registrarId?: string; // Add this
    registeredAt: string;
    expiredAt: string;
    status: 'ACTIVE' | 'EXPIRED' | 'PENDING' | 'SUSPENDED';
    autoRenew: boolean;
    notes?: string;
    client: {
        email: string;
        name: string;
        company?: string;
    };
    servers: {
        server: {
            id: string;
            serverName: string;
            ipAddress: string;
        }
    }[];
    registrarRel?: { name: string }; // From include
}

export default function DomainsPage() {
    const [domains, setDomains] = useState<Domain[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [registrars, setRegistrars] = useState<Registrar[]>([]);
    const [servers, setServers] = useState<any[]>([]); // New servers state
    const [loading, setLoading] = useState(true);
    const [clientEmail, setClientEmail] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [showExpiring, setShowExpiring] = useState(false);
    const [selected, setSelected] = useState<string[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Domain | null>(null);
    const [showAutoAddModal, setShowAutoAddModal] = useState(false);
    const [availableOrders, setAvailableOrders] = useState<any[]>([]);
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [autoAddLoading, setAutoAddLoading] = useState(false);
    const [checkingWhoisIds, setCheckingWhoisIds] = useState<string[]>([]);
    const [checkingAllWhois, setCheckingAllWhois] = useState(false);
    const [whoisNotice, setWhoisNotice] = useState('');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (clientEmail) params.append('clientEmail', clientEmail);
            if (statusFilter) params.append('status', statusFilter);
            if (showExpiring) params.append('expiringSoon', 'true');

            const [domainsRes, clientsRes, registrarsRes, serversRes] = await Promise.all([
                fetch(`/api/admin/client-domains?${params}`),
                fetch('/api/admin/clients'),
                fetch('/api/admin/domain-registrars'),
                fetch('/api/admin/client-servers')
            ]);

            setDomains(await domainsRes.json());
            setClients(await clientsRes.json());
            setRegistrars(await registrarsRes.json());
            setServers(await serversRes.json());
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }, [clientEmail, statusFilter, showExpiring]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSelectAll = () => {
        setSelected(selected.length === domains.length ? [] : domains.map(d => d.id));
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selected.length} domains?`)) return;
        try {
            await fetch('/api/admin/client-domains/bulk-delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: selected }),
            });
            setSelected([]);
            fetchData();
        } catch (error) {
            console.error('Bulk delete failed:', error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this domain?')) return;
        try {
            await fetch(`/api/admin/client-domains/${id}`, { method: 'DELETE' });
            fetchData();
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const getDaysUntilExpiry = (expiredAt: string) => {
        const days = Math.ceil((new Date(expiredAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return days;
    };

    const handleWhoisCheck = async (ids?: string[]) => {
        const isBulkCheck = !ids || ids.length === 0;
        if (isBulkCheck) {
            setCheckingAllWhois(true);
        } else {
            setCheckingWhoisIds(prev => [...new Set([...prev, ...ids])]);
        }
        setWhoisNotice('');

        try {
            const response = await fetch('/api/admin/client-domains/whois', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(ids?.length ? { ids } : {}),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.message || 'Pengecekan WHOIS gagal');

            const failedDomains = (result.results || [])
                .filter((item: { success: boolean }) => !item.success)
                .slice(0, 3)
                .map((item: { domainName: string; error: string }) => `${item.domainName}: ${item.error}`);
            setWhoisNotice(
                `${result.message}${failedDomains.length ? ` — Gagal: ${failedDomains.join('; ')}` : ''}`,
            );
            await fetchData();
        } catch (error) {
            setWhoisNotice(error instanceof Error ? error.message : 'Pengecekan WHOIS gagal');
        } finally {
            if (isBulkCheck) {
                setCheckingAllWhois(false);
            } else {
                setCheckingWhoisIds(prev => prev.filter(id => !ids.includes(id)));
            }
        }
    };

    const handleOpenAutoAddModal = async () => {
        try {
            const params = new URLSearchParams();
            if (clientEmail) params.append('clientEmail', clientEmail);
            const res = await fetch(`/api/admin/client-domains/auto-add?${params}`);
            if (!res.ok) {
                throw new Error(`API error: ${res.status} ${res.statusText}`);
            }
            const orders = await res.json();
            setAvailableOrders(Array.isArray(orders) ? orders : []);
            setSelectedOrders([]);
            setShowAutoAddModal(true);
        } catch (error) {
            console.error('Failed to fetch available orders:', error);
            alert('Failed to fetch available orders. Please try again.');
        }
    };

    const handleAutoAdd = async () => {
        if (selectedOrders.length === 0) {
            alert('Please select at least one order');
            return;
        }

        setAutoAddLoading(true);
        try {
            const res = await fetch('/api/admin/client-domains/auto-add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderIds: selectedOrders }),
            });

            const result = await res.json();

            if (res.ok) {
                alert(`✓ Added ${result.addedDomains.length} domain(s)${result.skippedDomains.length > 0 ? ` (${result.skippedDomains.length} skipped)` : ''}`);
                setShowAutoAddModal(false);
                fetchData();
            } else {
                alert(result.message || 'Failed to auto-add domains');
            }
        } catch (error) {
            console.error('Auto-add failed:', error);
            alert('Failed to auto-add domains');
        } finally {
            setAutoAddLoading(false);
        }
    };

    const toggleOrderSelection = (orderId: string) => {
        setSelectedOrders(prev =>
            prev.includes(orderId)
                ? prev.filter(id => id !== orderId)
                : [...prev, orderId]
        );
    };

    const handleImportDomains = async (importedData: any[]) => {
        try {
            const response = await fetch('/api/admin/client-domains/import', {
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
            
            fetchData();
        } catch (error) {
            throw error;
        }
    };

    return (
        <div>
            <div className="mb-6 flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-lg">
                    <Globe className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Domain Register</h1>
                    <p className="text-gray-600 mt-1">Kelola domain klien dan pantau tanggal berakhir</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-4 flex-1">
                        <select
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Semua Klien</option>
                            {clients.map(client => (
                                <option key={client.email} value={client.email}>
                                    {client.name} ({client.email})
                                </option>
                            ))}
                        </select>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Semua Status</option>
                            <option value="ACTIVE">Aktif</option>
                            <option value="EXPIRED">Berakhir</option>
                            <option value="PENDING">Pending</option>
                            <option value="SUSPENDED">Suspended</option>
                        </select>
                        <label className="flex items-center gap-2 px-3 py-2">
                            <input
                                type="checkbox"
                                checked={showExpiring}
                                onChange={(e) => setShowExpiring(e.target.checked)}
                                className="rounded border-gray-300"
                            />
                            <span className="text-sm font-semibold text-gray-900">Akan Berakhir</span>
                        </label>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleWhoisCheck()}
                            disabled={checkingAllWhois || domains.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                        >
                            <RefreshCw className={`w-4 h-4 ${checkingAllWhois ? 'animate-spin' : ''}`} />
                            {checkingAllWhois ? 'Mengecek...' : 'Cek Semua Domain'}
                        </button>
                        <DataExportImport
                            data={domains}
                            fileName="client_domains"
                            sheetName="Domains"
                            columns={['domainName', 'clientEmail', 'registrar', 'registeredAt', 'expiredAt', 'status', 'autoRenew']}
                            onImport={handleImportDomains}
                        />
                        {selected.length > 0 && (
                            <button onClick={handleBulkDelete} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">
                                <Trash2 className="w-4 h-4" />
                                Hapus ({selected.length})
                            </button>
                        )}
                        <button onClick={handleOpenAutoAddModal} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold">
                            <Zap className="w-4 h-4" />
                            Auto Add
                        </button>
                        <Link href="/admin/client-domains/add" className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold">
                            <Plus className="w-4 h-4" />
                            Tambah Domain
                        </Link>
                    </div>
                </div>
            </div>

            {whoisNotice && (
                <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    {whoisNotice}
                </div>
            )}

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left">
                                <input type="checkbox" checked={selected.length === domains.length && domains.length > 0} onChange={handleSelectAll} className="rounded border-gray-300" />
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">Domain</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">Klien</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">Registrar</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">Server</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">Terdaftar</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">Berakhir</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-900 uppercase">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={9} className="px-6 py-4 text-center text-gray-500"><div className="inline-flex items-center justify-center gap-2"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>Loading...</div></td></tr>
                        ) : domains.length === 0 ? (
                            <tr><td colSpan={9} className="px-6 py-4 text-center text-gray-500">Domain tidak ditemukan</td></tr>
                        ) : (
                            domains.map((domain) => {
                                const daysLeft = getDaysUntilExpiry(domain.expiredAt);
                                return (
                                    <tr key={domain.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <input type="checkbox" checked={selected.includes(domain.id)} onChange={() => setSelected(selected.includes(domain.id) ? selected.filter(id => id !== domain.id) : [...selected, domain.id])} className="rounded border-gray-300" />
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">{domain.domainName}</td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="font-semibold text-gray-900">{domain.client.name}</div>
                                            <div className="text-xs text-gray-500">{domain.client.email}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {domain.registrarRel?.name || domain.registrar}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            {domain.servers && domain.servers.length > 0 ? (
                                                <Link
                                                    href={`/admin/client-servers?search=${domain.servers[0].server.serverName}`}
                                                    className="text-blue-600 hover:text-blue-900 font-semibold"
                                                >
                                                    {domain.servers[0].server.serverName}
                                                </Link>
                                            ) : (
                                                <span className="text-gray-400 text-xs">Tidak Terkait</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                            {formatDateShort(domain.registeredAt)}
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <div className="font-semibold text-gray-900">{formatDateShort(domain.expiredAt)}</div>
                                            {daysLeft > 0 && daysLeft <= 30 && (
                                              <div className="text-xs text-orange-600 font-semibold">{daysLeft} hari</div>
                                            )}
                                            {daysLeft < 0 && (
                                                <div className="text-xs text-red-600 font-semibold">Berakhir</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${domain.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                                domain.status === 'EXPIRED' ? 'bg-red-100 text-red-700' :
                                                    domain.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-gray-100 text-gray-600'
                                                }`}>
                                                {domain.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm space-x-2 whitespace-nowrap">
                                            <button
                                                onClick={() => handleWhoisCheck([domain.id])}
                                                disabled={checkingAllWhois || checkingWhoisIds.includes(domain.id)}
                                                className="text-indigo-600 hover:text-indigo-900 disabled:text-gray-400 font-semibold inline-flex items-center gap-1"
                                            >
                                                <RefreshCw className={`w-4 h-4 ${checkingWhoisIds.includes(domain.id) ? 'animate-spin' : ''}`} />
                                                Cek
                                            </button>
                                            <button onClick={() => { setEditing(domain); setShowModal(true); }} className="text-blue-600 hover:text-blue-900 font-semibold inline-flex items-center gap-1">
                                                <Edit className="w-4 h-4" />
                                                Edit
                                            </button>
                                            <button onClick={() => handleDelete(domain.id)} className="text-red-600 hover:text-red-900 font-semibold inline-flex items-center gap-1">
                                                <Trash2 className="w-4 h-4" />
                                                Hapus
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && <DomainModal domain={editing} clients={clients} registrars={registrars} servers={servers} onClose={() => { setShowModal(false); setEditing(null); }} onSuccess={() => { setShowModal(false); setEditing(null); fetchData(); }} />}
            
            {showAutoAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6 border-b pb-2">
                            <h2 className="text-xl font-bold">Auto Add Domains from Orders</h2>
                            <button onClick={() => setShowAutoAddModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
                        </div>

                        {availableOrders.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <p>No completed/paid orders available to add as domains</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-600">Select orders to auto-add as client domains:</p>
                                <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
                                    {availableOrders.map((order: any) => (
                                        <div key={order.id} className="flex items-center gap-4 p-4 hover:bg-gray-50">
                                            <input
                                                type="checkbox"
                                                checked={selectedOrders.includes(order.id)}
                                                onChange={() => toggleOrderSelection(order.id)}
                                                className="rounded border-gray-300 text-blue-600"
                                            />
                                            <div className="flex-1">
                                                <div className="font-medium">{order.domainName}</div>
                                                <div className="text-sm text-gray-500">
                                                    {order.customerName} ({order.customerEmail})
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    Invoice: {order.invoiceId} • Status: {order.status} • Package: {order.package?.duration}y
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="flex gap-2 pt-4 border-t mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowAutoAddModal(false)}
                                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAutoAdd}
                                        disabled={autoAddLoading || selectedOrders.length === 0}
                                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {autoAddLoading ? 'Adding...' : `Add Selected (${selectedOrders.length})`}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function DomainModal({ domain, clients, registrars, servers, onClose, onSuccess }: { domain: Domain | null; clients: Client[]; registrars: Registrar[]; servers: any[]; onClose: () => void; onSuccess: () => void; }) {
    const [formData, setFormData] = useState({
        clientEmail: domain?.clientEmail || '',
        domainName: domain?.domainName || '',
        registrarId: domain?.registrarId || '',
        registrar: domain?.registrar || '',
        serverId: domain?.servers?.[0]?.server?.id || '', // Initialize serverId
        registeredAt: domain?.registeredAt?.split('T')[0] || '',
        expiredAt: domain?.expiredAt?.split('T')[0] || '',
        status: domain?.status || 'ACTIVE',
        autoRenew: domain?.autoRenew || false,
        notes: domain?.notes || '',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const url = domain ? `/api/admin/client-domains/${domain.id}` : '/api/admin/client-domains';
            const payload = {
                clientEmail: formData.clientEmail,
                domainName: formData.domainName,
                registrarId: formData.registrarId || null,
                serverId: formData.serverId || null,
                registeredAt: new Date(formData.registeredAt).toISOString(),
                expiredAt: new Date(formData.expiredAt).toISOString(),
                status: formData.status,
                autoRenew: formData.autoRenew,
                notes: formData.notes,
            };
            const res = await fetch(url, {
                method: domain ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (res.ok) onSuccess();
            else {
                const data = await res.json();
                alert(data.message || 'Failed to save');
            }
        } catch (error) {
            alert('Failed to save domain');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
                {/* Modal Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-bold">{domain ? 'Edit Domain' : 'Add Domain'}</h2>
                        <p className="text-sm text-blue-100 mt-1">{domain ? domain.domainName : 'New domain registration'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-blue-500 rounded-lg transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form Content */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Domain & Client */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">Domain Name *</label>
                            <input 
                                type="text" 
                                required 
                                value={formData.domainName} 
                                onChange={(e) => setFormData({ ...formData, domainName: e.target.value })} 
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                placeholder="example.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">Client *</label>
                            <select
                                required
                                value={formData.clientEmail}
                                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            >
                                <option value="">Select Client...</option>
                                {clients.map(client => (
                                    <option key={client.email} value={client.email}>
                                        {client.name} ({client.email})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Registrar & Server */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">Registrar *</label>
                            <div className="flex gap-2">
                                <select
                                    value={formData.registrarId}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setFormData({
                                            ...formData,
                                            registrarId: val,
                                            registrar: val ? e.target.options[e.target.selectedIndex].text : ''
                                        });
                                    }}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                >
                                    <option value="">Select Registrar...</option>
                                    {registrars.map((reg: any) => (
                                        <option key={reg.id} value={reg.id}>{reg.name}</option>
                                    ))}
                                </select>
                                <Link href="/admin/domain-registrars" target="_blank" className="px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-200 transition font-medium">
                                    Link
                                </Link>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">Server Name</label>
                            <div className="flex gap-2">
                                <select
                                    value={formData.serverId}
                                    onChange={(e) => setFormData({ ...formData, serverId: e.target.value })}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                >
                                    <option value="">Select Server...</option>
                                    {servers.map((server: any) => (
                                        <option key={server.id} value={server.id}>{server.serverName} ({server.ipAddress})</option>
                                    ))}
                                </select>
                                <Link href="/admin/client-servers" target="_blank" className="px-4 py-2.5 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-200 transition font-medium">
                                    🖥️
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">Registered *</label>
                            <input 
                                type="date" 
                                required 
                                value={formData.registeredAt} 
                                onChange={(e) => setFormData({ ...formData, registeredAt: e.target.value })} 
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">Expires *</label>
                            <input 
                                type="date" 
                                required 
                                value={formData.expiredAt} 
                                onChange={(e) => setFormData({ ...formData, expiredAt: e.target.value })} 
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            />
                        </div>
                    </div>

                    {/* Status & Auto Renew */}
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">Status</label>
                            <select 
                                value={formData.status} 
                                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })} 
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                            >
                                <option value="ACTIVE">Active</option>
                                <option value="EXPIRED">Expired</option>
                                <option value="PENDING">Pending</option>
                                <option value="SUSPENDED">Suspended</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer transition">
                                <input 
                                    type="checkbox" 
                                    checked={formData.autoRenew} 
                                    onChange={(e) => setFormData({ ...formData, autoRenew: e.target.checked })} 
                                    className="w-5 h-5 rounded border-gray-300 text-blue-600 cursor-pointer"
                                />
                                <span className="font-medium text-gray-900">Auto Renew</span>
                            </label>
                        </div>
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-bold text-gray-900 mb-2">Notes</label>
                        <textarea 
                            value={formData.notes} 
                            onChange={e => setFormData({ ...formData, notes: e.target.value })} 
                            rows={3} 
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                            placeholder="Add any notes about this domain..."
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-gray-200">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-bold transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={loading} 
                            className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-colors flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <span className="animate-spin">⚙</span>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    ✓ Save Domain
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}



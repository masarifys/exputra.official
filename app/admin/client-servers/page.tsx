'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import DataExportImport from '@/components/DataExportImport';

interface Client {
    email: string;
    name: string;
    company?: string;
}

interface Server {
    id: string;
    clientEmail: string;
    serverName: string;
    ipAddress: string;
    location: string;
    serverType: 'SHARED' | 'VPS' | 'DEDICATED' | 'CLOUD';
    status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE';
    expiredAt: string | null;
    username?: string;
    password?: string;
    loginUrl?: string;
    notes?: string;
    client: {
        email: string;
        name: string;
        company?: string;
    };
}

export default function ServersPage() {
    const [servers, setServers] = useState<Server[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [loading, setLoading] = useState(true);
    const [clientEmail, setClientEmail] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [selected, setSelected] = useState<string[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState<Server | null>(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (clientEmail) params.append('clientEmail', clientEmail);
            if (typeFilter) params.append('serverType', typeFilter);
            if (statusFilter) params.append('status', statusFilter);

            const [serversRes, clientsRes] = await Promise.all([
                fetch(`/api/admin/client-servers?${params}`),
                fetch('/api/admin/clients')
            ]);

            setServers(await serversRes.json());
            setClients(await clientsRes.json());
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    }, [clientEmail, typeFilter, statusFilter]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSelectAll = () => {
        setSelected(selected.length === servers.length ? [] : servers.map(s => s.id));
    };

    const handleBulkDelete = async () => {
        if (!confirm(`Delete ${selected.length} servers?`)) return;
        try {
            await fetch('/api/admin/client-servers/bulk-delete', {
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
        if (!confirm('Delete this server?')) return;
        try {
            await fetch(`/api/admin/client-servers/${id}`, { method: 'DELETE' });
            fetchData();
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const getDaysUntilExpiry = (expiredAt: string | null) => {
        if (!expiredAt) return null;
        const days = Math.ceil((new Date(expiredAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return days;
    };

    const handleImportServers = async (importedData: any[]) => {
        try {
            const response = await fetch('/api/admin/client-servers/import', {
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
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900">Server Management</h1>
                <p className="text-gray-600 mt-2">Manage client servers and hosting infrastructure</p>
            </div>

            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex gap-4 flex-1">
                        <select
                            value={clientEmail}
                            onChange={(e) => setClientEmail(e.target.value)}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Clients</option>
                            {clients.map(client => (
                                <option key={client.email} value={client.email}>
                                    {client.name} ({client.email})
                                </option>
                            ))}
                        </select>
                        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="">All Types</option>
                            <option value="SHARED">Shared</option>
                            <option value="VPS">VPS</option>
                            <option value="DEDICATED">Dedicated</option>
                            <option value="CLOUD">Cloud</option>
                        </select>
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                            <option value="">All Status</option>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                            <option value="MAINTENANCE">Maintenance</option>
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <DataExportImport
                            data={servers}
                            fileName="client_servers"
                            sheetName="Servers"
                            columns={['serverName', 'ipAddress', 'clientEmail', 'location', 'serverType', 'status', 'expiredAt']}
                            onImport={handleImportServers}
                        />
                        {selected.length > 0 && (
                            <button onClick={handleBulkDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Delete ({selected.length})</button>
                        )}
                        <Link href="/admin/client-servers/add" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                            + Add Server
                        </Link>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left"><input type="checkbox" checked={selected.length === servers.length && servers.length > 0} onChange={handleSelectAll} className="rounded border-gray-300" /></th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Server Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP Address</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={9} className="px-6 py-4 text-center text-gray-500">Loading...</td></tr>
                        ) : servers.length === 0 ? (
                            <tr><td colSpan={9} className="px-6 py-4 text-center text-gray-500">No servers found</td></tr>
                        ) : (
                            servers.map((server) => {
                                const daysLeft = getDaysUntilExpiry(server.expiredAt);
                                return (
                                    <tr key={server.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4"><input type="checkbox" checked={selected.includes(server.id)} onChange={() => setSelected(selected.includes(server.id) ? selected.filter(id => id !== server.id) : [...selected, server.id])} className="rounded border-gray-300" /></td>
                                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{server.serverName}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500 font-mono">{server.ipAddress}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <div>{server.client.name}</div>
                                            <div className="text-xs text-gray-400">{server.client.email}</div>
                                        </td>
                                        <td className="px-6 py-4"><span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">{server.serverType}</span></td>
                                        <td className="px-6 py-4 text-sm">
                                            {server.expiredAt ? (
                                                <>
                                                    <div>{new Date(server.expiredAt).toLocaleDateString()}</div>
                                                    {daysLeft !== null && daysLeft <= 30 && daysLeft > 0 && (
                                                        <div className="text-xs text-orange-600">{daysLeft} days left</div>
                                                    )}
                                                    {daysLeft !== null && daysLeft < 0 && (
                                                        <div className="text-xs text-red-600">Expired</div>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs rounded-full ${server.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                                                server.status === 'MAINTENANCE' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>{server.status}</span>
                                        </td>
                                        <td className="px-6 py-4 text-sm">
                                            <button onClick={() => { setEditing(server); setShowModal(true); }} className="text-blue-600 hover:text-blue-900 mr-3">Edit</button>
                                            <button onClick={() => handleDelete(server.id)} className="text-red-600 hover:text-red-900">Delete</button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {showModal && <ServerModal server={editing} clients={clients} onClose={() => { setShowModal(false); setEditing(null); }} onSuccess={() => { setShowModal(false); setEditing(null); fetchData(); }} />}
        </div>
    );
}

function ServerModal({ server, clients, onClose, onSuccess }: { server: Server | null; clients: Client[]; onClose: () => void; onSuccess: () => void; }) {
    const [formData, setFormData] = useState({
        clientEmail: server?.clientEmail || '',
        serverName: server?.serverName || '',
        ipAddress: server?.ipAddress || '',
        location: server?.location || '',
        serverType: server?.serverType || 'VPS',
        status: server?.status || 'ACTIVE',
        expiredAt: server?.expiredAt ? server.expiredAt.split('T')[0] : '',
        username: server?.username || '',
        password: server?.password || '',
        loginUrl: server?.loginUrl || '',
        notes: server?.notes || '',
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.clientEmail || !formData.serverName || !formData.ipAddress || !formData.location) {
            alert('Please fill in all required fields (Client, Server Name, IP, Location)');
            return;
        }

        setLoading(true);
        try {
            const url = server ? `/api/admin/client-servers/${server.id}` : '/api/admin/client-servers';
            const res = await fetch(url, {
                method: server ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...formData,
                    expiredAt: formData.expiredAt || null,
                }),
            });
            if (res.ok) onSuccess();
            else alert((await res.json()).message || 'Failed to save');
        } catch (error) {
            alert('Failed to save server');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6 border-b pb-2">
                    <h2 className="text-xl font-bold">{server ? 'Edit Server' : 'Add Server'}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Client *</label>
                            <select
                                required
                                value={formData.clientEmail}
                                onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Client</option>
                                {clients.map(c => <option key={c.email} value={c.email}>{c.name} ({c.email})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Server Name *</label>
                            <input required value={formData.serverName} onChange={e => setFormData({ ...formData, serverName: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">IP Address *</label>
                            <input required value={formData.ipAddress} onChange={e => setFormData({ ...formData, ipAddress: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                            <input required value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                            <select value={formData.serverType} onChange={e => setFormData({ ...formData, serverType: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option value="VPS">VPS</option>
                                <option value="SHARED">Shared</option>
                                <option value="DEDICATED">Dedicated</option>
                                <option value="CLOUD">Cloud</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                            <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Inactive</option>
                                <option value="MAINTENANCE">Maintenance</option>
                            </select>
                        </div>
                    </div>

                    {/* Credentials */}
                    <div className="border-t pt-2 mt-2">
                        <h3 className="text-sm font-semibold mb-2">Credentials</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-2">
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Username</label>
                                <input value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Optional" />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">Password</label>
                                <input value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Optional/Hidden" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Login URL</label>
                            <input value={formData.loginUrl} onChange={e => setFormData({ ...formData, loginUrl: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="https://..." />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Expired At</label>
                            <input type="date" value={formData.expiredAt} onChange={e => setFormData({ ...formData, expiredAt: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg" placeholder="Server details..." />
                    </div>

                    <div className="flex gap-2 justify-end pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">{loading ? 'Saving...' : 'Save Server'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

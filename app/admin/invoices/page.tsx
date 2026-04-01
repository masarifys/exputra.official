'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
    FileText, Search, Plus, Trash2, Edit, CreditCard, 
    MoreVertical, Eye, FileDown,
    TrendingUp, Clock, AlertCircle, CheckCircle2
} from 'lucide-react';
import Button from '@/components/Button';

interface Invoice {
    id: string;
    invoiceNumber: string;
    customerName: string;
    customerEmail: string;
    description: string;
    total: number;
    amountPaid: number;
    status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    paymentMethod: string;
    issueDate: string;
    dueDate: string;
    type?: 'MANUAL' | 'WEBSITE' | 'SERVICE';
}

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [stats, setStats] = useState({
        totalInvoices: 0,
        totalRevenue: 0,
        totalPending: 0,
        totalOverdue: 0
    });
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const fetchStats = useCallback(async () => {
        try {
            const res = await fetch('/api/admin/invoices?stats=true');
            if (res.ok) {
                const data = await res.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    }, []);

    const fetchInvoices = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (statusFilter) params.append('status', statusFilter);
            if (search) params.append('search', search);

            const res = await fetch(`/api/admin/invoices?${params}`);
            if (res.ok) {
                const data = await res.json();
                setInvoices(data);
            }
        } catch (error) {
            console.error('Failed to fetch invoices:', error);
        } finally {
            setLoading(false);
        }
    }, [search, statusFilter]);

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        fetchInvoices();
    }, [fetchInvoices]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'PAID':
                return 'bg-green-100 text-green-700';
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-700';
            case 'OVERDUE':
                return 'bg-red-100 text-red-700';
            case 'PARTIAL':
                return 'bg-blue-100 text-blue-700';
            case 'CANCELLED':
                return 'bg-gray-100 text-gray-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <div className="bg-blue-100 p-3 rounded-lg">
                            <FileText className="w-8 h-8 text-blue-600" />
                        </div>
                        Invoices
                    </h1>
                    <p className="text-gray-600 mt-2">Manage all your invoices and keep track of payments</p>
                </div>
                <Link href="/admin/invoices/create" className="inline-flex">
                    <Button variant="primary" size="lg" icon={<Plus className="w-5 h-5" />}>
                        Create Invoice
                    </Button>
                </Link>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg text-gray-600">
                        <FileText className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Invoices (This Month)</p>
                        <p className="text-2xl font-bold text-gray-900">{stats.totalInvoices}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-green-50 rounded-lg text-green-600">
                        <CheckCircle2 className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Paid</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalRevenue)}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-yellow-50 rounded-lg text-yellow-600">
                        <Clock className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Pending Unpaid</p>
                        <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalPending)}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                    <div className="p-4 bg-red-50 rounded-lg text-red-600">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Overdue Invoices</p>
                        <p className="text-2xl font-bold text-red-600">{stats.totalOverdue}</p>
                    </div>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex gap-4 flex-wrap items-center justify-between">
                <div className="flex gap-4 flex-wrap flex-1 items-center">
                    <div className="flex-1 min-w-64 relative">
                        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by ID, Customer Name, or Email..."
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
                        <option value="PENDING">Pending</option>
                        <option value="PAID">Paid</option>
                        <option value="PARTIAL">Partial</option>
                        <option value="OVERDUE">Overdue</option>
                        <option value="CANCELLED">Cancelled</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200 text-sm font-semibold text-gray-600 uppercase tracking-wider">
                                <th className="p-4">Invoice ID</th>
                                <th className="p-4">Customer</th>
                                <th className="p-4">Type</th>
                                <th className="p-4">Issue Date</th>
                                <th className="p-4">Total</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        Loading invoices...
                                    </td>
                                </tr>
                            ) : invoices.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">
                                        No invoices found matching your conditions.
                                    </td>
                                </tr>
                            ) : (
                                invoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-medium text-blue-600">
                                            <Link href={`/admin/invoices/${invoice.id}`}>
                                                {invoice.invoiceNumber}
                                            </Link>
                                        </td>
                                        <td className="p-4">
                                            <p className="font-bold text-gray-900">{invoice.customerName}</p>
                                            <p className="text-xs text-gray-500">{invoice.customerEmail}</p>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 text-[10px] rounded font-bold uppercase tracking-wider 
                                                ${invoice.type === 'WEBSITE' ? 'bg-blue-100 text-blue-700' : 
                                                  invoice.type === 'SERVICE' ? 'bg-purple-100 text-purple-700' : 
                                                  'bg-emerald-100 text-emerald-700'}`}>
                                                {invoice.type || 'MANUAL'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-gray-600">
                                            {new Date(invoice.issueDate).toLocaleDateString('id-ID', {
                                                day: 'numeric', month: 'short', year: 'numeric'
                                            })}
                                        </td>
                                        <td className="p-4 font-bold text-gray-900">
                                            {formatCurrency(invoice.total)}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-3 py-1 text-xs rounded-full font-bold uppercase tracking-wider ${getStatusStyle(invoice.status)}`}>
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center justify-center gap-2">
                                                <Link href={`/admin/invoices/${invoice.id}`}>
                                                    <button className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="View Detail">
                                                        <Eye className="w-5 h-5" />
                                                    </button>
                                                </Link>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Download, Filter } from 'lucide-react';

interface PaymentLog {
  id: string;
  invoiceId: string;
  type: 'INITIATED' | 'SUCCESS' | 'FAILED' | 'CANCELLED';
  amount: number;
  reference?: string;
  customerEmail: string;
  message: string;
  timestamp: string;
  source: 'WEBSITE' | 'SERVICE' | 'MANUAL';
  details?: any;
}

export default function PaymentLogsPage() {
  const [logs, setLogs] = useState<PaymentLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'SUCCESS' | 'FAILED'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();

    // Auto-refresh every 30 seconds to keep logs in sync
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchLogs = async () => {
    // Only show loading on initial fetch to avoid UI flicker during auto-refresh
    if (logs.length === 0) setLoading(true);
    try {
      const response = await fetch('/api/admin/payment-logs');
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs
    .filter(log => {
      if (filter !== 'ALL') {
        return log.type === filter;
      }
      return true;
    })
    .filter(log => 
      log.invoiceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const getStatusBadge = (type: string) => {
    const styles = {
      'SUCCESS': 'bg-green-100 text-green-800',
      'FAILED': 'bg-red-100 text-red-800',
      'INITIATED': 'bg-blue-100 text-blue-800',
      'CANCELLED': 'bg-gray-100 text-gray-800',
    };
    return styles[type as keyof typeof styles] || 'bg-gray-100 text-gray-800';
  };

  const stats = {
    total: logs.length,
    success: logs.filter(l => l.type === 'SUCCESS').length,
    failed: logs.filter(l => l.type === 'FAILED').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">💳 Payment Logs</h1>
          <p className="text-gray-600 mt-1">Monitor payment transactions and status</p>
        </div>
        <button
          onClick={fetchLogs}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <p className="text-gray-600 text-sm font-medium">Total Transactions</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-green-200 bg-green-50">
          <p className="text-green-700 text-sm font-medium">✅ Success</p>
          <p className="text-3xl font-bold text-green-600 mt-2">{stats.success}</p>
        </div>
        <div className="bg-white rounded-lg p-4 border border-red-200 bg-red-50">
          <p className="text-red-700 text-sm font-medium">❌ Failed</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{stats.failed}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 border border-gray-200 space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search by Invoice ID or Email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <div className="flex gap-2">
            {(['ALL', 'SUCCESS', 'FAILED'] as const).map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  filter === type
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading payment logs...</p>
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-600">No payment logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Invoice ID</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Source</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Message</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-700 uppercase tracking-wider whitespace-nowrap">Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">{log.invoiceId}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{log.customerEmail}</td>
                    <td className="px-6 py-4 text-sm whitespace-nowrap">
                      <span className={`px-2 py-1 text-[10px] rounded font-bold uppercase tracking-wider 
                        ${log.source === 'WEBSITE' ? 'bg-blue-100 text-blue-700' : 
                          log.source === 'SERVICE' ? 'bg-purple-100 text-purple-700' : 
                          'bg-emerald-100 text-emerald-700'}`}>
                        {log.source}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">
                      Rp {log.amount.toLocaleString('id-ID')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusBadge(log.type)}`}>
                        {log.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{log.message}</td>
                    <td className="px-6 py-4 text-sm font-mono text-blue-600">{log.reference || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          📊 Showing {filteredLogs.length} of {logs.length} payment transactions
        </p>
      </div>
    </div>
  );
}

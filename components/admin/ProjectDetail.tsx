'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle2, Clock, AlertCircle, Zap, Globe, Package as PackageIcon, BarChart3, Eye, EyeOff, Save, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

interface Order {
  id: string;
  invoiceId: string;
  domainName: string;
  customerName: string;
  customerEmail: string;
  total: number;
  status: string;
  createdAt: string;
  paidAt?: string;
  domain?: { extension: string };
  template?: { name: string };
  package?: { name: string; duration: number };
  websiteUsername?: string;
  websitePassword?: string;
  loginUrl?: string;
  websiteEmail?: string;
  notes?: string;
}

interface StatusConfig {
  bg: string;
  text: string;
  label: string;
  color: string;
}

interface ProjectDetailProps {
  order: Order;
  statusConfig: StatusConfig;
  progress: number;
  onClose: () => void;
}

const statusSteps = [
  { status: 'PENDING', label: 'Menunggu Pembayaran', icon: AlertCircle, description: 'Pesanan dibuat, tunggu pembayaran' },
  { status: 'PAID', label: 'Pembayaran Diterima', icon: CheckCircle2, description: 'Pembayaran dikonfirmasi' },
  { status: 'PROCESSING', label: 'Sedang Diproses', icon: Zap, description: 'Tim kami sedang mengerjakan' },
  { status: 'COMPLETED', label: 'Selesai', icon: CheckCircle2, description: 'Website siap digunakan' },
];

export default function ProjectDetail({
  order,
  statusConfig,
  progress,
  onClose,
}: ProjectDetailProps) {
  const [isEditingCredentials, setIsEditingCredentials] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(order.notes || '');
  const [credentials, setCredentials] = useState({
    loginUrl: order.loginUrl || '',
    websiteUsername: order.websiteUsername || '',
    websitePassword: order.websitePassword || '',
    websiteEmail: order.websiteEmail || '',
  });

  // Sync credentials whenever order changes
  useEffect(() => {
    setCredentials({
      loginUrl: order.loginUrl || '',
      websiteUsername: order.websiteUsername || '',
      websitePassword: order.websitePassword || '',
      websiteEmail: order.websiteEmail || '',
    });
    setNotes(order.notes || '');
    setIsEditingCredentials(false);
    setIsEditingNotes(false);
    setShowPassword(false);
  }, [order.id, order.loginUrl, order.notes, order.websiteEmail, order.websitePassword, order.websiteUsername]);

  const currentStatusIndex = statusSteps.findIndex(step => step.status === order.status);

  const getStatusColor = (index: number) => {
    if (index < currentStatusIndex) return 'text-green-600 bg-green-50';
    if (index === currentStatusIndex) return `${statusConfig.text} ${statusConfig.bg}`;
    return 'text-gray-400 bg-gray-50';
  };

  const saveCredentials = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (res.ok) {
        setIsEditingCredentials(false);
        alert('✓ Credentials updated successfully');
      } else {
        alert('Failed to update credentials');
      }
    } catch (error) {
      console.error('Failed to save credentials:', error);
      alert('Error saving credentials');
    } finally {
      setIsSaving(false);
    }
  };

  const saveNotes = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      if (res.ok) {
        setIsEditingNotes(false);
        alert('✓ Notes updated successfully');
      } else {
        alert('Failed to update notes');
      }
    } catch (error) {
      console.error('Failed to save notes:', error);
      alert('Error saving notes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm h-[600px] overflow-y-auto custom-scrollbar">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{order.domainName}</h2>
          <p className="text-sm text-gray-500 mt-1">{order.invoiceId}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-8">
        {/* Status Badge & Progress */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className={`px-4 py-2 rounded-full text-sm font-bold ${statusConfig.bg} ${statusConfig.text}`}>
              {statusConfig.label}
            </span>
            <span className="text-sm font-bold text-gray-900">{progress}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                backgroundColor: statusConfig.color === 'red' ? '#ef4444' : 
                                 statusConfig.color === 'yellow' ? '#eab308' :
                                 statusConfig.color === 'blue' ? '#3b82f6' :
                                 statusConfig.color === 'green' ? '#22c55e' : '#6b7280'
              }}
            />
          </div>
        </div>

        {/* Project Information */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-900 text-lg">Informasi Pesanan</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Customer</p>
              <p className="font-semibold text-gray-900">{order.customerName}</p>
              <p className="text-xs text-gray-500 mt-2">{order.customerEmail}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Total</p>
              <p className="font-semibold text-gray-900">Rp {order.total.toLocaleString('id-ID')}</p>
              <p className="text-xs text-gray-500 mt-2">Invoice #{order.invoiceId}</p>
            </div>
            {order.package && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Package</p>
                <p className="font-semibold text-gray-900">{order.package.name}</p>
                <p className="text-xs text-gray-500 mt-2">{order.package.duration} tahun</p>
              </div>
            )}
            {order.template && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Template</p>
                <p className="font-semibold text-gray-900 truncate">{order.template.name}</p>
              </div>
            )}
          </div>
        </div>

        {/* Dates */}
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-600 mb-3 font-semibold">Timeline</p>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Created:</span>
              <span className="font-semibold text-gray-900">
                {format(new Date(order.createdAt), 'd MMMM yyyy HH:mm', { locale: id })}
              </span>
            </div>
            {order.paidAt && (
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Paid:</span>
                <span className="font-semibold text-gray-900">
                  {format(new Date(order.paidAt), 'd MMMM yyyy HH:mm', { locale: id })}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Login Credentials Section */}
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Akses Website
            </h3>
            {!isEditingCredentials && (
              <button
                onClick={() => setIsEditingCredentials(true)}
                className="text-sm px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                Edit
              </button>
            )}
          </div>

          {isEditingCredentials ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Login URL</label>
                <input
                  type="text"
                  placeholder="https://example.com/admin"
                  value={credentials.loginUrl}
                  onChange={(e) => setCredentials({ ...credentials, loginUrl: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  placeholder="admin"
                  value={credentials.websiteUsername}
                  onChange={(e) => setCredentials({ ...credentials, websiteUsername: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <div className="flex gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={credentials.websitePassword}
                    onChange={(e) => setCredentials({ ...credentials, websitePassword: e.target.value })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="email@example.com"
                  value={credentials.websiteEmail}
                  onChange={(e) => setCredentials({ ...credentials, websiteEmail: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={saveCredentials}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Simpan'}
                </button>
                <button
                  onClick={() => setIsEditingCredentials(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              {credentials.loginUrl && (
                <div>
                  <p className="text-gray-600 font-medium mb-1">Login URL:</p>
                  <a
                    href={credentials.loginUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700 underline break-all"
                  >
                    {credentials.loginUrl}
                  </a>
                </div>
              )}
              {credentials.websiteUsername && (
                <div>
                  <p className="text-gray-600 font-medium mb-1">Username:</p>
                  <code className="bg-white px-3 py-1 rounded border border-green-300 font-mono break-all">
                    {credentials.websiteUsername}
                  </code>
                </div>
              )}
              {credentials.websitePassword && (
                <div>
                  <p className="text-gray-600 font-medium mb-1">Password:</p>
                  <code className="bg-white px-3 py-1 rounded border border-green-300 font-mono break-all">
                    {'•'.repeat(credentials.websitePassword.length)}
                  </code>
                </div>
              )}
              {credentials.websiteEmail && (
                <div>
                  <p className="text-gray-600 font-medium mb-1">Email:</p>
                  <a
                    href={`mailto:${credentials.websiteEmail}`}
                    className="text-green-600 hover:text-green-700 underline break-all"
                  >
                    {credentials.websiteEmail}
                  </a>
                </div>
              )}
              {!credentials.loginUrl && !credentials.websiteUsername && !credentials.websitePassword && !credentials.websiteEmail && (
                <p className="text-gray-500 italic">No credentials set yet. Click Edit to add.</p>
              )}
            </div>
          )}
        </div>

        {/* Notes Section */}
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-600" />
              Catatan Pesanan
            </h3>
            {!isEditingNotes && (
              <button
                onClick={() => setIsEditingNotes(true)}
                className="text-sm px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
              >
                Edit
              </button>
            )}
          </div>

          {isEditingNotes ? (
            <div className="space-y-3">
              <textarea
                placeholder="Tambahkan catatan untuk pesanan ini... (progress update, special requests, dll)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm font-sans"
              />
              <div className="flex gap-2">
                <button
                  onClick={saveNotes}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Simpan'}
                </button>
                <button
                  onClick={() => {
                    setIsEditingNotes(false);
                    setNotes(order.notes || '');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm">
              {notes ? (
                <p className="text-gray-700 whitespace-pre-wrap">{notes}</p>
              ) : (
                <p className="text-gray-500 italic">Belum ada catatan. Klik Edit untuk menambahkan.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

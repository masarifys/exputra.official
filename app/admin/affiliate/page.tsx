'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle, X, Loader2, Users, ClipboardList, Wallet, Settings, Link2, ShieldCheck, Eye, RefreshCw } from 'lucide-react';
import Image from 'next/image';

type ActivationRequest = {
  id: string;
  affiliateCode: string;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string | null;
  createdAt: string;
};

type AffiliateUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'ACTIVE' | 'INACTIVE';
  linkCount: number;
  clicks: number;
  conversions: number;
  revenue: number;
  totalCommission: number;
};

type CampaignLink = {
  id: string;
  code: string;
  packageName: string;
  serviceName?: string;
  customerName: string;
  isActive: boolean;
  clicks: number;
  conversions: number;
  revenue: number;
  commission: number;
  commissionPercent?: number;
};

type SyncPackageItem = {
  id: string;
  name: string;
  price: number;
  price1Year?: number | null;
  isActive: boolean;
  isPopular?: boolean;
};

type SyncServicePackageItem = {
  id: string;
  serviceId: string;
  name: string;
  price: number;
  isActive: boolean;
  sortOrder: number;
  service: {
    id: string;
    name: string;
    isActive: boolean;
  };
};

type PayoutRequest = {
  id: string;
  customer: { id: string; name: string; email: string; phone: string };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  requestedAmount: number;
  approvedAmount?: number | null;
  requestedAt: string;
};

type BankAccount = {
  id: string;
  customer: { id: string; name: string; email: string; phone: string };
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  isVerified: boolean;
  rejectionReason?: string | null;
  rejectedAt?: string | null;
  ktpImageUrl?: string | null;
};

type OverviewData = {
  dashboard: {
    totalAffiliates: number;
    totalClicks: number;
    totalConversions: number;
    totalCommission: number;
    totalRevenue: number;
    commissionPending: number;
    commissionPaid: number;
  };
  users: AffiliateUser[];
  campaignLinks: CampaignLink[];
  payouts: PayoutRequest[];
  bankAccounts: BankAccount[];
  config: {
    commissionPercent: number;
    minPayout: number;
    adminFeePercent: number;
    rules: string;
    syncedPackageIds: string[];
    syncedServicePackageIds: string[];
    packageCommissions: Record<string, number>;
    serviceCommissions: Record<string, number>;
  };
};

type SettingsForm = {
  commissionPercent: number;
  minPayout: number;
  adminFeePercent: number;
  rules: string;
  syncedPackageIds: string[];
  syncedServicePackageIds: string[];
  packageCommissions: Record<string, number>;
  serviceCommissions: Record<string, number>;
};

const initialOverview: OverviewData = {
  dashboard: {
    totalAffiliates: 0,
    totalClicks: 0,
    totalConversions: 0,
    totalCommission: 0,
    totalRevenue: 0,
    commissionPending: 0,
    commissionPaid: 0,
  },
  users: [],
  campaignLinks: [],
  payouts: [],
  bankAccounts: [],
  config: {
    commissionPercent: 10,
    minPayout: 50000,
    adminFeePercent: 0,
    rules: '',
    syncedPackageIds: [],
    syncedServicePackageIds: [],
    packageCommissions: {},
    serviceCommissions: {},
  },
};

export default function AdminAffiliatePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'activation' | 'affiliates' | 'payouts' | 'bank' | 'settings'>('overview');
  const [activationRequests, setActivationRequests] = useState<ActivationRequest[]>([]);
  const [overview, setOverview] = useState<OverviewData>(initialOverview);
  const [settingsForm, setSettingsForm] = useState<SettingsForm>(initialOverview.config);
  const [syncPackages, setSyncPackages] = useState<SyncPackageItem[]>([]);
  const [syncServicePackages, setSyncServicePackages] = useState<SyncServicePackageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [suspendModal, setSuspendModal] = useState<{ id: string; customerName: string } | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [viewLinkDetails, setViewLinkDetails] = useState<any | null>(null);
  const [loadingLinkDetails, setLoadingLinkDetails] = useState(false);

  const [viewAccountModal, setViewAccountModal] = useState<BankAccount | null>(null);
  const [ocrData, setOcrData] = useState<any>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState('');
  const [rejectNote, setRejectNote] = useState('');
  
  const [bankValidationData, setBankValidationData] = useState<any>(null);
  const [bankValidationLoading, setBankValidationLoading] = useState(false);
  const [bankValidationError, setBankValidationError] = useState('');

  const closeViewAccountModal = () => {
    setViewAccountModal(null);
    setOcrData(null);
    setOcrError('');
    setRejectNote('');
    setBankValidationData(null);
    setBankValidationError('');
  };

  const handleBankAction = async (id: string, action: 'verify' | 'reject') => {
    if (action === 'reject' && !rejectNote.trim()) {
      alert('Catatan penolakan wajib diisi');
      return;
    }

    setActionLoading(id);
    clearFeedback();

    try {
      const res = await fetch(`/api/admin/affiliate/bank-accounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, adminNote: rejectNote }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal merubah status rekening');
      }

      setMessage(action === 'verify' ? 'Rekening berhasil diverifikasi' : 'Rekening berhasil ditolak');
      await fetchAllData();
      closeViewAccountModal();
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan saat memproses data');
    } finally {
      setActionLoading(null);
    }
  };

  const handleValidateBank = async (bankCode: string, accountNumber: string, accountName: string) => {
    if (!bankCode || !accountNumber || !accountName) return;
    setBankValidationLoading(true);
    setBankValidationError('');
    setBankValidationData(null);
    try {
      const qs = new URLSearchParams({ 
        bank_code: bankCode, 
        account_number: accountNumber, 
        account_name: accountName 
      });
      const res = await fetch(`/api/admin/affiliate/validate-bank?${qs.toString()}`);
      const data = await res.json();
      if (data.is_success) {
        setBankValidationData(data.data);
      } else {
        setBankValidationError(data.message || 'Gagal memvalidasi rekening');
      }
    } catch (err: any) {
      setBankValidationError('Terjadi kesalahan saat memvalidasi API Rekening');
    } finally {
      setBankValidationLoading(false);
    }
  };

  const handleRunOCR = async (ktpUrl: string) => {
    if (!ktpUrl) return;
    setOcrLoading(true);
    setOcrError('');
    try {
      const res = await fetch('/api/admin/affiliate/ktp-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ktpUrl }),
      });
      const data = await res.json();
      if (data.is_success) {
        setOcrData(data.data);
      } else {
        setOcrError(data.message || 'Gagal mengekstrak KTP');
      }
    } catch (err: any) {
      setOcrError('Terjadi kesalahan saat memanggil OCR API');
    } finally {
      setOcrLoading(false);
    }
  };

  function getSimilarityScore(s1: string, s2: string): number {
    s1 = (s1 || '').trim().toLowerCase();
    s2 = (s2 || '').trim().toLowerCase();
    
    if (s1 === s2) return 100;
    if (!s1 || !s2) return 0;

    const costs: number[] = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) costs[j] = j;
        else {
          if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            }
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    
    const distance = costs[s2.length];
    const longerLength = Math.max(s1.length, s2.length);
    return Math.round(((longerLength - distance) / longerLength) * 100);
  }

  const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value || 0);

  const clearFeedback = () => {
    setMessage('');
    setError('');
  };

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    clearFeedback();

    try {
      const [activationRes, overviewRes, settingsRes] = await Promise.all([
        fetch('/api/admin/affiliate/activation-requests'),
        fetch('/api/admin/affiliate/overview'),
        fetch('/api/admin/affiliate/settings'),
      ]);

      const activationData = await activationRes.json();
      const overviewData = await overviewRes.json();
      const settingsData = await settingsRes.json();

      if (!activationRes.ok) {
        throw new Error(activationData.message || 'Gagal memuat request aktivasi affiliate');
      }

      if (!overviewRes.ok) {
        throw new Error(overviewData.message || 'Gagal memuat data affiliate admin');
      }

      if (!settingsRes.ok) {
        throw new Error(settingsData.message || 'Gagal memuat pengaturan affiliate');
      }

      setActivationRequests(activationData.requests || []);
      setOverview({ ...initialOverview, ...overviewData });
      setSettingsForm({
        ...initialOverview.config,
        ...(overviewData.config || {}),
        ...(settingsData.settings || {}),
      });
      setSyncPackages(settingsData.packages || []);
      setSyncServicePackages(settingsData.servicePackages || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan saat memuat data affiliate admin');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleActivationAction = async (
    id: string,
    action: 'APPROVE' | 'REJECT' | 'SUSPEND' | 'ACTIVATE',
    notes?: string
  ) => {
    setActionLoading(id);
    clearFeedback();

    try {
      const res = await fetch(`/api/admin/affiliate/activation-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal memproses approval aktivasi');
      }

      if (action === 'APPROVE') {
        setMessage('Request aktivasi berhasil disetujui.');
      } else if (action === 'REJECT') {
        setMessage('Request aktivasi berhasil ditolak.');
      } else if (action === 'SUSPEND') {
        setMessage('Affiliate berhasil disuspend.');
      } else {
        setMessage('Affiliate berhasil diaktifkan kembali.');
      }
      await fetchAllData();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan saat memproses aktivasi');
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const openSuspendModal = (id: string, customerName: string) => {
    clearFeedback();
    setSuspendReason('');
    setSuspendModal({ id, customerName });
  };

  const closeSuspendModal = () => {
    setSuspendModal(null);
    setSuspendReason('');
  };

  const handleConfirmSuspend = async () => {
    if (!suspendModal) return;

    const trimmedReason = suspendReason.trim();
    if (!trimmedReason) {
      setError('Alasan suspend wajib diisi.');
      return;
    }

    const success = await handleActivationAction(suspendModal.id, 'SUSPEND', trimmedReason);
    if (success) {
      closeSuspendModal();
    }
  };

  const handlePayoutAction = async (id: string, action: 'approve' | 'reject' | 'paid') => {
    setActionLoading(id);
    clearFeedback();

    try {
      const res = await fetch(`/api/admin/affiliate/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal memproses payout request');
      }

      setMessage('Status payout request berhasil diupdate.');
      await fetchAllData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan saat update payout');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleLink = async (id: string, isActive: boolean) => {
    setActionLoading(id);
    clearFeedback();

    try {
      const res = await fetch(`/api/admin/affiliate/links/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(data?.data?.isActive ? 'Link affiliate diaktifkan.' : 'Link affiliate dinonaktifkan.');
        await fetchAllData();
      } else {
        throw new Error(data.message || 'Gagal mengubah status link');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan saat update link');
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewLinkDetails = async (id: string) => {
    setLoadingLinkDetails(true);
    clearFeedback();
    try {
      const res = await fetch(`/api/admin/affiliate/links/${id}/details`);
      const data = await res.json();
      if (res.ok) {
        setViewLinkDetails(data);
      } else {
        throw new Error(data.message || 'Gagal memuat detail link');
      }
    } catch (e: any) {
      setError(e.message || 'Terjadi kesalahan saat memuat detail link');
    } finally {
      setLoadingLinkDetails(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    clearFeedback();

    try {
      const res = await fetch('/api/admin/affiliate/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal menyimpan pengaturan affiliate');
      }

      setMessage('Pengaturan affiliate berhasil disimpan.');
      await fetchAllData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan saat menyimpan pengaturan');
    } finally {
      setSavingSettings(false);
    }
  };

  const toggleSyncedPackage = (id: string) => {
    setSettingsForm((prev) => {
      const exists = prev.syncedPackageIds.includes(id);
      return {
        ...prev,
        syncedPackageIds: exists
          ? prev.syncedPackageIds.filter((item) => item !== id)
          : [...prev.syncedPackageIds, id],
      };
    });
  };

  const toggleSyncedServicePackage = (id: string) => {
    setSettingsForm((prev) => {
      const exists = prev.syncedServicePackageIds.includes(id);
      return {
        ...prev,
        syncedServicePackageIds: exists
          ? prev.syncedServicePackageIds.filter((item) => item !== id)
          : [...prev.syncedServicePackageIds, id],
      };
    });
  };

  const updatePackageCommission = (id: string, value: number) => {
    setSettingsForm((prev) => ({
      ...prev,
      packageCommissions: {
        ...prev.packageCommissions,
        [id]: Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : prev.commissionPercent,
      },
    }));
  };

  const updateServiceCommission = (id: string, value: number) => {
    setSettingsForm((prev) => ({
      ...prev,
      serviceCommissions: {
        ...prev.serviceCommissions,
        [id]: Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : prev.commissionPercent,
      },
    }));
  };
  
  const handleSyncAllPackages = () => {
    const allIds = syncPackages.map(pkg => pkg.id);
    setSettingsForm((prev) => ({
      ...prev,
      syncedPackageIds: allIds
    }));
  };

  const handleSyncAllServices = () => {
    const allIds = syncServicePackages.map(item => item.id);
    setSettingsForm((prev) => ({
      ...prev,
      syncedServicePackageIds: allIds
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
        <p className="text-gray-500 font-medium font-mono text-xs uppercase tracking-widest">Synchronizing Data...</p>
      </div>
    );
  }

  const pendingActivationCount = activationRequests.filter((r) => r.status === 'PENDING').length;
  const pendingPayoutCount = overview.payouts.filter((item) => item.status === 'PENDING').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Affiliate Admin Hub</h1>
        <p className="text-sm text-gray-600 mt-1">Semua menu affiliate admin sudah aktif kembali, termasuk approval request aktivasi affiliate.</p>
      </div>

      {message ? <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div> : null}
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="rounded-xl border border-gray-200 bg-white p-2 flex flex-wrap gap-2">
        <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 text-sm rounded-lg font-medium ${activeTab === 'overview' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}>
          Overview
        </button>
        <button onClick={() => setActiveTab('activation')} className={`px-4 py-2 text-sm rounded-lg font-medium flex items-center gap-2 ${activeTab === 'activation' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}>
          <ClipboardList className="w-4 h-4" />
          Approval Aktivasi
          {pendingActivationCount > 0 ? <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500 text-white">{pendingActivationCount}</span> : null}
        </button>
        <button onClick={() => setActiveTab('affiliates')} className={`px-4 py-2 text-sm rounded-lg font-medium flex items-center gap-2 ${activeTab === 'affiliates' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}>
          <Users className="w-4 h-4" />
          Affiliates & Links
        </button>
        <button onClick={() => setActiveTab('payouts')} className={`px-4 py-2 text-sm rounded-lg font-medium flex items-center gap-2 ${activeTab === 'payouts' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}>
          <Wallet className="w-4 h-4" />
          Payout Requests
          {pendingPayoutCount > 0 ? <span className="text-xs px-1.5 py-0.5 rounded-full bg-red-500 text-white">{pendingPayoutCount}</span> : null}
        </button>
        <button onClick={() => setActiveTab('bank')} className={`px-4 py-2 text-sm rounded-lg font-medium flex items-center gap-2 ${activeTab === 'bank' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}>
          <ShieldCheck className="w-4 h-4" />
          Bank Accounts
        </button>
        <button onClick={() => setActiveTab('settings')} className={`px-4 py-2 text-sm rounded-lg font-medium flex items-center gap-2 ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-700'}`}>
          <Settings className="w-4 h-4" />
          Settings
        </button>
      </div>

      {activeTab === 'overview' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500 uppercase">Total Affiliate</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{overview.dashboard.totalAffiliates}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500 uppercase">Total Klik</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{overview.dashboard.totalClicks}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500 uppercase">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(overview.dashboard.totalRevenue)}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-xs text-gray-500 uppercase">Total Komisi</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{formatCurrency(overview.dashboard.totalCommission)}</p>
          </div>
        </div>
      ) : null}

      {activeTab === 'activation' ? (
        <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Affiliate Code</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Tanggal</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {activationRequests.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{item.customer.name}</p>
                    <p className="text-xs text-gray-500">{item.customer.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{item.affiliateCode}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.status === 'APPROVED' ? 'bg-green-100 text-green-700' : item.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                    }`}>{item.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{new Date(item.createdAt).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3">
                    {item.status === 'PENDING' ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleActivationAction(item.id, 'APPROVE')} disabled={actionLoading === item.id} className="inline-flex items-center gap-1 rounded-lg bg-green-600 text-white px-3 py-1.5 text-xs hover:bg-green-700 disabled:opacity-60">
                          {actionLoading === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Approve
                        </button>
                        <button onClick={() => handleActivationAction(item.id, 'REJECT')} disabled={actionLoading === item.id} className="inline-flex items-center gap-1 rounded-lg bg-red-600 text-white px-3 py-1.5 text-xs hover:bg-red-700 disabled:opacity-60">
                          {actionLoading === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />} Reject
                        </button>
                      </div>
                    ) : item.status === 'APPROVED' ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openSuspendModal(item.id, item.customer.name)} disabled={actionLoading === item.id} className="inline-flex items-center gap-1 rounded-lg bg-amber-600 text-white px-3 py-1.5 text-xs hover:bg-amber-700 disabled:opacity-60">
                          {actionLoading === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />} Suspend
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleActivationAction(item.id, 'ACTIVATE')} disabled={actionLoading === item.id} className="inline-flex items-center gap-1 rounded-lg bg-green-600 text-white px-3 py-1.5 text-xs hover:bg-green-700 disabled:opacity-60">
                          {actionLoading === item.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Aktifkan
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {activeTab === 'affiliates' ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">Affiliate</th>
                  <th className="px-4 py-3 text-left">Link/Clicks</th>
                  <th className="px-4 py-3 text-left">Revenue</th>
                  <th className="px-4 py-3 text-left">Komisi</th>
                </tr>
              </thead>
              <tbody>
                {overview.users.map((user) => (
                  <tr key={user.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{user.linkCount} link • {user.clicks} klik</td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(user.revenue)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(user.totalCommission)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 text-left">Kode Link</th>
                  <th className="px-4 py-3 text-left">Owner</th>
                  <th className="px-4 py-3 text-left">Paket</th>
                  <th className="px-4 py-3 text-left">Statistik</th>
                  <th className="px-4 py-3 text-left">Komisi (%)</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {overview.campaignLinks.map((link) => (
                  <tr key={link.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-mono text-xs">{link.code}</td>
                    <td className="px-4 py-3 text-gray-700">{link.customerName}</td>
                    <td className="px-4 py-3 text-gray-700">
                      <p>{link.packageName}</p>
                      {link.serviceName ? <p className="text-xs text-gray-500 mt-1">Service: {link.serviceName}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{link.clicks} klik • {link.conversions} konversi</td>
                    <td className="px-4 py-3 text-gray-700">{link.commissionPercent ?? settingsForm.commissionPercent}%</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2 text-right">
                        <button 
                          onClick={() => handleViewLinkDetails(link.id)} 
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 text-blue-700 px-3 py-1.5 text-xs font-medium hover:bg-blue-100"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                        <button onClick={() => handleToggleLink(link.id, link.isActive)} disabled={actionLoading === link.id} className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium ${link.isActive ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                          {actionLoading === link.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                          {link.isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {activeTab === 'payouts' ? (
        <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">Affiliate</th>
                <th className="px-4 py-3 text-left">Nominal</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Tanggal</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {overview.payouts.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{item.customer.name}</p>
                    <p className="text-xs text-gray-500">{item.customer.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{formatCurrency(item.approvedAmount || item.requestedAmount)}</td>
                  <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full ${item.status === 'PAID' ? 'bg-green-100 text-green-700' : item.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' : item.status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{item.status}</span></td>
                  <td className="px-4 py-3 text-gray-600">{new Date(item.requestedAt).toLocaleString('id-ID')}</td>
                  <td className="px-4 py-3 text-right">
                    {item.status === 'PENDING' ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handlePayoutAction(item.id, 'approve')} disabled={actionLoading === item.id} className="rounded-lg bg-blue-600 text-white px-3 py-1.5 text-xs hover:bg-blue-700 disabled:opacity-60">Approve</button>
                        <button onClick={() => handlePayoutAction(item.id, 'reject')} disabled={actionLoading === item.id} className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-xs hover:bg-red-700 disabled:opacity-60">Reject</button>
                      </div>
                    ) : item.status === 'APPROVED' ? (
                      <button onClick={() => handlePayoutAction(item.id, 'paid')} disabled={actionLoading === item.id} className="rounded-lg bg-green-600 text-white px-3 py-1.5 text-xs hover:bg-green-700 disabled:opacity-60">Mark as Paid</button>
                    ) : <span className="text-xs text-gray-400">-</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {activeTab === 'bank' ? (
        <div className="rounded-xl border border-gray-200 bg-white overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 text-left">Affiliate</th>
                <th className="px-4 py-3 text-left">Bank</th>
                <th className="px-4 py-3 text-left">No. Rekening</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {overview.bankAccounts.map((item) => (
                <tr key={item.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{item.customer.name}</p>
                    <p className="text-xs text-gray-500">{item.customer.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{item.bankName} ({item.accountHolderName})</td>
                  <td className="px-4 py-3 font-mono text-xs">{item.accountNumber}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${item.isVerified ? 'bg-green-100 text-green-700' : item.rejectedAt || item.rejectionReason ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                      {item.isVerified ? 'VERIFIED' : item.rejectedAt || item.rejectionReason ? 'REJECTED' : 'PENDING'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => setViewAccountModal(item)} title="View Detail" className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {activeTab === 'settings' ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Affiliate Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-gray-500 uppercase">Commission (%)</label>
              <input type="number" value={settingsForm.commissionPercent} onChange={(e) => setSettingsForm((prev) => ({ ...prev, commissionPercent: Number(e.target.value || 0) }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">Min Payout</label>
              <input type="number" value={settingsForm.minPayout} onChange={(e) => setSettingsForm((prev) => ({ ...prev, minPayout: Number(e.target.value || 0) }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs text-gray-500 uppercase">Admin Fee (%)</label>
              <input type="number" value={settingsForm.adminFeePercent} onChange={(e) => setSettingsForm((prev) => ({ ...prev, adminFeePercent: Number(e.target.value || 0) }))} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 uppercase">Rules</label>
            <textarea value={settingsForm.rules} onChange={(e) => setSettingsForm((prev) => ({ ...prev, rules: e.target.value }))} rows={4} className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Sinkronisasi Paket dari /admin/packages</h3>
              <button 
                onClick={handleSyncAllPackages}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded"
              >
                <RefreshCw className="w-3 h-3" />
                Sync All Packages
              </button>
            </div>
            <p className="text-xs text-gray-500">Pilihan di sini akan tampil di tab Link Affiliate pada dashboard client.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {syncPackages.map((pkg) => {
                const checked = settingsForm.syncedPackageIds.includes(pkg.id);
                const commission = settingsForm.packageCommissions[pkg.id] ?? settingsForm.commissionPercent;

                return (
                  <div key={pkg.id} className="rounded-lg border border-gray-200 p-3">
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSyncedPackage(pkg.id)}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-medium text-gray-900">{pkg.name}</span>
                        <span className="block text-xs text-gray-500">IDR {Number(pkg.price1Year ?? pkg.price ?? 0).toLocaleString('id-ID')}</span>
                      </span>
                    </label>
                    <div className="mt-3">
                      <label className="text-xs text-gray-500 uppercase">Komisi Paket (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={commission}
                        onChange={(e) => updatePackageCommission(pkg.id, Number(e.target.value || settingsForm.commissionPercent))}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Sinkronisasi Service Package dari /admin/services</h3>
              <button 
                onClick={handleSyncAllServices}
                className="flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded"
              >
                <RefreshCw className="w-3 h-3" />
                Sync All Services
              </button>
            </div>
            <p className="text-xs text-gray-500">Data service dipakai untuk pengaturan komisi service; tidak tampil sebagai kartu paket pada tab Link Affiliate client.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
              {syncServicePackages.map((item) => {
                const checked = settingsForm.syncedServicePackageIds.includes(item.id);
                const commission = settingsForm.serviceCommissions[item.id] ?? settingsForm.commissionPercent;

                return (
                  <div key={item.id} className="rounded-lg border border-gray-200 p-3">
                    <label className="flex items-start gap-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSyncedServicePackage(item.id)}
                        className="mt-1"
                      />
                      <span>
                        <span className="block text-sm font-medium text-gray-900">{item.service.name} - {item.name}</span>
                        <span className="block text-xs text-gray-500">IDR {Number(item.price || 0).toLocaleString('id-ID')}</span>
                      </span>
                    </label>
                    <div className="mt-3">
                      <label className="text-xs text-gray-500 uppercase">Komisi Service (%)</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={commission}
                        onChange={(e) => updateServiceCommission(item.id, Number(e.target.value || settingsForm.commissionPercent))}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <button onClick={handleSaveSettings} disabled={savingSettings} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
            {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Simpan Settings
          </button>
        </div>
      ) : null}

      {suspendModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Suspend Affiliate</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Masukkan alasan suspend untuk <span className="font-semibold text-gray-800">{suspendModal.customerName}</span>.
                </p>
              </div>
              <button
                onClick={closeSuspendModal}
                disabled={actionLoading === suspendModal.id}
                className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-60"
                aria-label="Tutup modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-2">
              <label className="text-xs text-gray-500 uppercase">Alasan Suspend</label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={4}
                placeholder="Contoh: Terindikasi penyalahgunaan referral link"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeSuspendModal}
                disabled={actionLoading === suspendModal.id}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmSuspend}
                disabled={actionLoading === suspendModal.id}
                className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {actionLoading === suspendModal.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Konfirmasi Suspend
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {viewAccountModal ? (() => {
        const item = viewAccountModal;
        const matchScore = ocrData?.nama ? getSimilarityScore(ocrData.nama, item.accountHolderName) : 0;
        let matchLabel = '';
        let matchColor = '';
        if (ocrData?.nama) {
          if (matchScore >= 90) {
            matchLabel = 'High Match';
            matchColor = 'text-green-700 bg-green-100';
          } else if (matchScore >= 70) {
            matchLabel = 'Medium Match';
            matchColor = 'text-amber-700 bg-amber-100';
          } else {
            matchLabel = 'Low Match';
            matchColor = 'text-red-700 bg-red-100';
          }
        }

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white shadow-xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <h3 className="text-lg font-bold text-gray-900">Detail Rekening Affiliate</h3>
                <button onClick={closeViewAccountModal} className="p-1 rounded-lg text-gray-500 hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-4 overflow-y-auto space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 border-b pb-1 mb-2">Data Affiliate</h4>
                      <p className="text-sm"><span className="text-gray-500">Nama:</span> {item.customer.name}</p>
                      <p className="text-sm"><span className="text-gray-500">Email:</span> {item.customer.email}</p>
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 border-b pb-1 mb-2">Data Rekening</h4>
                      <p className="text-sm"><span className="text-gray-500">Bank:</span> {item.bankName}</p>
                      <p className="text-sm"><span className="text-gray-500">No. Rekening:</span> {item.accountNumber}</p>
                      <p className="text-sm"><span className="text-gray-500">Atas Nama:</span> {item.accountHolderName}</p>

                      <button 
                        onClick={() => handleValidateBank(item.bankName, item.accountNumber, item.accountHolderName)} 
                        disabled={bankValidationLoading}
                        className="mt-3 inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-60"
                      >
                        {bankValidationLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                        Jalankan Validasi Rekening
                      </button>

                      {bankValidationError ? (
                        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">{bankValidationError}</div>
                      ) : null}

                      {bankValidationData && (
                        <div className="mt-3 bg-gray-50 rounded-lg border border-gray-200 p-3 space-y-2 text-sm shadow-sm">
                           <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                             <span className="font-semibold text-gray-700">Valid:</span>
                             {bankValidationData.is_valid ? (
                               <span className="text-green-600 font-bold flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Valid</span>
                             ) : (
                               <span className="text-red-600 font-bold flex items-center gap-1"><X className="w-4 h-4" /> Invalid</span>
                             )}
                           </div>
                           <div className="flex justify-between items-center">
                             <span className="text-gray-500">Nama Rek. (API):</span>
                             <span className="font-mono font-medium text-gray-900">{bankValidationData.name || '-'}</span>
                           </div>
                           <div className="flex justify-between items-center text-xs">
                             <span className="text-gray-500">Sim. Score:</span>
                             <span className={`font-bold ${bankValidationData.score >= 7 ? 'text-green-600' : 'text-red-600'}`}>
                               {bankValidationData.score} / 10
                             </span>
                           </div>
                           {bankValidationData.note && (
                             <p className="text-xs text-gray-500 italic pt-1">{bankValidationData.note}</p>
                           )}
                        </div>
                      )}
                    </div>

                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 border-b pb-1 mb-2">Dokumen KTP</h4>
                      {item.ktpImageUrl ? (
                        <div className="mt-2">
                          <Image
                            src={item.ktpImageUrl}
                            alt="KTP"
                            width={640}
                            height={400}
                            className="w-full max-w-sm rounded-lg border border-gray-200 h-auto"
                          />
                          <button 
                            onClick={() => handleRunOCR(item.ktpImageUrl!)} 
                            disabled={ocrLoading}
                            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
                          >
                            {ocrLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Jalankan Extract OCR
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 italic">Tidak ada foto KTP yang diunggah</p>
                      )}
                      
                      {ocrError ? <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">{ocrError}</div> : null}
                    </div>
                  </div>

                  <div className="space-y-4 bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-1 mb-3">Hasil OCR KTP</h4>
                    
                    {!ocrData && !ocrLoading && (
                      <p className="text-sm text-gray-500 italic text-center py-8">Klik &quot;Jalankan Extract OCR&quot; untuk memproses gambar KTP ke dalam bentuk teks otomatis.</p>
                    )}
                    
                    {ocrLoading && (
                      <div className="flex flex-col items-center justify-center py-8 gap-2">
                         <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                         <p className="text-xs text-gray-500">Mengekstrak data KTP...</p>
                      </div>
                    )}
                    
                    {ocrData && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="bg-white rounded p-2 text-sm border border-gray-200 shadow-sm">
                            <p className="text-xs text-gray-500">Nama</p>
                            <p className="font-semibold text-gray-900">{ocrData.nama || '-'}</p>
                          </div>
                          <div className="bg-white rounded p-2 text-sm border border-gray-200 shadow-sm">
                            <p className="text-xs text-gray-500">NIK</p>
                            <p className="font-mono text-gray-900">{ocrData.nik || '-'}</p>
                          </div>
                          <div className="bg-white rounded p-2 text-sm border border-gray-200 shadow-sm">
                            <p className="text-xs text-gray-500">Tanggal Lahir</p>
                            <p className="text-gray-900">{ocrData.tanggal_lahir || '-'}</p>
                          </div>
                        </div>

                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">Matching Result</h4>
                          <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Match Score: {matchScore}%</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${matchColor}`}>{matchLabel}</span>
                            </div>
                            
                            {matchScore < 90 && (
                              <div className="bg-amber-50 rounded border border-amber-200 p-2 space-y-1">
                                <p className="text-amber-800 text-xs font-semibold flex items-center gap-1">
                                  ⚠ Possible mismatch
                                </p>
                                <p className="text-xs font-mono"><span className="text-gray-500">Nama KTP:</span> {ocrData.nama}</p>
                                <p className="text-xs font-mono"><span className="text-gray-500">Nama Rek. :</span> {item.accountHolderName}</p>
                              </div>
                            )}
                            {matchScore >= 90 && (
                              <div className="bg-green-50 rounded border border-green-200 p-2">
                                <p className="text-green-800 text-xs font-semibold flex items-center gap-1">
                                  ✅ Verification passed
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-xl space-y-3">
                 <div className="flex flex-col gap-2">
                   <label className="text-sm font-semibold text-gray-700">Catatan Penolakan (Opsional jika verify, Wajib jika menolak)</label>
                   <textarea 
                     value={rejectNote} 
                     onChange={(e) => setRejectNote(e.target.value)}
                     className="w-full text-sm rounded-lg border border-gray-300 p-2 focus:ring-red-500 focus:border-red-500" 
                     placeholder="Tulis alasan kecil (contoh: Foto buram, Nama tidak sesuai...)"
                     rows={2}
                   />
                 </div>
                 <div className="flex justify-end gap-2 pt-2">
                   <button onClick={closeViewAccountModal} className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex-1 sm:flex-none">Tutup</button>
                   <button onClick={() => handleBankAction(item.id, 'reject')} disabled={actionLoading === item.id} className="px-4 py-2 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 inline-flex items-center justify-center gap-2 flex-1 sm:flex-none">
                     {actionLoading === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                     Tolak (Reject)
                   </button>
                   {!item.isVerified && (
                     <button onClick={() => handleBankAction(item.id, 'verify')} disabled={actionLoading === item.id} className="px-4 py-2 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 inline-flex items-center justify-center gap-2 flex-1 sm:flex-none">
                       {actionLoading === item.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                       Verifikasi
                     </button>
                   )}
                 </div>
              </div>
            </div>
          </div>
        );
      })() : null}

      {suspendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900">Suspend Affiliate</h3>
            <p className="text-sm text-gray-600 mt-1">Anda akan menonaktifkan affiliate {suspendModal.customerName}. Masukkan alasan penangguhan akses.</p>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="mt-4 w-full rounded-lg border border-gray-300 p-3 text-sm min-h-[100px]"
              placeholder="Contoh: Terdeteksi manipulasi klik..."
            />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={closeSuspendModal} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">Batal</button>
              <button onClick={handleConfirmSuspend} disabled={actionLoading === suspendModal.id} className="px-5 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60">Ya, Suspend</button>
            </div>
          </div>
        </div>
      )}

      {/* Link Details Modal */}
      {(viewLinkDetails || loadingLinkDetails) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl min-h-[60vh] max-h-[90vh] flex flex-col relative my-8 shadow-2xl">
            <button 
              onClick={() => setViewLinkDetails(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 z-10 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {loadingLinkDetails ? (
              <div className="flex-1 flex flex-col items-center justify-center p-12 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <p className="text-gray-500 font-medium">Memuat detail link affiliate...</p>
              </div>
            ) : viewLinkDetails ? (
              <>
                <div className="p-6 border-b border-gray-100 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                      <Link2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Detail Affiliate Link: {viewLinkDetails.link.code}</h3>
                      <p className="text-sm text-gray-500">
                        {viewLinkDetails.type === 'package' ? 'Paket Website' : 'Layanan'} • {viewLinkDetails.link.packageName}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <p className="text-[10px] uppercase text-gray-500 font-bold tracking-widest">Afiliasi Owner</p>
                      <p className="font-bold text-gray-900 mt-1">{viewLinkDetails.link.owner}</p>
                      <p className="text-xs text-gray-500">{viewLinkDetails.link.ownerEmail}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                      <p className="text-[10px] uppercase text-gray-500 font-bold tracking-widest">Statistik Link</p>
                      <p className="font-bold text-gray-900 mt-1">
                        {viewLinkDetails.visits.length} Kunjungan • {viewLinkDetails.conversions.length} Konversi
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar">
                  {/* Visitor Tracking Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-base font-bold text-gray-900 flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-indigo-600" /> Histori Pengunjung (IP & Device)
                      </h4>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
                        Menampilkan {viewLinkDetails.visits.length} data terakhir
                      </span>
                    </div>

                    {viewLinkDetails.visits.length === 0 ? (
                      <p className="text-sm text-gray-500 bg-gray-50 p-6 rounded-2xl text-center border border-dashed border-gray-200 italic">Belum ada data kunjungan yang tercatat.</p>
                    ) : (
                      <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <table className="min-w-full text-sm divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-5 py-3 text-left font-bold text-gray-700">Waktu</th>
                              <th className="px-5 py-3 text-left font-bold text-gray-700">IP Address</th>
                              <th className="px-5 py-3 text-left font-bold text-gray-700">Browser / Link Ref</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {viewLinkDetails.visits.map((visit: any) => (
                              <tr key={visit.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-5 py-3 text-gray-600 whitespace-nowrap">
                                  {new Date(visit.createdAt).toLocaleString('id-ID', {
                                    day: '2-digit', month: '2-digit', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                  })}
                                </td>
                                <td className="px-5 py-3">
                                  <span className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 font-bold">
                                    {visit.ipAddress}
                                  </span>
                                </td>
                                <td className="px-5 py-3">
                                  <p className="text-xs text-gray-600 font-medium truncate max-w-[300px]" title={visit.userAgent}>
                                    {visit.userAgent}
                                  </p>
                                  {visit.referrer && visit.referrer !== 'direct' && (
                                    <p className="text-[10px] text-gray-400 mt-1 truncate max-w-[300px]">
                                      Ref: <span className="hover:text-blue-500 underline cursor-help">{visit.referrer}</span>
                                    </p>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Conversions Section */}
                  <div className="pb-4">
                    <h4 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                       <CheckCircle className="w-5 h-5 text-green-600" /> User Berhasil Mendaftar & Tagihan
                    </h4>
                    {viewLinkDetails.conversions.length === 0 ? (
                      <p className="text-sm text-gray-500 bg-gray-50 p-6 rounded-2xl text-center border border-dashed border-gray-200 italic">Belum ada user yang berhasil mendaftar melalui link ini.</p>
                    ) : (
                      <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                        <table className="min-w-full text-sm divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-5 py-3 text-left font-bold text-gray-700">Customer</th>
                              <th className="px-5 py-3 text-left font-bold text-gray-700">No. Invoice</th>
                              <th className="px-5 py-3 text-left font-bold text-gray-700">Nominal</th>
                              <th className="px-5 py-3 text-left font-bold text-gray-700">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {viewLinkDetails.conversions.map((conv: any) => (
                              <tr key={conv.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-5 py-3">
                                  <p className="font-bold text-gray-900">{conv.customerName}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">{conv.customerEmail}</p>
                                </td>
                                <td className="px-5 py-3">
                                  <Link 
                                    href={`/admin/invoices/${conv.id}`}
                                    className="font-mono text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded hover:bg-blue-100 transition-colors border border-blue-100"
                                    title="Klik untuk detail invoice"
                                  >
                                    {conv.invoiceId}
                                  </Link>
                                </td>
                                <td className="px-5 py-3 font-bold text-gray-900">{formatCurrency(conv.total)}</td>
                                <td className="px-5 py-3">
                                  <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-full ring-1 ring-inset ${
                                    conv.status === 'PAID' 
                                      ? 'bg-green-50 text-green-700 ring-green-600/20' 
                                      : 'bg-amber-50 text-amber-700 ring-amber-600/20'
                                  }`}>
                                    {conv.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : null}

            <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-2xl flex-shrink-0">
              <button 
                onClick={() => setViewLinkDetails(null)}
                className="w-full px-6 py-3 rounded-xl border border-gray-300 text-sm font-bold text-gray-700 bg-white hover:bg-gray-50 transition-all shadow-sm active:scale-[0.98]"
              >
                Tutup Detail Affiliate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

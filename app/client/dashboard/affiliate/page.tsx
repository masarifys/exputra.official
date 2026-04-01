'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, Link2, Loader2, Wallet, Upload, ShieldCheck, CheckCircle, X } from 'lucide-react';

type AffiliatePackage = {
  id: string;
  name: string;
  price: number;
  price1Year?: number | null;
  isPopular?: boolean;
  discountBadge?: string | null;
  estimatedCommission?: number;
};

type AffiliateServicePackage = {
  id: string;
  name: string;
  price: number;
  estimatedCommission?: number;
  service: {
    id: string;
    name: string;
  };
};

type AffiliateLink = {
  id: string;
  linkType: 'PACKAGE' | 'SERVICE';
  code: string;
  packageId?: string | null;
  servicePackageId?: string | null;
  serviceName?: string | null;
  packageName: string;
  isActive: boolean;
  clicks: number;
  conversions: number;
  paidOrders: number;
  revenue: number;
  commission: number;
  commissionPercent: number;
  shareUrl: string;
  createdAt: string;
};

type AffiliateWallet = {
  totalCommission: number;
  reservedBalance: number;
  availableBalance: number;
};

type AffiliateBankAccount = {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  branch?: string | null;
  ktpImageUrl?: string | null;
  isVerified: boolean;
  verifiedAt?: string | null;
  rejectedAt?: string | null;
  rejectionReason?: string | null;
};

type AffiliatePayout = {
  id: string;
  requestedAmount: number;
  approvedAmount?: number | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  customerNote?: string | null;
  adminNote?: string | null;
  requestedAt: string;
  reviewedAt?: string | null;
  paidAt?: string | null;
};

type AffiliateResponse = {
  packages: AffiliatePackage[];
  servicePackages: AffiliateServicePackage[];
  links: AffiliateLink[];
  syncInfo?: {
    packageCount: number;
    servicePackageCount: number;
  };
  wallet: AffiliateWallet;
  bankAccount: AffiliateBankAccount | null;
  payoutRequests: AffiliatePayout[];
};

type AffiliateActivationRequest = {
  id: string;
  affiliateCode: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};

type AffiliateActivationResponse = {
  isActive: boolean;
  request: AffiliateActivationRequest | null;
};

export default function ClientAffiliatePage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'links' | 'payouts' | 'rekening'>('overview');
  const [activationLoading, setActivationLoading] = useState(true);
  const [requestingActivation, setRequestingActivation] = useState(false);
  const [isAffiliateActive, setIsAffiliateActive] = useState(false);
  const [activationRequest, setActivationRequest] = useState<AffiliateActivationRequest | null>(null);

  const [packages, setPackages] = useState<AffiliatePackage[]>([]);
  const [servicePackages, setServicePackages] = useState<AffiliateServicePackage[]>([]);
  const [links, setLinks] = useState<AffiliateLink[]>([]);
  const [wallet, setWallet] = useState<AffiliateWallet>({
    totalCommission: 0,
    reservedBalance: 0,
    availableBalance: 0,
  });
  const [bankAccount, setBankAccount] = useState<AffiliateBankAccount | null>(null);
  const [payoutRequests, setPayoutRequests] = useState<AffiliatePayout[]>([]);
  const [syncInfo, setSyncInfo] = useState<{ packageCount: number; servicePackageCount: number }>({
    packageCount: 0,
    servicePackageCount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [creatingLinkPackageId, setCreatingLinkPackageId] = useState('');
  const [savingBank, setSavingBank] = useState(false);
  const [requestingPayout, setRequestingPayout] = useState(false);
  const [uploadingKtp, setUploadingKtp] = useState(false);
  const [message, setMessage] = useState('');
  
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [error, setError] = useState('');
  const [linkSearch, setLinkSearch] = useState('');
  const [linkSort, setLinkSort] = useState<'latest' | 'commission-desc' | 'click-desc'>('latest');
  const [payoutStatusFilter, setPayoutStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID'>('ALL');
  const [payoutSort, setPayoutSort] = useState<'latest' | 'amount-desc'>('latest');

  const [bankForm, setBankForm] = useState({
    bankName: '',
    accountNumber: '',
    accountHolderName: '',
    branch: '',
    ktpImageUrl: '',
  });

  const [payoutForm, setPayoutForm] = useState({
    amount: '',
    customerNote: '',
  });

  const [banks, setBanks] = useState<{bank_name: string, bank_code: string}[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(false);

  useEffect(() => {
    if (activeTab === 'rekening' && banks.length === 0) {
      setLoadingBanks(true);
      fetch('/api/client/banks')
        .then(res => res.json())
        .then(data => {
          if (data?.data?.banks) {
            setBanks(data.data.banks);
          }
        })
        .finally(() => setLoadingBanks(false));
    }
  }, [activeTab, banks.length]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const resetFeedback = () => {
    setMessage('');
    setError('');
  };

  const fetchActivationStatus = async () => {
    setActivationLoading(true);

    try {
      const res = await fetch('/api/client/affiliate/activation');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal memuat status aktivasi affiliate');
      }

      const typed = data as AffiliateActivationResponse;
      setIsAffiliateActive(Boolean(typed.isActive));
      setActivationRequest(typed.request || null);

      if (typed.isActive) {
        await fetchAffiliateData();
      } else {
        setLoading(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan saat memuat status aktivasi');
      setLoading(false);
    } finally {
      setActivationLoading(false);
    }
  };

  const fetchAffiliateData = async () => {
    setLoading(true);
    resetFeedback();

    try {
      const res = await fetch('/api/client/affiliate/links');
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal memuat dashboard affiliate');
      }

      const typed = data as AffiliateResponse;
      setPackages(typed.packages || []);
      setServicePackages(typed.servicePackages || []);
      setLinks(typed.links || []);
      setWallet(
        typed.wallet || {
          totalCommission: 0,
          reservedBalance: 0,
          availableBalance: 0,
        }
      );
      setBankAccount(typed.bankAccount || null);
      setPayoutRequests(typed.payoutRequests || []);
      setSyncInfo(typed.syncInfo || { packageCount: 0, servicePackageCount: 0 });

      if (typed.bankAccount) {
        setBankForm({
          bankName: typed.bankAccount.bankName || '',
          accountNumber: typed.bankAccount.accountNumber || '',
          accountHolderName: typed.bankAccount.accountHolderName || '',
          branch: typed.bankAccount.branch || '',
          ktpImageUrl: typed.bankAccount.ktpImageUrl || '',
        });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivationStatus();
  }, []);

  const handleRequestActivation = async () => {
    resetFeedback();
    setRequestingActivation(true);

    try {
      const res = await fetch('/api/client/affiliate/activation', {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal mengirim request aktivasi affiliate');
      }

      setMessage(data.message || 'Request aktivasi affiliate berhasil dikirim.');
      await fetchActivationStatus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan saat request aktivasi');
    } finally {
      setRequestingActivation(false);
    }
  };

  const filteredLinks = useMemo(() => {
    const keyword = linkSearch.trim().toLowerCase();
    const base = links.filter((item) => {
      if (!keyword) return true;
      return (
        item.packageName.toLowerCase().includes(keyword) ||
        (item.serviceName || '').toLowerCase().includes(keyword) ||
        item.code.toLowerCase().includes(keyword) ||
        item.shareUrl.toLowerCase().includes(keyword)
      );
    });

    const sorted = [...base];
    if (linkSort === 'commission-desc') {
      sorted.sort((a, b) => b.commission - a.commission);
    } else if (linkSort === 'click-desc') {
      sorted.sort((a, b) => b.clicks - a.clicks);
    } else {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return sorted;
  }, [links, linkSearch, linkSort]);

  const filteredPayouts = useMemo(() => {
    const base = payoutRequests.filter((item) => {
      if (payoutStatusFilter === 'ALL') return true;
      return item.status === payoutStatusFilter;
    });

    const sorted = [...base];
    if (payoutSort === 'amount-desc') {
      sorted.sort((a, b) => (b.approvedAmount || b.requestedAmount) - (a.approvedAmount || a.requestedAmount));
    } else {
      sorted.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());
    }
    return sorted;
  }, [payoutRequests, payoutStatusFilter, payoutSort]);

  const handleCreateLink = async (payload: { packageId?: string; servicePackageId?: string; label: string }) => {
    resetFeedback();
    const createKey = payload.packageId || payload.servicePackageId || '';
    setCreatingLinkPackageId(createKey);

    try {
      const res = await fetch('/api/client/affiliate/links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal membuat link affiliate');
      }

      setMessage(`Link affiliate untuk ${data?.link?.packageName || payload.label} berhasil dibuat.`);
      await fetchAffiliateData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan saat membuat link affiliate');
    } finally {
      setCreatingLinkPackageId('');
    }
  };

  const handleCopy = async (text: string) => {
    resetFeedback();

    try {
      await navigator.clipboard.writeText(text);
      setMessage('Link berhasil disalin ke clipboard.');
    } catch {
      setError('Gagal menyalin link.');
    }
  };

  const handleUploadKtp = async (file: File) => {
    resetFeedback();
    setUploadingKtp(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/client/affiliate/upload-ktp', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setBankForm((prev) => ({ ...prev, ktpImageUrl: data.url || '' }));
        setMessage('Upload KTP berhasil. Jangan lupa simpan data rekening.');
      } else {
        throw new Error(data.message || 'Upload KTP gagal');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan saat upload KTP');
    } finally {
      setUploadingKtp(false);
    }
  };

  const handleSaveBankAccount = async () => {
    if (!bankForm.bankName || !bankForm.accountNumber || !bankForm.accountHolderName || !bankForm.ktpImageUrl) {
      setError('Form rekening dan lampiran KTP wajib dilengkapi');
      return;
    }

    setSavingBank(true);

    try {
      const res = await fetch('/api/client/affiliate/bank-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bankForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal menyimpan rekening affiliate');
      }

      setMessage(data.message || 'Rekening affiliate tersimpan.');
      resetFeedback();
      setIsEditingBank(false);
      await fetchAffiliateData();
    } catch (e: any) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan saat menyimpan rekening');
    } finally {
      setSavingBank(false);
    }
  };

  const handleRequestPayout = async () => {
    resetFeedback();

    const amount = Number(payoutForm.amount || 0);

    if (!amount || amount <= 0) {
      setError('Nominal payout harus lebih dari 0.');
      return;
    }

    if (!bankForm.bankName || !bankForm.accountNumber || !bankForm.accountHolderName) {
      setError('Data rekening harus diisi terlebih dahulu sebelum request payout.');
      return;
    }

    setRequestingPayout(true);

    try {
      const res = await fetch('/api/client/affiliate/payouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          customerNote: payoutForm.customerNote,
          bankName: bankForm.bankName,
          accountNumber: bankForm.accountNumber,
          accountHolderName: bankForm.accountHolderName,
          branch: bankForm.branch,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Gagal mengirim request payout');
      }

      setMessage(data.message || 'Request payout berhasil dikirim.');
      setPayoutForm({ amount: '', customerNote: '' });
      await fetchAffiliateData();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Terjadi kesalahan saat request payout');
    } finally {
      setRequestingPayout(false);
    }
  };

  if (activationLoading || loading) {
    return (
      <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat dashboard affiliate...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Affiliate Dashboard</h1>
        <p className="text-sm text-gray-600 mt-1">Kelola link affiliate, saldo komisi, data rekening, dan request payout Anda.</p>
      </div>

      {!isAffiliateActive ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 space-y-4">
          <h2 className="text-lg font-bold text-amber-900">Aktivasi Affiliate Diperlukan</h2>
          <p className="text-sm text-amber-800">
            Semua menu di halaman affiliate akan aktif setelah admin menyetujui request aktivasi Anda.
          </p>

          {activationRequest ? (
            <div className="rounded-lg border border-amber-200 bg-white p-4 text-sm text-gray-700 space-y-1">
              <p>
                Status request: <span className={`font-semibold ${
                  activationRequest.status === 'APPROVED'
                    ? 'text-green-700'
                    : activationRequest.status === 'REJECTED'
                      ? 'text-red-700'
                      : 'text-amber-700'
                }`}>{activationRequest.status}</span>
              </p>
              <p>Kode affiliate: {activationRequest.affiliateCode}</p>
              <p>Diajukan: {new Date(activationRequest.createdAt).toLocaleString('id-ID')}</p>
              {activationRequest.notes ? <p>Catatan admin: {activationRequest.notes}</p> : null}
            </div>
          ) : (
            <p className="text-sm text-amber-800">Belum ada request aktivasi affiliate dari akun Anda.</p>
          )}

          {activationRequest?.status !== 'PENDING' ? (
            <button
              onClick={handleRequestActivation}
              disabled={requestingActivation}
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-amber-700 disabled:opacity-60"
            >
              {requestingActivation ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {activationRequest?.status === 'REJECTED' ? 'Ajukan Ulang Aktivasi' : 'Request Aktivasi Affiliate'}
            </button>
          ) : null}
        </div>
      ) : null}

      {isAffiliateActive ? (
        <>

      <div className="rounded-xl border border-gray-200 bg-white p-2 flex flex-wrap gap-2">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'links', label: 'Link Affiliate' },
          { id: 'payouts', label: 'Payout' },
          { id: 'rekening', label: 'Rekening' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'overview' | 'links' | 'payouts' | 'rekening')}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-colors ${
              activeTab === tab.id ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message ? <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{message}</div> : null}
      {error ? <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {activeTab === 'overview' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Total Komisi</p>
              <p className="text-xl font-bold text-gray-900 mt-2">{formatCurrency(wallet.totalCommission)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Dana Telah Di Cairkan</p>
              <p className="text-xl font-bold text-gray-900 mt-2">{formatCurrency(wallet.reservedBalance)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Saldo Bisa Ditarik</p>
              <p className="text-xl font-bold text-green-700 mt-2 flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                {formatCurrency(wallet.availableBalance)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Total Link</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{links.length}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Total Klik</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{links.reduce((sum, item) => sum + item.clicks, 0)}</p>
            </div>
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500">Payout Pending</p>
              <p className="text-2xl font-bold text-amber-700 mt-2">{payoutRequests.filter((item) => item.status === 'PENDING').length}</p>
            </div>
          </div>
        </>
      ) : null}

      {activeTab === 'links' ? (
        <>
          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-bold text-gray-900">Buat Link Affiliate per Paket</h2>
            <p className="text-sm text-gray-600 mt-1">Pilih paket, generate link, lalu bagikan ke calon customer.</p>

            {packages.length === 0 ? (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                Belum ada paket affiliate yang diaktifkan admin. Paket akan muncul di sini setelah dicentang pada pengaturan affiliate admin.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
                {packages.map((pkg) => {
                  const hasLink = links.some((item) => item.packageId === pkg.id);

                  return (
                    <div key={pkg.id} className="rounded-lg border border-gray-200 p-4">
                      <p className="font-semibold text-gray-900">{pkg.name}</p>
                      <div className="flex flex-col mt-1">
                        <p className="text-sm text-gray-500">{formatCurrency((pkg.price1Year || pkg.price) || 0)}</p>
                        {pkg.estimatedCommission ? (
                          <p className="text-xs font-bold text-green-600 mt-0.5">
                            Estimasi Komisi: {formatCurrency(pkg.estimatedCommission)}
                          </p>
                        ) : null}
                      </div>
                      {pkg.discountBadge ? <p className="text-xs text-cyan-700 mt-1">{pkg.discountBadge}</p> : null}

                      <button
                        onClick={() => handleCreateLink({ packageId: pkg.id, label: pkg.name })}
                        disabled={creatingLinkPackageId === pkg.id}
                        className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white px-3 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
                      >
                        {creatingLinkPackageId === pkg.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                        {hasLink ? 'Generate Ulang / Ambil Link' : 'Generate Link'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900">Link Affiliate untuk Paket Website</h3>
              {servicePackages.length === 0 ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Belum ada paket website affiliate yang diaktifkan admin.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-3">
                  {servicePackages.map((item) => {
                    const hasLink = links.some((link) => link.linkType === 'SERVICE' && link.servicePackageId === item.id);
                    const cardKey = item.id;
                    return (
                      <div key={item.id} className="rounded-lg border border-gray-200 p-4">
                        <p className="text-xs text-gray-500 uppercase">{item.service.name}</p>
                        <p className="font-semibold text-gray-900 mt-1">{item.name}</p>
                        <div className="flex flex-col mt-1">
                          <p className="text-sm text-gray-500">{formatCurrency(item.price || 0)}</p>
                          {item.estimatedCommission ? (
                            <p className="text-xs font-bold text-green-600 mt-0.5">
                              Estimasi Komisi: {formatCurrency(item.estimatedCommission)}
                            </p>
                          ) : null}
                        </div>

                        <button
                          onClick={() => handleCreateLink({ servicePackageId: item.id, label: `${item.service.name} - ${item.name}` })}
                          disabled={creatingLinkPackageId === cardKey}
                          className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 text-white px-3 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-60"
                        >
                          {creatingLinkPackageId === cardKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                          {hasLink ? 'Generate Ulang / Ambil Link' : 'Generate Link'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900">Daftar Link Affiliate Anda</h2>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={linkSearch}
                  onChange={(e) => setLinkSearch(e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Cari package/code/link"
                />
                <select
                  value={linkSort}
                  onChange={(e) => setLinkSort(e.target.value as 'latest' | 'commission-desc' | 'click-desc')}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="latest">Urut: Terbaru</option>
                  <option value="commission-desc">Urut: Komisi Tertinggi</option>
                  <option value="click-desc">Urut: Klik Tertinggi</option>
                </select>
              </div>
            </div>

            {filteredLinks.length === 0 ? (
              <p className="text-sm text-gray-500 mt-3">Belum ada data link sesuai filter.</p>
            ) : (
              <div className="space-y-3 mt-4">
                {filteredLinks.map((item) => (
                  <div key={item.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                      <div>
                        <p className="font-semibold text-gray-900">{item.packageName}</p>
                        {item.serviceName ? <p className="text-xs text-gray-500 mt-1">Service: {item.serviceName}</p> : null}
                        <p className="text-xs text-gray-500 mt-1">Code: {item.code}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Klik: <span className="font-bold text-gray-900">{item.clicks}</span> • 
                          Konversi: <span className="font-bold text-gray-900">{item.conversions}</span> • 
                          Total Komisi: <span className="font-bold text-gray-900">{formatCurrency(item.commission)}</span>
                        </p>
                        <p className="text-xs font-bold text-green-600 mt-1">
                          Komisi / Transaksi: {formatCurrency(Math.round(item.commission / (item.conversions || 1)) || (item.commissionPercent ? Math.round((item.revenue / (item.conversions || 1)) * item.commissionPercent / 100) : 0))}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleCopy(item.shareUrl)}
                          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          <Copy className="w-4 h-4" />
                          Copy Link
                        </button>
                        <a
                          href={item.shareUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
                        >
                          <Link2 className="w-4 h-4" />
                          Buka
                        </a>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mt-2 break-all">{item.shareUrl}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}

      {activeTab === 'payouts' ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900">Request Payout</h2>
            <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
              <span className="text-xs font-medium text-green-700">Saldo Bisa Ditarik:</span>
              <span className="text-sm font-bold text-green-800">{formatCurrency(wallet.availableBalance)}</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-700">Nominal (IDR)</label>
              <button 
                type="button"
                onClick={() => setPayoutForm(prev => ({ ...prev, amount: wallet.availableBalance.toString() }))}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Tarik Semua
              </button>
            </div>
            <input
              type="number"
              value={payoutForm.amount}
              onChange={(e) => setPayoutForm((prev) => ({ ...prev, amount: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="Contoh: 150000"
            />
          </div>

          <div>
            <label className="text-sm text-gray-700">Catatan (opsional)</label>
            <textarea
              value={payoutForm.customerNote}
              onChange={(e) => setPayoutForm((prev) => ({ ...prev, customerNote: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={3}
              placeholder="Catatan untuk admin"
            />
          </div>

          <button
            onClick={handleRequestPayout}
            disabled={requestingPayout}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 text-white px-4 py-2.5 text-sm font-medium hover:bg-black disabled:opacity-60"
          >
            {requestingPayout ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
            Kirim Request Payout
          </button>

          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Riwayat Payout</h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={payoutStatusFilter}
                  onChange={(e) => setPayoutStatusFilter(e.target.value as 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID')}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="PENDING">PENDING</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="PAID">PAID</option>
                </select>
                <select
                  value={payoutSort}
                  onChange={(e) => setPayoutSort(e.target.value as 'latest' | 'amount-desc')}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="latest">Urut: Terbaru</option>
                  <option value="amount-desc">Urut: Nominal Tertinggi</option>
                </select>
              </div>
            </div>

            {filteredPayouts.length === 0 ? (
              <p className="text-sm text-gray-500">Belum ada request payout sesuai filter.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-auto pr-1">
                {filteredPayouts.map((item) => (
                  <div key={item.id} className="rounded-lg border border-gray-200 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-gray-900">{formatCurrency(item.approvedAmount || item.requestedAmount)}</p>
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${
                          item.status === 'PAID'
                            ? 'bg-green-100 text-green-700'
                            : item.status === 'APPROVED'
                              ? 'bg-blue-100 text-blue-700'
                              : item.status === 'REJECTED'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Request: {new Date(item.requestedAt).toLocaleString('id-ID')}</p>
                    {item.customerNote ? <p className="text-xs text-gray-600 mt-1">Catatan: {item.customerNote}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {activeTab === 'rekening' ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
             <h2 className="text-lg font-bold text-gray-900">Data Rekening Affiliate</h2>
             {bankAccount?.isVerified && !isEditingBank && (
               <button 
                 onClick={() => setIsEditingBank(true)}
                 className="text-sm px-3 py-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 rounded-lg font-medium border border-gray-200"
               >
                 Edit Data / Ajukan Ulang
               </button>
             )}
          </div>
          
          {bankAccount?.isVerified && !isEditingBank && (
            <div className="bg-green-50 border border-green-200 text-green-800 p-3 rounded-xl text-sm mb-4">
              Rekening Anda telah diverifikasi. Untuk mengubah data, silakan klik tombol Edit Data di atas. Perubahan data akan membuat status Anda kembali ke Menunggu Verifikasi.
            </div>
          )}
          
          {bankAccount?.rejectedAt ? (
             <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-sm">
                <h3 className="font-bold text-red-800 flex items-center gap-1"><X className="w-5 h-5"/> Rekening Ditolak / Perlu Perbaikan</h3>
                <p className="text-red-700 mt-1">Alasan penolakan: <span className="font-semibold">{bankAccount.rejectionReason || 'Data tidak sesuai'}</span></p>
                <p className="text-red-600 mt-2">Silakan perbaiki data Bank atau unggah ulang dokumen KTP yang lebih jelas, lalu tekan Simpan Data Rekening kembali untuk ditinjau ulang oleh admin.</p>
             </div>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {banks.length === 0 && !loadingBanks ? (
              <input
                value={bankForm.bankName}
                onChange={(e) => setBankForm((prev) => ({ ...prev, bankName: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500"
                placeholder="Nama bank *"
                disabled={bankAccount?.isVerified && !isEditingBank}
              />
            ) : (
              <select
                value={bankForm.bankName}
                onChange={(e) => setBankForm((prev) => ({ ...prev, bankName: e.target.value }))}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white disabled:bg-gray-50 disabled:text-gray-500"
                disabled={bankAccount?.isVerified && !isEditingBank}
              >
                <option value="" disabled>Pilih Nama Bank *</option>
                {loadingBanks ? (
                  <option disabled>Memuat bank...</option>
                ) : (
                  <>
                    {banks.map(bank => (
                      <option key={bank.bank_code} value={bank.bank_name}>
                        {bank.bank_name.toUpperCase()}
                      </option>
                    ))}
                    {bankForm.bankName && !banks.some(b => b.bank_name === bankForm.bankName) && (
                      <option value={bankForm.bankName}>{bankForm.bankName.toUpperCase()}</option>
                    )}
                  </>
                )}
              </select>
            )}
            <input
              value={bankForm.accountNumber}
              onChange={(e) => setBankForm((prev) => ({ ...prev, accountNumber: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="Nomor rekening *"
              disabled={bankAccount?.isVerified && !isEditingBank}
            />
            <input
              value={bankForm.accountHolderName}
              onChange={(e) => setBankForm((prev) => ({ ...prev, accountHolderName: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="Nama pemilik rekening *"
              disabled={bankAccount?.isVerified && !isEditingBank}
            />
            <input
              value={bankForm.branch}
              onChange={(e) => setBankForm((prev) => ({ ...prev, branch: e.target.value }))}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500"
              placeholder="Cabang (opsional)"
              disabled={bankAccount?.isVerified && !isEditingBank}
            />
          </div>

          <div className="rounded-lg border border-dashed border-gray-300 p-3 pt-5">
            <label className="text-sm font-medium text-gray-700">Upload KTP (jpg/png, max 2MB) *</label>
            <div className="mt-2 flex flex-col sm:flex-row gap-2">
              {(!bankAccount?.isVerified || isEditingBank) && (
                 <input
                   type="file"
                   accept="image/jpeg,image/png"
                   onChange={(e) => {
                     const file = e.target.files?.[0];
                     if (file) handleUploadKtp(file);
                   }}
                   className="text-sm"
                 />
              )}
              {(!bankAccount?.isVerified || isEditingBank) && (
                 <button
                   type="button"
                   disabled={uploadingKtp}
                   className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                 >
                   {uploadingKtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                   {uploadingKtp ? 'Uploading...' : 'Pilih File'}
                 </button>
              )}
            </div>
            {bankForm.ktpImageUrl ? (
              <a href={bankForm.ktpImageUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 mt-2 inline-block font-medium hover:underline">
                Lihat file KTP saat ini
              </a>
            ) : null}
          </div>

          {(!bankAccount?.isVerified || isEditingBank) && (
             <button
               onClick={handleSaveBankAccount}
               disabled={savingBank}
               className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
             >
               {savingBank ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
               Simpan Data Rekening
             </button>
          )}

          {bankAccount ? (
            <div className={`text-xs rounded-lg border p-3 ${bankAccount.rejectedAt ? 'bg-red-50 border-red-200 text-red-700' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
              <p>Status verifikasi: <span className={bankAccount.isVerified ? 'text-green-700 font-semibold' : bankAccount.rejectedAt ? 'text-red-700 font-bold' : 'text-amber-700 font-semibold'}>{bankAccount.isVerified ? 'Terverifikasi' : bankAccount.rejectedAt ? 'Ditolak / Perlu Revisi' : 'Menunggu verifikasi admin'}</span></p>
            </div>
          ) : null}
        </div>
      ) : null}
        </>
      ) : null}
    </div>
  );
}

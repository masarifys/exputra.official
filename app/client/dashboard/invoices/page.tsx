'use client';

import { useState, useEffect } from 'react';
import { FileText, AlertCircle, CheckCircle, CreditCard, X, CheckCircle2, Printer } from 'lucide-react';
import Image from 'next/image';

interface Order {
    id: string;
    invoiceId: string;
    domainName: string;
    total: number;
    status: string;
    createdAt: string;
    paymentMethod: string;
    customerEmail?: string;
    domainId?: string;
    templateId?: string;
    packageId?: string;
    promoId?: string | null;
    subtotal?: number;
    discount?: number;
}

interface PaymentMethod {
    id: string;
    name: string;
    icon: string;
    duitkuCode: string;
}

const statusColors: Record<string, { bg: string; text: string; icon: string; label: string }> = {
    PENDING: { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', icon: '⏳', label: 'Menunggu' },
    PAID: { bg: 'bg-green-50 border-green-200', text: 'text-green-700', icon: '✓', label: 'Dibayar' },
    PROCESSING: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', icon: '⚙', label: 'Diproses' },
    COMPLETED: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', icon: '', label: 'Lunas' },
    CANCELLED: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', icon: '✕', label: 'Dibatalkan' },
};

const paymentMethods: PaymentMethod[] = [
    { id: 'va-bni', name: 'BNI Virtual Account', icon: '/payment-icons/bni.png', duitkuCode: 'I1' },
    { id: 'va-bri', name: 'BRI Virtual Account', icon: '/payment-icons/bri.png', duitkuCode: 'BR' },
    { id: 'va-mandiri', name: 'Mandiri Virtual Account', icon: '/payment-icons/mandiri.png', duitkuCode: 'M2' },
    { id: 'qris-nobu', name: 'QRIS (ALL BANK)', icon: '/payment-icons/qris.png', duitkuCode: 'SP' },
];

export default function MyInvoicesPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedInvoice, setSelectedInvoice] = useState<Order | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('');

    useEffect(() => {
        fetch('/api/client/orders')
            .then(res => res.json())
            .then(data => {
                setOrders(Array.isArray(data) ? data : []);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handlePayment = async (order: Order) => {
        setSelectedInvoice(order);
        setPaymentMethod('');
        setShowPaymentModal(true);
    };

    const submitPayment = async () => {
        if (!paymentMethod) {
            alert('Silakan pilih metode pembayaran');
            return;
        }

        setPaymentLoading(true);
        try {
            // Find the selected payment method to get duitkuCode
            const selectedMethod = paymentMethods.find(pm => pm.id === paymentMethod);
            if (!selectedMethod) {
                alert('Metode pembayaran tidak valid');
                setPaymentLoading(false);
                return;
            }

            console.log('Submitting payment with:', {
                invoiceId: selectedInvoice?.invoiceId,
                amount: selectedInvoice?.total,
                paymentMethod: selectedMethod.duitkuCode,
                domain: selectedInvoice?.domainName
            });

            // Save order data to localStorage for success page
            const orderData = {
                invoiceId: selectedInvoice?.invoiceId,
                domainSearch: selectedInvoice?.domainName,
                selectedDomain: { extension: '', price: selectedInvoice?.total || 0 },
                selectedPackage: { name: 'Invoice Payment', price: 0 },
                personalData: { fullName: 'Customer', email: selectedInvoice?.customerEmail || '', phone: '' },
                totalPrice: selectedInvoice?.total || 0,
                timestamp: Date.now()
            };
            localStorage.setItem('pending-order', JSON.stringify(orderData));

            const res = await fetch('/api/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: selectedInvoice?.invoiceId,
                    amount: selectedInvoice?.total,
                    customerName: 'Customer', // Get from profile if available
                    customerEmail: selectedInvoice?.invoiceId + '@invoice.local',
                    customerPhone: '0000000000',
                    productDetails: `Invoice Payment - ${selectedInvoice?.domainName}`,
                    paymentMethod: selectedMethod.duitkuCode,
                    orderData: {
                        domainName: selectedInvoice?.domainName,
                        invoiceId: selectedInvoice?.invoiceId,
                        domainId: selectedInvoice?.domainId,
                        templateId: selectedInvoice?.templateId,
                        packageId: selectedInvoice?.packageId,
                        promoId: selectedInvoice?.promoId || null,
                        subtotal: selectedInvoice?.subtotal || 0,
                        discount: selectedInvoice?.discount || 0,
                    }
                }),
            });

            console.log('Payment API response status:', res.status);
            
            if (!res.ok) {
                const errorText = await res.text();
                let errorJson: any = {};
                try { errorJson = JSON.parse(errorText); } catch(e) {}

                // Handle Bill Already Paid seamlessly for Localhost / no-webhook scenarios
                const isAlreadyPaid = errorText.includes('Bill already paid') || errorJson?.error?.includes('Bill already paid') || errorJson?.details?.Message?.includes('Bill already paid');

                if (isAlreadyPaid) {
                    console.log('Payment API info:', 'Bill already paid, updating local state.');
                    const updatedOrders = orders.map(o => o.id === selectedInvoice?.id ? { ...o, status: 'PAID' } : o);
                    setOrders(updatedOrders);
                    setShowPaymentModal(false);
                    setSelectedInvoice(null);
                    setPaymentMethod('');
                    alert('✓ Invoice ternyata sudah terbayar pada Payment Gateway. Status berhasil disinkronisasi ke PAID!');
                } else {
                    console.error('Payment API error response:', errorText);
                    alert('Terjadi error pada API pembayaran: ' + (errorJson.error || errorJson.message || res.statusText));
                }
                setPaymentLoading(false);
                return;
            }

            const result = await res.json();
            console.log('Payment API result:', result);

            if (result.success && result.data?.paymentUrl) {
                // Open payment gateway in new window (do NOT navigate from this page)
                window.open(result.data.paymentUrl, '_blank', 'width=800,height=600');
                // Close modal but stay on invoices page
                setShowPaymentModal(false);
                setSelectedInvoice(null);
                setPaymentMethod('');
                alert('✓ Gateway pembayaran dibuka di tab baru. Selesaikan pembayaran di sana lalu kembali cek status invoice.');
            } else if (result.error?.includes('Bill already paid') || result.details?.Message?.includes('Bill already paid')) {
                // Bill already paid - update local status
                const updatedOrders = orders.map(o =>
                    o.id === selectedInvoice?.id ? { ...o, status: 'PAID' } : o
                );
                setOrders(updatedOrders);
                setShowPaymentModal(false);
                setSelectedInvoice(null);
                setPaymentMethod('');
                alert('✓ Invoice sudah terbayar. Status berhasil diperbarui.');
            } else {
                alert(result.error || result.message || 'Gagal memproses pembayaran');
                setPaymentLoading(false);
            }
        } catch (error) {
            console.error('Payment error:', error);
            alert('Gagal memproses pembayaran: ' + (error instanceof Error ? error.message : 'Terjadi kesalahan tidak dikenal'));
            setPaymentLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Memuat invoice...</div>;

    const pendingInvoices = orders.filter(o => o.status === 'PENDING');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <FileText className="w-8 h-8 text-blue-600" />
                        Invoices
                    </h1>
                    <p className="text-gray-600 mt-2">Kelola pembayaran dan riwayat tagihan Anda</p>
                </div>
            </div>

            {/* Pending Invoices Alert */}
            {pendingInvoices.length > 0 && (
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-l-4 border-orange-500 rounded-lg p-5 shadow-md">
                    <div className="flex gap-4">
                        <div className="flex-shrink-0">
                            <AlertCircle className="w-6 h-6 text-orange-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-orange-900 text-lg">Pembayaran Tertunda</h3>
                            <p className="text-sm text-orange-800 mt-2">
                                Anda memiliki <span className="font-bold">{pendingInvoices.length}</span> invoice yang menunggu pembayaran:
                            </p>
                            <div className="mt-4 space-y-3">
                                {pendingInvoices.map(invoice => (
                                    <div key={invoice.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white p-5 rounded-lg border border-orange-200 shadow-sm gap-4">
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className="p-3 bg-orange-100 rounded-lg flex-shrink-0">
                                                <FileText className="w-5 h-5 text-orange-600" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm text-gray-600">Invoice {invoice.invoiceId}</p>
                                                <p className="font-bold text-gray-900 truncate">{invoice.domainName}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
                                            <div className="flex-1 sm:flex-none text-right">
                                                <p className="text-sm text-gray-600 sm:hidden">Amount</p>
                                                <p className="text-xl sm:text-lg font-bold text-orange-600">IDR {invoice.total.toLocaleString()}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => window.open(`/client/dashboard/invoices/${invoice.invoiceId}/print`, '_blank')}
                                                    className="flex-1 sm:flex-none px-4 sm:px-4 py-2.5 sm:py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold hover:bg-gray-200 active:scale-95 transition-all shadow-sm whitespace-nowrap"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handlePayment(invoice)}
                                                    className="flex-1 sm:flex-none px-5 sm:px-6 py-2.5 sm:py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 active:scale-95 transition-all shadow-md whitespace-nowrap"
                                                >
                                                    Pay Now →
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoices Table - Desktop View */}
            <div className="hidden md:block bg-white rounded-xl shadow-md border border-gray-200">
                {/* Table Header */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 p-6">
                    <h2 className="font-bold text-gray-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Semua Invoice
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left min-w-[700px]">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Invoice ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Tanggal</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Deskripsi</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center">
                                            <FileText className="w-12 h-12 text-gray-300 mb-4" />
                                            <p className="text-gray-500 font-medium">Belum ada invoice</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                orders.map(order => (
                                    <tr key={order.id} className="hover:bg-blue-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-mono font-bold text-gray-900 text-sm">#{order.invoiceId}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-gray-600">
                                                {new Date(order.createdAt).toLocaleDateString('id-ID', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-gray-900">{order.domainName}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-gray-900">IDR {order.total.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold ${statusColors[order.status]?.bg} ${statusColors[order.status]?.text} border`}>
                                                <span>{statusColors[order.status]?.icon}</span>
                                                {statusColors[order.status]?.label || order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                {order.status === 'PENDING' && (
                                                    <button
                                                        onClick={() => handlePayment(order)}
                                                        className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 transition-all shadow-md"
                                                    >
                                                        PAY NOW
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => window.open(`/client/dashboard/invoices/${order.invoiceId}/print`, '_blank')}
                                                    className="inline-flex items-center bg-gray-100 p-2 text-gray-600 rounded-lg hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                                    title="Print / View PDF"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Invoices Cards - Mobile View */}
            <div className="md:hidden space-y-4">
                {orders.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 font-medium">Belum ada invoice</p>
                    </div>
                ) : (
                    orders.map(order => {
                        const statusColor = statusColors[order.status];
                        return (
                            <div key={order.id} className={`rounded-xl border-2 p-5 shadow-sm transition-all ${statusColor?.bg} ${statusColor?.text}`}>
                                {/* Card Header */}
                                <div className="flex items-start justify-between gap-3 mb-4 pb-4 border-b-2" style={{borderColor: 'currentColor', opacity: 0.2}}>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs font-bold uppercase tracking-wider opacity-75">Invoice ID</p>
                                        <p className="text-lg font-bold text-gray-900 break-all">#{order.invoiceId}</p>
                                    </div>
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex-shrink-0 ${statusColor?.bg} border`}>
                                        <span>{statusColor?.icon}</span>
                                        {statusColor?.label || order.status}
                                    </span>
                                </div>

                                {/* Card Body */}
                                <div className="space-y-4">
                                    {/* Date & Description */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider opacity-75 mb-1">Date</p>
                                            <p className="font-bold text-gray-900">
                                                {new Date(order.createdAt).toLocaleDateString('id-ID', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider opacity-75 mb-1">Description</p>
                                            <p className="font-bold text-gray-900 break-words">{order.domainName}</p>
                                        </div>
                                    </div>

                                    {/* Amount */}
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider opacity-75 mb-1">Amount</p>
                                        <p className="text-2xl font-bold text-gray-900">IDR {order.total.toLocaleString()}</p>
                                    </div>

                                    {/* Action Button */}
                                    <div className="flex gap-2 mt-4">
                                        <button
                                            onClick={() => window.open(`/client/dashboard/invoices/${order.invoiceId}/print`, '_blank')}
                                            className="px-4 py-3 bg-gray-100 text-gray-600 rounded-lg font-bold hover:bg-gray-200 transition-all shadow-sm flex-shrink-0"
                                        >
                                            <Printer className="w-5 h-5 flex m-auto" />
                                        </button>
                                        
                                        {order.status === 'PENDING' && (
                                            <button
                                                onClick={() => handlePayment(order)}
                                                className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 transition-all shadow-md flex items-center justify-center gap-2"
                                            >
                                                PAY NOW
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedInvoice && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
                        {/* Modal Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between rounded-t-xl sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <CreditCard className="w-6 h-6" />
                                <h2 className="text-xl font-bold">Konfirmasi Pembayaran</h2>
                            </div>
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="p-1 hover:bg-blue-500 rounded-lg transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Body - Landscape Layout */}
                        <div className="p-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Left Column - Invoice Details */}
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Detail Invoice</h3>
                                    
                                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                                        <p className="text-xs text-blue-600 font-semibold uppercase">Invoice ID</p>
                                        <p className="text-lg font-bold text-gray-900 mt-1">#{selectedInvoice.invoiceId}</p>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <p className="text-xs text-gray-600 font-semibold uppercase">Domain</p>
                                        <p className="text-lg font-bold text-gray-900 mt-1">{selectedInvoice.domainName}</p>
                                    </div>

                                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                                        <p className="text-xs text-orange-600 font-semibold uppercase">Total Pembayaran</p>
                                        <p className="text-3xl font-bold text-orange-600 mt-1">IDR {selectedInvoice.total.toLocaleString()}</p>
                                    </div>
                                </div>

                                {/* Right Column - Payment Methods */}
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900 mb-4">Pilih Metode Pembayaran</h3>
                                    <div className="space-y-3">
                                        {paymentMethods.map((method) => (
                                            <div
                                                key={method.id}
                                                onClick={() => setPaymentMethod(method.id)}
                                                className={`border-2 rounded-xl p-3 sm:p-4 cursor-pointer transition-all duration-200 flex items-center justify-between ${
                                                    paymentMethod === method.id
                                                        ? 'border-cyan-500 bg-cyan-50 shadow-sm'
                                                        : 'border-gray-200 hover:border-cyan-300 hover:bg-gray-50'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2 sm:gap-3">
                                                    <div
                                                        className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg border flex items-center justify-center overflow-hidden transition-colors ${
                                                            paymentMethod === method.id
                                                                ? 'bg-white border-cyan-200'
                                                                : 'bg-gray-50 border-gray-200'
                                                        }`}
                                                    >
                                                        <Image
                                                            src={method.icon}
                                                            alt={method.name}
                                                            width={34}
                                                            height={34}
                                                            className="w-8 h-8 sm:w-[34px] sm:h-[34px] object-contain"
                                                        />
                                                    </div>
                                                    <span className="font-medium text-gray-900 text-sm sm:text-base">{method.name}</span>
                                                </div>

                                                {paymentMethod === method.id ? (
                                                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-cyan-600" />
                                                ) : (
                                                    <svg
                                                        className="w-5 h-5 flex-shrink-0 text-gray-400"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M9 5l7 7-7 7"
                                                        />
                                                    </svg>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons - Full Width */}
                            <div className="flex gap-4 mt-8 pt-6 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowPaymentModal(false)}
                                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-bold transition-colors text-base"
                                >
                                    Batal
                                </button>
                                <button
                                    onClick={submitPayment}
                                    disabled={paymentLoading || !paymentMethod}
                                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold transition-colors flex items-center justify-center gap-2 text-base"
                                >
                                    {paymentLoading ? (
                                        <>
                                            <span className="animate-spin">⚙</span>
                                            Memproses...
                                        </>
                                    ) : (
                                        <>
                                            <CreditCard className="w-5 h-5" />
                                            Lanjutkan Pembayaran
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import { useMemo, useState } from 'react';
import { Copy, ExternalLink, CreditCard, Calendar, FileText } from 'lucide-react';

type PublicInvoiceData = {
    id: string;
    invoiceId: string;
    invoiceNumber: string;
    kind: 'MANUAL' | 'WEBSITE' | 'SERVICE';
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    description: string | null;
    status: string;
    total: number;
    amountPaid: number;
    subtotal: number;
    discount: number;
    tax: number;
    issueDate: string;
    dueDate: string;
    notes: string | null;
    paymentMethod: string | null;
    items: Array<{ description: string; quantity: number; price: number; total: number }>;
    payments: Array<{ amount: number; paymentMethod: string; paymentDate: string; status: string; notes: string | null }>;
    onlinePayment: {
        enabled: boolean;
        orderType: 'website' | 'service' | null;
        domainName?: string;
        domainId?: string;
        templateId?: string | null;
        packageId?: string | null;
        services?: Array<{ id: string; price: number }>;
        serviceOrder?: {
            serviceId: string;
            servicePackageId: string | null;
            packageName: string;
            packageMultiplier: number;
            packageDescription: string | null;
            etaLabel: string | null;
            company: string | null;
            notes: string | null;
            subtotal: number;
        };
    } | null;
};

const paymentMethods = [
    { id: 'va-bni', name: 'BNI Virtual Account', icon: '🏦', duitkuCode: 'I1' },
    { id: 'va-bri', name: 'BRI Virtual Account', icon: '🏦', duitkuCode: 'BR' },
    { id: 'va-mandiri', name: 'Mandiri Virtual Account', icon: '🏦', duitkuCode: 'M2' },
    { id: 'qris-nobu', name: 'QRIS (Nobu Bank)', icon: '📲', duitkuCode: 'SP' },
];

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
    }).format(amount);
}

function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
}

export default function PublicInvoiceClient({ invoice }: { invoice: PublicInvoiceData }) {
    const [selectedPayment, setSelectedPayment] = useState('qris-nobu');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState('');
    const [paymentResult, setPaymentResult] = useState<any>(null);
    const remainingAmount = Math.max(0, invoice.total - invoice.amountPaid);
    // Allow online payment for website/service orders or for manual invoices
    const canPayOnline = (Boolean(invoice.onlinePayment?.enabled) || invoice.kind === 'MANUAL') && remainingAmount > 0 && invoice.status !== 'CANCELLED';

    const baseUrl = useMemo(() => {
        if (typeof window !== 'undefined') {
            return window.location.origin;
        }

        return process.env.NEXT_PUBLIC_BASE_URL || 'https://exputra.id';
    }, []);

    const handlePayment = async () => {
        // allow manual invoices to proceed even if `onlinePayment` mapping is null
        if (!invoice.onlinePayment?.enabled && invoice.kind !== 'MANUAL') {
            setError('Pembayaran online tidak tersedia untuk invoice ini.');
            return;
        }

        const method = paymentMethods.find((item) => item.id === selectedPayment);
        if (!method) {
            setError('Silakan pilih metode pembayaran.');
            return;
        }

        setIsProcessing(true);
        setError('');

        try {
            const response = await fetch('/api/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: invoice.invoiceId,
                    amount: remainingAmount,
                    customerName: invoice.customerName,
                    customerEmail: invoice.customerEmail,
                    customerPhone: invoice.customerPhone,
                    productDetails: `Payment for Invoice #${invoice.invoiceNumber}`,
                    paymentMethod: method.duitkuCode,
                    returnUrl: `${baseUrl}/invoice/${invoice.invoiceId}`,
                    orderData: invoice.kind === 'MANUAL' || !invoice.onlinePayment
                        ? {
                            manualInvoice: true,
                            invoiceId: invoice.invoiceId,
                        }
                        : invoice.onlinePayment.orderType === 'service'
                            ? {
                                serviceFlow: true,
                                serviceOrder: invoice.onlinePayment.serviceOrder,
                            }
                            : {
                                domainName: invoice.onlinePayment.domainName,
                                domainId: invoice.onlinePayment.domainId,
                                templateId: invoice.onlinePayment.templateId,
                                packageId: invoice.onlinePayment.packageId,
                                subtotal: invoice.subtotal,
                                discount: invoice.discount,
                                services: invoice.onlinePayment.services || [],
                            },
                }),
            });

            const result = await response.json();

            if (result.success) {
                setPaymentResult(result.data);
                if (result.data?.paymentUrl) {
                    window.open(result.data.paymentUrl, '_blank');
                }
            } else {
                setError(result.error || 'Payment failed to process');
            }
        } catch {
            setError('System error processing payment');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 py-10 px-4">
            <div className="max-w-5xl mx-auto space-y-6">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
                    <div className="flex items-start justify-between gap-4 flex-wrap border-b border-gray-100 pb-6 mb-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <FileText className="w-6 h-6 text-cyan-600" />
                                <h1 className="text-2xl md:text-3xl font-black text-gray-900">Invoice {invoice.invoiceNumber}</h1>
                            </div>
                            <p className="text-sm text-gray-500">{invoice.description || 'Invoice detail'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Status</p>
                            <p className="text-lg font-black text-gray-900">{invoice.status}</p>
                            <p className="text-xs text-gray-500 mt-1">Due {formatDate(invoice.dueDate)}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Customer</p>
                                    <p className="font-bold text-gray-900 mt-1">{invoice.customerName}</p>
                                    <p className="text-sm text-gray-500">{invoice.customerEmail}</p>
                                </div>
                                <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Issued</p>
                                    <p className="font-bold text-gray-900 mt-1 flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" />{formatDate(invoice.issueDate)}</p>
                                </div>
                                <div className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Paid</p>
                                    <p className="font-bold text-gray-900 mt-1">{formatCurrency(invoice.amountPaid)}</p>
                                </div>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-gray-200">
                                <table className="w-full text-left border-collapse bg-white">
                                    <thead>
                                        <tr className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                                            <th className="p-4">Description</th>
                                            <th className="p-4 w-24 text-center">Qty</th>
                                            <th className="p-4 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {invoice.items.map((item, index) => (
                                            <tr key={index}>
                                                <td className="p-4 font-medium text-gray-900">{item.description}</td>
                                                <td className="p-4 text-center text-gray-600">{item.quantity}</td>
                                                <td className="p-4 text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {invoice.notes && (
                                <div className="rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm text-amber-900">
                                    <p className="font-bold mb-1">Catatan</p>
                                    <p className="whitespace-pre-wrap">{invoice.notes}</p>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="rounded-2xl border border-gray-200 p-5 bg-white shadow-sm">
                                <h2 className="text-lg font-bold text-gray-900 mb-4">Ringkasan</h2>
                                <div className="space-y-3 text-sm">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Subtotal</span>
                                        <span className="font-medium text-gray-900">{formatCurrency(invoice.subtotal)}</span>
                                    </div>
                                    {invoice.discount > 0 && (
                                        <div className="flex justify-between text-gray-600">
                                            <span>Discount</span>
                                            <span className="font-medium text-red-600">-{formatCurrency(invoice.discount)}</span>
                                        </div>
                                    )}
                                    {invoice.tax > 0 && (
                                        <div className="flex justify-between text-gray-600">
                                            <span>Tax / Fee</span>
                                            <span className="font-medium text-gray-900">{formatCurrency(invoice.tax)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between border-t border-gray-100 pt-3">
                                        <span className="font-bold text-gray-900">Total</span>
                                        <span className="font-black text-cyan-700">{formatCurrency(invoice.total)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">Sisa</span>
                                        <span className="font-bold text-gray-900">{formatCurrency(remainingAmount)}</span>
                                    </div>
                                </div>
                            </div>

                            {invoice.payments.length > 0 && (
                                <div className="rounded-2xl border border-gray-200 p-5 bg-white shadow-sm">
                                    <h2 className="text-lg font-bold text-gray-900 mb-4">Riwayat Pembayaran</h2>
                                    <div className="space-y-3">
                                        {invoice.payments.map((payment, index) => (
                                            <div key={index} className="rounded-xl bg-gray-50 border border-gray-100 p-4">
                                                <div className="flex justify-between items-start mb-2">
                                                    <div>
                                                        <p className="font-bold text-gray-900">{formatCurrency(payment.amount)}</p>
                                                        <p className="text-xs text-gray-500">{payment.paymentMethod}</p>
                                                    </div>
                                                    <span className="text-[10px] font-bold uppercase tracking-widest text-green-700 bg-green-100 px-2 py-1 rounded-full">{payment.status}</span>
                                                </div>
                                                <p className="text-xs text-gray-400">{formatDate(payment.paymentDate)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="rounded-2xl border border-gray-200 p-5 bg-white shadow-sm">
                                <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <ExternalLink className="w-5 h-5 text-gray-400" />
                                    Link Invoice
                                </h2>
                                <div className="flex p-1 bg-gray-50 rounded-lg border border-gray-200">
                                    <input
                                        type="text"
                                        readOnly
                                        value={`${baseUrl}/invoice/${invoice.invoiceId}`}
                                        className="w-full bg-transparent px-3 py-2 text-sm text-gray-600 focus:outline-none"
                                    />
                                    <button
                                        className="p-2 bg-white rounded shadow-sm border border-gray-200 text-gray-600 hover:text-cyan-600"
                                        onClick={() => navigator.clipboard.writeText(`${baseUrl}/invoice/${invoice.invoiceId}`)}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-gray-200 p-5 bg-white shadow-sm">
                                <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-gray-400" />
                                    Pembayaran Online
                                </h2>

                                {!canPayOnline ? (
                                    <p className="text-sm text-gray-500">
                                        Pembayaran online tidak tersedia untuk invoice ini.
                                    </p>
                                ) : (
                                    <div className="space-y-3">
                                        {paymentMethods.map((method) => (
                                            <button
                                                key={method.id}
                                                type="button"
                                                onClick={() => setSelectedPayment(method.id)}
                                                className={`w-full p-3 rounded-xl border-2 transition-all text-left flex items-center justify-between ${selectedPayment === method.id ? 'border-cyan-600 bg-cyan-50' : 'border-gray-100 hover:border-cyan-200'}`}
                                            >
                                                <span className="flex items-center gap-3">
                                                    <span className="text-xl">{method.icon}</span>
                                                    <span className="font-semibold text-gray-700">{method.name}</span>
                                                </span>
                                                {selectedPayment === method.id && <span className="text-cyan-600 font-bold">✓</span>}
                                            </button>
                                        ))}

                                        {error && (
                                            <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-sm text-red-700">
                                                {error}
                                            </div>
                                        )}

                                        {paymentResult ? (
                                            <div className="rounded-xl bg-green-50 border border-green-100 p-3 text-sm text-green-700">
                                                Payment request sent. Silakan cek tab pembayaran yang terbuka.
                                            </div>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={handlePayment}
                                                disabled={isProcessing}
                                                className="w-full py-3 rounded-xl bg-cyan-600 text-white font-bold hover:bg-cyan-700 disabled:opacity-50"
                                            >
                                                {isProcessing ? 'Processing...' : `Bayar ${formatCurrency(remainingAmount)}`}
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
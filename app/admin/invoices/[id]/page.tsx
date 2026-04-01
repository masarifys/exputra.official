'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
    FileText, ArrowLeft, Printer, Send, CreditCard, 
    Trash2, CheckCircle2, History, Copy, Mail, ExternalLink, Calendar
} from 'lucide-react';
import Button from '@/components/Button';

interface Invoice {
    id: string;
    invoiceNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    description: string;
    items: any[];
    payments: any[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    amountPaid: number;
    status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
    paymentMethod: string;
    issueDate: string;
    dueDate: string;
    type: 'MANUAL' | 'WEBSITE' | 'SERVICE';
    notes: string;
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [invoice, setInvoice] = useState<Invoice | null>(null);
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    // Payment form
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [submittingPayment, setSubmittingPayment] = useState(false);

    const fetchInvoice = useCallback(async () => {
        try {
            setLoading(true);
            const [res, settingsRes] = await Promise.all([
                fetch(`/api/admin/invoices/${id}`),
                fetch('/api/public/settings')
            ]);
            
            if (res.ok) {
                const data = await res.json();
                setInvoice(data);
                setPaymentAmount(data.total - data.amountPaid);
            } else {
                router.push('/admin/invoices');
            }

            if (settingsRes.ok) {
                const settingsData = await settingsRes.json();
                setSettings(settingsData);
            }
        } catch (error) {
            console.error('Failed to fetch invoice:', error);
        } finally {
            setLoading(false);
        }
    }, [id, router]);

    useEffect(() => {
        fetchInvoice();
    }, [fetchInvoice]);

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) return;
        
        try {
            await fetch(`/api/admin/invoices/${id}`, { method: 'DELETE' });
            router.push('/admin/invoices');
        } catch (error) {
            console.error('Failed to delete invoice:', error);
        }
    };

    const handleMarkAsStatus = async (status: string) => {
        try {
            await fetch(`/api/admin/invoices/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });
            fetchInvoice();
        } catch (error) {
            console.error(`Failed to mark invoice as ${status}:`, error);
        }
    };

    const handleAddPayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmittingPayment(true);
        try {
            const res = await fetch(`/api/admin/invoices/${id}/payments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: paymentAmount,
                    paymentMethod,
                    notes: paymentNotes,
                    paymentDate,
                    referenceNumber: `MANUAL-${Date.now()}`
                })
            });

            if (res.ok) {
                setShowPaymentModal(false);
                setPaymentNotes('');
                fetchInvoice();
            } else {
                alert('Add payment failed!');
            }
        } catch (error) {
            console.error('Add Payment failed', error);
        } finally {
            setSubmittingPayment(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    if (loading) return <div className="p-10 text-center">Loading invoice...</div>;
    if (!invoice) return <div className="p-10 text-center text-red-500">Invoice not found!</div>;

    const remainingAmount = invoice.total - invoice.amountPaid;

    return (
        <div className="p-6 space-y-6 max-w-6xl mx-auto">
            {/* Action Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <Link href="/admin/invoices">
                        <Button variant="secondary" size="md" icon={<ArrowLeft className="w-5 h-5" />}>
                            Back
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                             {invoice.invoiceNumber}
                            <span className={`px-2 py-1 text-[10px] rounded font-bold uppercase tracking-wider ml-2 
                                ${invoice.type === 'WEBSITE' ? 'bg-blue-100 text-blue-700' : 
                                  invoice.type === 'SERVICE' ? 'bg-purple-100 text-purple-700' : 
                                  'bg-emerald-100 text-emerald-700'}`}>
                                {invoice.type}
                            </span>
                            <span className={`px-3 py-1 text-xs rounded-full font-bold uppercase tracking-wider ml-2 
                                ${invoice.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                  invoice.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700' :
                                  invoice.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                                  invoice.status === 'PARTIAL' ? 'bg-blue-100 text-blue-700' :
                                  'bg-gray-100 text-gray-700'}`}>
                                {invoice.status}
                            </span>
                        </h1>
                    </div>
                </div>

                <div className="flex items-center flex-wrap gap-2">
                    {invoice.status !== 'PAID' && invoice.status !== 'CANCELLED' && (
                        <Button variant="primary" size="md" icon={<CreditCard className="w-4 h-4" />} onClick={() => setShowPaymentModal(true)}>
                            Add Payment
                        </Button>
                    )}
                    
                    <Button variant="secondary" size="md" icon={<Mail className="w-4 h-4" />}>
                        Send Email
                    </Button>
                    
                    <Button variant="secondary" size="md" icon={<Printer className="w-4 h-4" />} onClick={() => window.print()}>
                        Print PDF
                    </Button>

                    {invoice.status !== 'CANCELLED' && invoice.status !== 'PAID' && (
                        <Button variant="secondary" size="md" onClick={() => handleMarkAsStatus('CANCELLED')}>
                            Mark Cancelled
                        </Button>
                    )}
                    
                    <Button variant="danger" size="md" icon={<Trash2 className="w-4 h-4" />} onClick={handleDelete}>
                        Delete
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans printable-area">
                {/* Main Invoice Look */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-8 shadow-sm">
                    {/* Header: Logos & Generic info */}
                    <div className="flex justify-between items-start border-b border-gray-100 pb-8 mb-8">
                        <div>
                            {settings?.logo ? (
                                <Image
                                    src={settings.logo.startsWith('http') || settings.logo.startsWith('/') ? settings.logo : `/${settings.logo}`}
                                    alt={settings?.siteName || 'Logo'}
                                    width={160}
                                    height={48}
                                    className="h-12 w-auto object-contain mb-4"
                                />
                            ) : (
                                <div className="w-12 h-12 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xl mb-4">
                                    {(settings?.siteName || 'EX').substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            <h2 className="text-xl font-bold text-gray-900">{settings?.siteName || 'Bisnis Anda'}</h2>
                            {settings?.contactEmail && <p className="text-sm text-gray-500">{settings.contactEmail}</p>}
                            {settings?.contactPhone && <p className="text-sm text-gray-500">{settings.contactPhone}</p>}
                        </div>
                        <div className="text-right">
                            <h1 className="text-4xl font-black text-gray-200 uppercase tracking-widest mb-2">Invoice</h1>
                            <p className="text-lg font-bold text-gray-900">{invoice.invoiceNumber}</p>
                            <div className="grid grid-cols-2 gap-x-4 mt-4 text-sm">
                                <span className="font-semibold text-gray-500 text-right">Issue Date:</span>
                                <span className="text-gray-900 text-left">{formatDate(invoice.issueDate)}</span>
                                <span className="font-semibold text-gray-500 text-right">Due Date:</span>
                                <span className="text-gray-900 text-left">{formatDate(invoice.dueDate)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Bill To */}
                    <div className="mb-8 p-4 bg-gray-50 rounded-lg">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Billed To</h3>
                        <p className="text-lg font-bold text-gray-900">{invoice.customerName}</p>
                        <p className="text-gray-600">{invoice.customerEmail}</p>
                        {invoice.customerPhone && <p className="text-gray-600">{invoice.customerPhone}</p>}
                    </div>

                    {/* Description */}
                    {invoice.description && (
                        <div className="mb-8">
                            <span className="font-semibold text-gray-900">Project / Note: </span>
                            <span className="text-gray-600">{invoice.description}</span>
                        </div>
                    )}

                    {/* Table */}
                    <div className="mb-8 overflow-hidden rounded-xl border border-gray-200">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-100/80 border-b border-gray-200 text-xs font-bold text-gray-600 uppercase tracking-wider">
                                    <th className="p-4">Item & Description</th>
                                    <th className="p-4 w-24 text-center">QTY</th>
                                    <th className="p-4 text-right">Price</th>
                                    <th className="p-4 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {invoice.items.map((item, index) => (
                                    <tr key={index}>
                                        <td className="p-4 font-medium text-gray-900">{item.description}</td>
                                        <td className="p-4 text-center text-gray-600">{item.quantity}</td>
                                        <td className="p-4 text-right text-gray-600">{formatCurrency(item.price)}</td>
                                        <td className="p-4 text-right font-medium text-gray-900">{formatCurrency(item.total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Calculation */}
                    <div className="flex justify-end mb-8">
                        <div className="w-full max-w-sm space-y-3">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span className="font-medium text-gray-900">{formatCurrency(invoice.subtotal)}</span>
                            </div>
                            {invoice.discount > 0 && (
                                <div className="flex justify-between text-red-600">
                                    <span>Discount</span>
                                    <span>-{formatCurrency(invoice.discount)}</span>
                                </div>
                            )}
                            {invoice.tax > 0 && (
                                <div className="flex justify-between text-gray-600">
                                    <span>Tax/Fee</span>
                                    <span>{formatCurrency(invoice.tax)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center border-t border-gray-200 pt-3">
                                <span className="font-bold text-gray-900 text-lg">Total</span>
                                <span className="font-black text-2xl text-blue-600">{formatCurrency(invoice.total)}</span>
                            </div>
                            
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-gray-500">Amount Paid</span>
                                <span className="font-medium text-green-600">{formatCurrency(invoice.amountPaid)}</span>
                            </div>

                            <div className="flex justify-between items-center rounded-lg bg-gray-50 p-3 pt-2 border border-gray-100">
                                <span className="font-bold text-gray-900">Balance Due</span>
                                <span className={`font-bold ${remainingAmount > 0 ? 'text-red-500' : 'text-gray-900'}`}>
                                    {formatCurrency(remainingAmount)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Terms / Notes */}
                    {invoice.notes && (
                        <div className="mt-8 pt-8 border-t border-gray-100 text-sm p-4 bg-yellow-50/50 rounded-lg">
                            <h4 className="font-bold text-gray-900 mb-1">Terms & Conditions</h4>
                            <p className="text-gray-600 whitespace-pre-wrap">{invoice.notes}</p>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Payment History */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-4 mb-4">
                            <History className="w-5 h-5 text-gray-400" />
                            Payment History
                        </h3>

                        {invoice.payments.length === 0 ? (
                            <div className="text-center py-6">
                                <CreditCard className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-500">No payments recorded yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {invoice.payments.map((payment, idx) => (
                                    <div key={idx} className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="font-bold text-gray-900">{formatCurrency(payment.amount)}</p>
                                                <p className="text-xs text-gray-500">{payment.paymentMethod}</p>
                                            </div>
                                            <span className="text-xs font-semibold px-2 py-1 rounded bg-green-100 text-green-700">
                                                {payment.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
                                            <Calendar className="w-3 h-3" />
                                            {formatDate(payment.paymentDate)}
                                        </div>
                                        {payment.notes && (
                                            <p className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-100 mt-2">"{payment.notes}"</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Invoice Link */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-4 mb-4">
                            <ExternalLink className="w-5 h-5 text-gray-400" />
                            Client Link
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">Share this link directly with the client for them to view and pay the invoice online.</p>
                        <div className="flex p-1 bg-gray-50 rounded-lg border border-gray-200">
                            <input 
                                type="text"
                                readOnly
                                value={`https://exputra.app/invoice/${invoice.id}`}
                                className="w-full bg-transparent px-3 py-2 text-sm text-gray-600 focus:outline-none"
                            />
                            <button className="p-2 bg-white rounded shadow-sm border border-gray-200 text-gray-600 hover:text-blue-600" onClick={() => navigator.clipboard.writeText(`https://exputra.app/invoice/${invoice.id}`)}>
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Modal */}
            {showPaymentModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl w-full max-w-md shadow-2xl">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">Record a Payment</h2>
                            <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">×</button>
                        </div>
                        <form onSubmit={handleAddPayment} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">Payment Amount <span className="text-red-500">*</span></label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3 text-gray-500 font-bold">Rp</span>
                                    <input 
                                        type="number" 
                                        required
                                        max={remainingAmount}
                                        value={paymentAmount}
                                        onChange={(e) => setPaymentAmount(Number(e.target.value))}
                                        className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold text-lg"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Remaining balance: {formatCurrency(remainingAmount)}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-2">Payment Method</label>
                                    <select 
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Bank Transfer">Bank Transfer</option>
                                        <option value="E-Wallet">E-Wallet</option>
                                        <option value="Cash">Cash</option>
                                        <option value="Credit Card">Credit Card</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-900 mb-2">Date</label>
                                    <input 
                                        type="date" 
                                        required
                                        value={paymentDate}
                                        onChange={(e) => setPaymentDate(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-900 mb-2">Internal Notes (Optional)</label>
                                <textarea 
                                    rows={3}
                                    value={paymentNotes}
                                    onChange={(e) => setPaymentNotes(e.target.value)}
                                    placeholder="Transaction ID, specific bank name, etc..."
                                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <Button type="button" variant="secondary" size="lg" fullWidth onClick={() => setShowPaymentModal(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" variant="primary" size="lg" fullWidth isLoading={submittingPayment}>
                                    Save Payment
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            
            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .printable-area, .printable-area * {
                        visibility: visible;
                    }
                    .printable-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                }
            `}} />
        </div>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, LayoutDashboard, ShoppingCart } from 'lucide-react';
import { useOrderStore } from '@/store/useOrderStore';

interface OrderData {
    invoiceId: string;
    domainSearch?: string;
    selectedDomain?: { extension: string; price: number } | null;
    selectedPackage?: { name: string; price: number } | null;
    personalData?: { fullName: string; email: string; phone: string };
    totalPrice: number;
    timestamp: number;
    // Fields for ServiceOrder
    serviceName?: string;
    packageName?: string;
    customerName?: string;
}

export default function PaymentSuccessClient() {
    const [isHydrated, setIsHydrated] = useState(false);
    const [orderData, setOrderData] = useState<OrderData | null>(null);
    const [confirmationStatus, setConfirmationStatus] = useState<'confirming' | 'confirmed' | 'error'>('confirming');
    const [paidAtTime, setPaidAtTime] = useState<string>('');
    const searchParams = useSearchParams();
    const router = useRouter();
    const resetOrder = useOrderStore((state) => state.reset);

    const reference =
        searchParams.get('reference') ||
        searchParams.get('merchantOrderId') ||
        '';

    const resultCode = searchParams.get('resultCode');

    useEffect(() => {
        setIsHydrated(true);

        if (resultCode && resultCode !== '00') {
            console.error('[PaymentSuccess] Result code is not 00:', resultCode);
            window.location.href =
                '/order/payment/failed' + window.location.search;
            return;
        }

        let timeoutId: NodeJS.Timeout;

        const savedOrder = localStorage.getItem('pending-order');
        if (savedOrder) {
            try {
                const parsed = JSON.parse(savedOrder);
                setOrderData(parsed);

                if (parsed.invoiceId) {
                    console.log('[PaymentSuccess] Confirming payment for:', parsed.invoiceId);
                    confirmPayment(parsed.invoiceId);
                    
                    // Add timeout - if confirmation takes too long, but we have resultCode=00, show success anyway
                    timeoutId = setTimeout(() => {
                        if (resultCode === '00') {
                            console.warn('[PaymentSuccess] Confirmation timeout, but resultCode is 00. Forcing success.');
                            setConfirmationStatus('confirmed');
                        } else {
                            console.warn('[PaymentSuccess] Confirmation timeout after 15 seconds');
                            setConfirmationStatus('error');
                        }
                    }, 15000);
                }
            } catch (e) {
                console.error('[PaymentSuccess] Failed to parse order data:', e);
                setConfirmationStatus('error');
            }
        } else {
            console.warn('[PaymentSuccess] No pending order in localStorage');
            // If no localStorage data, try to fetch from API using invoiceId from URL
            const invoiceId = searchParams.get('merchantOrderId');
            if (invoiceId) {
                console.log('[PaymentSuccess] Attempting to fetch order from API:', invoiceId);
                confirmPayment(invoiceId);
                
                // Add timeout for API call too
                timeoutId = setTimeout(() => {
                    console.warn('[PaymentSuccess] Confirmation timeout after 10 seconds');
                    setConfirmationStatus('error');
                }, 10000);
            } else {
                setConfirmationStatus('error');
            }
        }

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [resultCode]);

    const confirmPayment = async (invoiceId: string) => {
        try {
            console.log('[PaymentSuccess] Calling confirm-payment endpoint for:', invoiceId);
            const response = await fetch('/api/order/confirm-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceId,
                    reference,
                }),
            });

            const data = await response.json();
            console.log('[PaymentSuccess] Confirm response:', data);

            if (response.ok && data.success) {
                setConfirmationStatus('confirmed');
                
                // Overlay API data on top of localStorage data for perfect accuracy
                if (data.total !== undefined) {
                    setOrderData(prev => ({
                        ...prev!,
                        invoiceId: invoiceId, // Ensure ID matches
                        totalPrice: data.total,
                        customerName: data.customerName,
                        packageName: data.packageName,
                    }));
                }

                // Set the paid timestamp
                const now = new Date();
                setPaidAtTime(now.toLocaleString('id-ID', {
                    day: 'numeric',
                    month: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                }).replace(/\//g, '/'));
            } else {
                console.error('[PaymentSuccess] Confirm failed:', data);
                setConfirmationStatus('error');
            }
        } catch (error) {
            console.error('[PaymentSuccess] Failed to confirm payment:', error);
            setConfirmationStatus('error');
        }
    };

    const handleNewOrder = () => {
        // Reset the order store to clear invoiceId and other data
        resetOrder();
        // Remove temporary localStorage data
        localStorage.removeItem('pending-order');
        // Redirect to order page
        router.push('/order');
    };

    if (!isHydrated) {
        return (
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
                </div>
            </div>
        );
    }

    const domainName = orderData?.domainSearch && orderData?.selectedDomain 
        ? `${orderData.domainSearch}${orderData.selectedDomain.extension}` 
        : orderData?.serviceName || 'Layanan Digital';

    const packageName = orderData?.selectedPackage?.name || orderData?.packageName || '-';
    const customerName = orderData?.personalData?.fullName || orderData?.customerName || '-';

    return (
        <div className="min-h-screen bg-[#F0F4F8] flex items-center justify-center px-4 py-12">
            <div className="max-w-3xl w-full bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 md:p-12 text-center border border-gray-100">
                {confirmationStatus === 'confirming' && (
                    <div className="py-12">
                        <div className="flex justify-center mb-6">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
                        </div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-3">Memverifikasi Pembayaran...</h1>
                        <p className="text-lg text-gray-600">
                            Mohon tunggu sebentar, kami sedang memproses konfirmasi Anda.
                        </p>
                    </div>
                )}

                {confirmationStatus === 'confirmed' && (
                    <>
                        <div className="flex justify-center mb-8">
                            <div className="w-24 h-24 bg-[#E6F9F1] rounded-full flex items-center justify-center">
                                <div className="w-16 h-16 bg-[#27C87C] rounded-full flex items-center justify-center shadow-[0_4px_12px_rgba(39,200,124,0.3)]">
                                    <Check className="w-10 h-10 text-white stroke-[3px]" />
                                </div>
                            </div>
                        </div>
                        
                        <h1 className="text-3xl md:text-4xl font-bold text-[#1A1C1E] mb-4">Pembayaran Berhasil!</h1>
                        
                        <p className="text-gray-600 text-lg leading-relaxed mb-6 max-w-2xl mx-auto">
                            Layanan Anda <span className="font-bold text-gray-900">{domainName}</span> dengan No Invoice <span className="font-bold text-gray-900">{orderData?.invoiceId}</span> telah dibayar.
                        </p>

                        <p className="text-[#8B939E] text-md mb-10">
                            Dibayar pada: {paidAtTime}
                        </p>

                        <div className="max-w-2xl mx-auto bg-[#F8F9FB] rounded-2xl p-6 md:p-8 mb-10 text-left border border-gray-100/50">
                            <div className="grid grid-cols-1 gap-4 text-[15px] md:text-base">
                                <div className="flex py-1.5 border-b border-gray-100 last:border-0">
                                    <span className="w-24 md:w-32 text-gray-500 font-medium">Layanan:</span>
                                    <span className="flex-1 text-[#1A1C1E] font-semibold">{domainName}</span>
                                </div>
                                <div className="flex py-1.5 border-b border-gray-100 last:border-0">
                                    <span className="w-24 md:w-32 text-gray-500 font-medium">Paket:</span>
                                    <span className="flex-1 text-[#1A1C1E] font-semibold">{packageName}</span>
                                </div>
                                <div className="flex py-1.5 border-b border-gray-100 last:border-0">
                                    <span className="w-24 md:w-32 text-gray-500 font-medium">Total:</span>
                                    <span className="flex-1 text-[#1A1C1E] font-semibold">IDR {(orderData?.totalPrice || 0).toLocaleString('id-ID')}</span>
                                </div>
                                <div className="flex py-1.5 border-b border-gray-100 last:border-0">
                                    <span className="w-24 md:w-32 text-gray-500 font-medium">Pemesan:</span>
                                    <span className="flex-1 text-[#1A1C1E] font-semibold">{customerName}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
                            <Link
                                href="/client/dashboard"
                                className="flex-1 flex items-center justify-center gap-2 bg-[#2563EB] text-white py-4 rounded-xl hover:bg-blue-700 transition-all font-bold text-lg shadow-[0_4px_12px_rgba(37,99,235,0.2)]"
                            >
                                <LayoutDashboard className="w-5 h-5" />
                                Ke Dashboard
                            </Link>

                            <button
                                onClick={handleNewOrder}
                                className="flex-1 flex items-center justify-center gap-2 bg-[#F1F3F5] text-[#495057] py-4 rounded-xl hover:bg-gray-200 transition-all font-bold text-lg"
                            >
                                <ShoppingCart className="w-5 h-5" />
                                Pesan Lainnya
                            </button>
                        </div>
                    </>
                )}

                {confirmationStatus === 'error' && (
                    <div className="py-8">
                        <div className="flex justify-center mb-8">
                            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center">
                                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                                    <span className="text-white text-4xl font-bold">!</span>
                                </div>
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold text-red-600 mb-4">Verifikasi Gagal</h1>
                        <p className="text-lg text-gray-600 mb-8">
                            Terjadi kesalahan saat memverifikasi pembayaran. Jangan khawatir, data pesanan Anda tetap tersimpan.
                        </p>

                        <div className="bg-yellow-50 rounded-2xl p-6 mb-8 border border-yellow-100 text-left">
                            <p className="text-[#856404] font-semibold mb-2">Invoice: {orderData?.invoiceId || '-'}</p>
                            <p className="text-[#856404] text-sm opacity-90">
                                Silakan hubungi admin atau login ke dashboard untuk memverifikasi status pesanan Anda secara manual.
                            </p>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
                            <Link
                                href="/client/dashboard/invoices"
                                className="flex-1 bg-blue-600 text-white py-4 rounded-xl hover:bg-blue-700 transition-colors font-bold"
                            >
                                Cek di Dashboard
                            </Link>

                            <button
                                onClick={() => window.location.reload()}
                                className="flex-1 bg-white border-2 border-gray-200 text-gray-700 py-4 rounded-xl hover:bg-gray-50 transition-colors font-bold"
                            >
                                Coba Lagi
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

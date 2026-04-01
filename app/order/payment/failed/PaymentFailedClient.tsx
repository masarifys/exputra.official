'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

export default function PaymentFailedClient() {
    const searchParams = useSearchParams();

    const message =
        searchParams.get('message') ||
        'Pembayaran gagal atau dibatalkan. Silakan coba kembali.';

    const merchantOrderId = searchParams.get('merchantOrderId');
    const retryHref = merchantOrderId 
        ? `/client/dashboard/payment/${merchantOrderId}` 
        : `/order`;

    return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 px-4">
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-md text-center">
                <h1 className="text-2xl font-bold text-red-600 mb-3">
                    Pembayaran Gagal
                </h1>

                <p className="text-gray-600 mb-6">{message}</p>

                <div className="flex gap-3">
                    <Link
                        href="/client/dashboard/invoices"
                        className="flex-1 bg-gray-200 text-gray-800 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                    >
                        Ke Invoices
                    </Link>

                    <Link
                        href={retryHref}
                        className="flex-1 bg-red-500 text-white py-2 rounded-lg font-bold hover:bg-red-600 transition-colors"
                    >
                        Coba Lagi
                    </Link>
                </div>
            </div>
        </div>
    );
}

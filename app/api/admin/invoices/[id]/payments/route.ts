import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/fonnte';

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const invoiceId = params.id;
        const body = await request.json();
        
        const { amount, paymentMethod, referenceNumber, notes, paymentDate } = body;

        // 1. Check if it's a Manual Invoice
        const manualInvoice = await prisma.invoice.findUnique({
            where: { id: invoiceId }
        });

        if (manualInvoice) {
            // Create the payment record for manual invoices
            const payment = await prisma.payment.create({
                data: {
                    invoiceId,
                    amount: Number(amount),
                    paymentMethod,
                    referenceNumber,
                    notes,
                    paymentDate: new Date(paymentDate || new Date()),
                    status: 'VERIFIED'
                }
            });

            // Update manual invoice status
            const totalPaid = manualInvoice.amountPaid + Number(amount);
            let status = manualInvoice.status;

            if (totalPaid >= manualInvoice.total) {
                status = 'PAID';
            } else if (totalPaid > 0) {
                status = 'PARTIAL';
            }

            await prisma.invoice.update({
                where: { id: invoiceId },
                data: {
                    amountPaid: totalPaid,
                    status,
                    paymentMethod: paymentMethod
                }
            });

            return NextResponse.json(payment);
        }

        // 2. Check if it's a Website Order
        const websiteOrder = await prisma.order.findUnique({
            where: { id: invoiceId }
        });

        if (websiteOrder) {
            const updated = await prisma.order.update({
                where: { id: invoiceId },
                data: {
                    status: 'PAID',
                    paidAt: new Date(),
                    paymentRef: referenceNumber || `MANUAL-${Date.now()}`
                }
            });

            // Send WA Notification
            const waMsg = `Halo ${websiteOrder.customerName},\n\nPembayaran manual untuk pesanan website (Invoice: ${websiteOrder.invoiceId}) telah dikonfirmasi oleh Admin.\nPesanan Anda sekarang berstatus: *PAID*. Terima kasih!`;
            await sendWhatsAppMessage(websiteOrder.customerPhone, waMsg);

            return NextResponse.json({ success: true, message: 'Website order marked as PAID', data: updated });
        }

        // 3. Check if it's a Service Order
        const serviceOrder = await (prisma as any).serviceOrder.findUnique({
            where: { id: invoiceId }
        });

        if (serviceOrder) {
            const updated = await (prisma as any).serviceOrder.update({
                where: { id: invoiceId },
                data: {
                    status: 'PAID',
                    paidAt: new Date(),
                    paymentRef: referenceNumber || `MANUAL-${Date.now()}`
                }
            });

            // Send WA Notification
            const waMsg = `Halo ${serviceOrder.customerName},\n\nPembayaran manual untuk layanan (Invoice: ${serviceOrder.invoiceId}) telah dikonfirmasi oleh Admin.\nPesanan Anda sekarang berstatus: *PAID*. Terima kasih!`;
            await sendWhatsAppMessage(serviceOrder.customerPhone, waMsg);

            return NextResponse.json({ success: true, message: 'Service order marked as PAID', data: updated });
        }

        return NextResponse.json({ error: 'Invoice/Order not found' }, { status: 404 });
    } catch (error) {
        console.error('Failed to create payment:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

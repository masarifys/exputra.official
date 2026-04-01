import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const id = params.id;

        // 1. Try finding in Manual Invoices
        const manual = await prisma.invoice.findUnique({
            where: { id },
            include: {
                items: true,
                payments: { orderBy: { createdAt: 'desc' } },
                customer: true
            }
        });

        if (manual) {
            return NextResponse.json({ ...manual, type: 'MANUAL' });
        }

        // 2. Try finding in Website Orders
        const websiteOrder = await prisma.order.findUnique({
            where: { id },
            include: {
                domain: true,
                package: true,
                services: {
                    include: { service: true }
                }
            }
        });

        if (websiteOrder) {
            // Map Order to Invoice structure for the detail page
            return NextResponse.json({
                id: websiteOrder.id,
                invoiceNumber: websiteOrder.invoiceId,
                customerName: websiteOrder.customerName,
                customerEmail: websiteOrder.customerEmail,
                customerPhone: websiteOrder.customerPhone,
                description: `Website Order: ${websiteOrder.domainName}`,
                total: websiteOrder.total,
                amountPaid: websiteOrder.status === 'PAID' ? websiteOrder.total : 0,
                status: websiteOrder.status,
                paymentMethod: websiteOrder.paymentMethod,
                issueDate: websiteOrder.createdAt,
                dueDate: websiteOrder.createdAt,
                notes: websiteOrder.notes,
                type: 'WEBSITE',
                items: [
                    { description: `Domain: ${websiteOrder.domainName}`, quantity: 1, price: 0, total: 0 },
                    { description: `Package: ${websiteOrder.package?.name}`, quantity: 1, price: websiteOrder.total, total: websiteOrder.total }
                ],
                payments: websiteOrder.status === 'PAID' ? [
                    { amount: websiteOrder.total, paymentMethod: websiteOrder.paymentMethod, status: 'VERIFIED', paymentDate: websiteOrder.paidAt || websiteOrder.createdAt, referenceNumber: websiteOrder.paymentRef }
                ] : []
            });
        }

        // 3. Try finding in Service Orders
        const serviceOrder = await (prisma as any).serviceOrder.findUnique({
            where: { id },
            include: {
                service: true,
                servicePackage: true
            }
        });

        if (serviceOrder) {
            return NextResponse.json({
                id: serviceOrder.id,
                invoiceNumber: serviceOrder.invoiceId,
                customerName: serviceOrder.customerName,
                customerEmail: serviceOrder.customerEmail,
                customerPhone: serviceOrder.customerPhone,
                description: `Service Order: ${serviceOrder.service?.name}`,
                total: serviceOrder.total,
                amountPaid: serviceOrder.status === 'PAID' ? serviceOrder.total : 0,
                status: serviceOrder.status,
                paymentMethod: serviceOrder.paymentMethod,
                issueDate: serviceOrder.createdAt,
                dueDate: serviceOrder.createdAt,
                notes: serviceOrder.notes,
                type: 'SERVICE',
                items: [
                    { description: `${serviceOrder.service?.name} - ${serviceOrder.packageName}`, quantity: serviceOrder.packageMultiplier || 1, price: serviceOrder.total, total: serviceOrder.total }
                ],
                payments: serviceOrder.status === 'PAID' ? [
                    { amount: serviceOrder.total, paymentMethod: serviceOrder.paymentMethod, status: 'VERIFIED', paymentDate: serviceOrder.paidAt || serviceOrder.createdAt, referenceNumber: serviceOrder.paymentRef }
                ] : []
            });
        }

        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    } catch (error) {
        console.error('Failed to fetch invoice:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const id = params.id;
        const body = await request.json();

        // 1. Check Manual Table first
        const isManual = await prisma.invoice.findUnique({ where: { id } });
        if (isManual) {
            const updated = await prisma.invoice.update({
                where: { id },
                data: { status: body.status }
            });
            return NextResponse.json(updated);
        }

        // 2. Check Order Table
        const isOrder = await prisma.order.findUnique({ where: { id } });
        if (isOrder) {
            const updated = await prisma.order.update({
                where: { id },
                data: { status: body.status }
            });
            return NextResponse.json(updated);
        }

        // 3. Check Service Order Table
        const isService = await (prisma as any).serviceOrder.findUnique({ where: { id } });
        if (isService) {
            const updated = await (prisma as any).serviceOrder.update({
                where: { id },
                data: { status: body.status }
            });
            return NextResponse.json(updated);
        }

        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    } catch (error) {
        console.error('Failed to update invoice:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const params = await context.params;
        const id = params.id;

        // Try Manual
        try {
            await prisma.invoice.delete({ where: { id } });
            return NextResponse.json({ success: true });
        } catch (e) { /* ignore */ }

        // Try Order
        try {
            await prisma.order.delete({ where: { id } });
            return NextResponse.json({ success: true });
        } catch (e) { /* ignore */ }

        // Try Service
        try {
            await (prisma as any).serviceOrder.delete({ where: { id } });
            return NextResponse.json({ success: true });
        } catch (e) { /* ignore */ }

        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    } catch (error) {
        console.error('Failed to delete invoice:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

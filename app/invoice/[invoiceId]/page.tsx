import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import PublicInvoiceClient from './public-invoice-client';

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

async function loadInvoice(invoiceId: string): Promise<PublicInvoiceData | null> {
    const manual = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
            items: true,
            payments: { orderBy: { createdAt: 'desc' } },
            customer: true,
        },
    });

    if (manual) {
        return {
            id: manual.id,
            invoiceId: manual.id,
            invoiceNumber: manual.invoiceNumber,
            kind: 'MANUAL',
            customerName: manual.customerName,
            customerEmail: manual.customerEmail,
            customerPhone: manual.customerPhone,
            description: manual.description ?? null,
            status: manual.status,
            total: manual.total,
            amountPaid: manual.amountPaid,
            subtotal: manual.subtotal,
            discount: manual.discount,
            tax: manual.tax,
            issueDate: manual.issueDate.toISOString(),
            dueDate: manual.dueDate.toISOString(),
            notes: manual.notes ?? null,
            paymentMethod: manual.paymentMethod ?? null,
            items: manual.items.map((item) => ({
                description: item.description,
                quantity: item.quantity,
                price: item.price,
                total: item.total,
            })),
            payments: manual.payments.map((payment) => ({
                amount: payment.amount,
                paymentMethod: payment.paymentMethod,
                paymentDate: payment.paymentDate.toISOString(),
                status: payment.status,
                notes: payment.notes ?? null,
            })),
            onlinePayment: null,
        };
    }

    const websiteOrder = await prisma.order.findUnique({
        where: { id: invoiceId },
        include: {
            domain: true,
            template: true,
            package: true,
            services: {
                include: { service: true },
            },
        },
    });

    if (websiteOrder) {
        return {
            id: websiteOrder.id,
            invoiceId: websiteOrder.invoiceId,
            invoiceNumber: websiteOrder.invoiceId,
            kind: 'WEBSITE',
            customerName: websiteOrder.customerName,
            customerEmail: websiteOrder.customerEmail,
            customerPhone: websiteOrder.customerPhone,
            description: `Website Order: ${websiteOrder.domainName}`,
            status: websiteOrder.status,
            total: websiteOrder.total,
            amountPaid: websiteOrder.status === 'PAID' ? websiteOrder.total : 0,
            subtotal: websiteOrder.subtotal,
            discount: websiteOrder.discount,
            tax: 0,
            issueDate: websiteOrder.createdAt.toISOString(),
            dueDate: websiteOrder.createdAt.toISOString(),
            notes: websiteOrder.notes ?? null,
            paymentMethod: websiteOrder.paymentMethod ?? null,
            items: [
                { description: `Domain: ${websiteOrder.domainName}`, quantity: 1, price: 0, total: 0 },
                { description: `Package: ${websiteOrder.package?.name ?? '-'}`, quantity: 1, price: websiteOrder.total, total: websiteOrder.total },
                ...websiteOrder.services.map((item) => ({
                    description: `Service: ${item.service.name}`,
                    quantity: 1,
                    price: item.price,
                    total: item.price,
                })),
            ],
            payments: websiteOrder.status === 'PAID' ? [{
                amount: websiteOrder.total,
                paymentMethod: websiteOrder.paymentMethod ?? 'Payment Gateway',
                paymentDate: (websiteOrder.paidAt || websiteOrder.createdAt).toISOString(),
                status: 'VERIFIED',
                notes: null,
            }] : [],
            onlinePayment: {
                enabled: true,
                orderType: 'website',
                domainName: websiteOrder.domainName,
                domainId: websiteOrder.domainId,
                templateId: websiteOrder.templateId,
                packageId: websiteOrder.packageId,
                services: websiteOrder.services.map((item) => ({ id: item.serviceId, price: item.price })),
            },
        };
    }

    const serviceOrder = await (prisma as any).serviceOrder.findUnique({
        where: { id: invoiceId },
        include: {
            service: true,
            servicePackage: true,
        },
    });

    if (serviceOrder) {
        return {
            id: serviceOrder.id,
            invoiceId: serviceOrder.invoiceId,
            invoiceNumber: serviceOrder.invoiceId,
            kind: 'SERVICE',
            customerName: serviceOrder.customerName,
            customerEmail: serviceOrder.customerEmail,
            customerPhone: serviceOrder.customerPhone,
            description: `Service Order: ${serviceOrder.service?.name ?? serviceOrder.packageName}`,
            status: serviceOrder.status,
            total: serviceOrder.total,
            amountPaid: serviceOrder.status === 'PAID' ? serviceOrder.total : 0,
            subtotal: serviceOrder.subtotal,
            discount: 0,
            tax: 0,
            issueDate: serviceOrder.createdAt.toISOString(),
            dueDate: serviceOrder.createdAt.toISOString(),
            notes: serviceOrder.notes ?? null,
            paymentMethod: serviceOrder.paymentMethod ?? null,
            items: [
                {
                    description: `${serviceOrder.service?.name ?? 'Service'} - ${serviceOrder.packageName}`,
                    quantity: serviceOrder.packageMultiplier || 1,
                    price: serviceOrder.total,
                    total: serviceOrder.total,
                },
            ],
            payments: serviceOrder.status === 'PAID' ? [{
                amount: serviceOrder.total,
                paymentMethod: serviceOrder.paymentMethod ?? 'Payment Gateway',
                paymentDate: (serviceOrder.paidAt || serviceOrder.createdAt).toISOString(),
                status: 'VERIFIED',
                notes: null,
            }] : [],
            onlinePayment: {
                enabled: true,
                orderType: 'service',
                serviceOrder: {
                    serviceId: serviceOrder.serviceId,
                    servicePackageId: serviceOrder.servicePackageId,
                    packageName: serviceOrder.packageName,
                    packageMultiplier: Number(serviceOrder.packageMultiplier || 1),
                    packageDescription: serviceOrder.packageDescription ?? null,
                    etaLabel: serviceOrder.etaLabel ?? null,
                    company: serviceOrder.company ?? null,
                    notes: serviceOrder.notes ?? null,
                    subtotal: serviceOrder.subtotal,
                },
            },
        };
    }

    return null;
}

export default async function PublicInvoicePage({ params }: { params: Promise<{ invoiceId: string }> }) {
    const { invoiceId } = await params;
    const invoice = await loadInvoice(invoiceId);

    if (!invoice) {
        notFound();
    }

    return <PublicInvoiceClient invoice={invoice} />;
}
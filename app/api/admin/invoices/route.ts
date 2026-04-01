import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || '';
        const getStats = searchParams.get('stats') === 'true';

        if (getStats) {
            // Calculate unified stats across Manual Invoices, Website Orders, and Service Orders
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            
            // Manual Invoices
            const manualInvoices = await prisma.invoice.findMany({
                where: { createdAt: { gte: startOfMonth } }
            });
            // Website Orders
            const websiteOrders = await prisma.order.findMany({
                where: { createdAt: { gte: startOfMonth } }
            });
            // Service Orders
            const serviceOrders = await (prisma as any).serviceOrder.findMany({
                where: { createdAt: { gte: startOfMonth } }
            });

            const totalInvoices = manualInvoices.length + websiteOrders.length + serviceOrders.length;
            
            const revManual = manualInvoices.filter((i: any) => i.status === 'PAID').reduce((sum: number, i: any) => sum + i.amountPaid, 0);
            const revWebsite = websiteOrders.filter((i: any) => i.status === 'PAID').reduce((sum: number, i: any) => sum + i.total, 0);
            const revService = serviceOrders.filter((i: any) => i.status === 'PAID').reduce((sum: number, i: any) => sum + i.total, 0);
            const totalRevenue = revManual + revWebsite + revService;

            const pendManual = manualInvoices.filter((i: any) => i.status === 'PENDING' || i.status === 'PARTIAL').reduce((sum: number, i: any) => sum + (i.total - i.amountPaid), 0);
            const pendWebsite = websiteOrders.filter((i: any) => i.status === 'PENDING').reduce((sum: number, i: any) => sum + i.total, 0);
            const pendService = serviceOrders.filter((i: any) => i.status === 'PENDING').reduce((sum: number, i: any) => sum + i.total, 0);
            const totalPending = pendManual + pendWebsite + pendService;

            const totalOverdueManual = await prisma.invoice.count({ where: { status: 'OVERDUE' } });
            
            return NextResponse.json({
                totalInvoices,
                totalRevenue,
                totalPending,
                totalOverdue: totalOverdueManual // Manual invoices usually have due dates, orders don't yet
            });
        }

        // Build where clauses for all three models
        const whereManual: any = {};
        const whereWebsite: any = {};
        const whereService: any = {};

        if (search) {
            const searchObj = {
                OR: [
                    { invoiceNumber: { contains: search } }, // Only for Manual
                    { invoiceId: { contains: search } },     // For Orders/ServiceOrders
                    { customerName: { contains: search } },
                    { customerEmail: { contains: search } }
                ]
            };
            // Clean specific model search
            whereManual.OR = [
                { invoiceNumber: { contains: search } },
                { customerName: { contains: search } },
                { customerEmail: { contains: search } }
            ];
            whereWebsite.OR = [
                { invoiceId: { contains: search } },
                { customerName: { contains: search } },
                { customerEmail: { contains: search } }
            ];
            whereService.OR = [
                { invoiceId: { contains: search } },
                { customerName: { contains: search } },
                { customerEmail: { contains: search } }
            ];
        }

        if (status) {
            whereManual.status = status;
            whereWebsite.status = status;
            whereService.status = status;
        }

        // Fetch concurrently
        const [manuals, websites, services] = await Promise.all([
            prisma.invoice.findMany({ where: whereManual, orderBy: { createdAt: 'desc' } }),
            prisma.order.findMany({ where: whereWebsite, orderBy: { createdAt: 'desc' } }),
            (prisma as any).serviceOrder.findMany({ where: whereService, orderBy: { createdAt: 'desc' } })
        ]);

        // Normalize data
        const normalizedManuals = manuals.map(m => ({
            id: m.id,
            invoiceNumber: m.invoiceNumber,
            customerName: m.customerName,
            customerEmail: m.customerEmail,
            total: m.total,
            status: m.status,
            issueDate: m.issueDate,
            createdAt: m.createdAt,
            type: 'MANUAL'
        }));

        const normalizedWebsites = websites.map(w => ({
            id: w.id,
            invoiceNumber: w.invoiceId,
            customerName: w.customerName,
            customerEmail: w.customerEmail,
            total: w.total,
            status: w.status,
            issueDate: w.createdAt,
            createdAt: w.createdAt,
            type: 'WEBSITE'
        }));

        const normalizedServices = services.map((s: any) => ({
            id: s.id,
            invoiceNumber: s.invoiceId,
            customerName: s.customerName,
            customerEmail: s.customerEmail,
            total: s.total,
            status: s.status,
            issueDate: s.createdAt,
            createdAt: s.createdAt,
            type: 'SERVICE'
        }));

        // Combined results
        const combined = [...normalizedManuals, ...normalizedWebsites, ...normalizedServices]
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        return NextResponse.json(combined);
    } catch (error) {
        console.error('Failed to fetch aggregated invoices:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { 
            customerId, customerName, customerEmail, customerPhone, 
            description, items, subtotal, tax, discount, total, 
            issueDate, dueDate, notes 
        } = body;

        // Validation
        if (!issueDate || !dueDate || isNaN(new Date(issueDate).getTime()) || isNaN(new Date(dueDate).getTime())) {
            return NextResponse.json({ error: 'Invalid issue date or due date provided' }, { status: 400 });
        }

        if (!customerName || !customerEmail) {
            return NextResponse.json({ error: 'Customer Name and Email are required' }, { status: 400 });
        }

        // Generate Invoice Number
        const count = await prisma.invoice.count();
        const invoiceNumber = `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(count + 1).padStart(4, '0')}`;

        const invoice = await prisma.invoice.create({
            data: {
                invoiceNumber,
                customerId: customerId || null,
                customerName,
                customerEmail,
                customerPhone,
                description,
                subtotal,
                tax,
                discount,
                total,
                issueDate: new Date(issueDate),
                dueDate: new Date(dueDate),
                notes,
                items: {
                    create: items.map((item: any) => ({
                        description: item.description,
                        quantity: Number(item.quantity) || 1,
                        price: Number(item.price) || 0,
                        total: Number(item.total) || 0
                    }))
                }
            },
            include: {
                items: true
            }
        });

        return NextResponse.json(invoice);
    } catch (error) {
        console.error('Failed to create invoice:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

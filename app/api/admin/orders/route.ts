import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const orders = await prisma.order.findMany({
      include: {
        domain: true,
        template: true,
        package: true,
        promo: true,
        services: {
          include: {
            service: true,
          },
        },
        affiliateLink: {
          include: {
            customer: {
              select: { id: true, name: true, email: true }
            }
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orders);
  } catch (error) {
    console.error('Get Orders Error:', error);
    return NextResponse.json({ message: 'Failed to fetch orders' }, { status: 500 });
  }
}
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      customerEmail,
      customerName,
      customerPhone,
      domainName,
      domainId,
      templateId,
      packageId,
      subtotal,
      discount,
      total,
      services, // Array of service IDs
      status = 'PENDING',
    } = body;

    // Validate that either packageId or services are provided
    if (!packageId && (!services || services.length === 0)) {
      return NextResponse.json(
        { message: 'Pilih minimal satu paket atau layanan' },
        { status: 400 }
      );
    }

    // Generate Invoice ID
    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const invoiceId = `INV-${dateStr}-${timeStr}${Math.floor(Math.random() * 100)}`;

    const order = await prisma.order.create({
      data: {
        invoiceId,
        customerEmail,
        customerName,
        customerPhone: customerPhone || '-',
        domainName,
        domainId,
        templateId,
        packageId: packageId || null,
        subtotal,
        discount: discount || 0,
        total,
        status,
        services: services?.length > 0 ? {
          create: services.map((s: { id: string; price: number }) => ({
            serviceId: s.id,
            price: s.price,
          })),
        } : undefined,
      },
      include: {
        domain: true,
        template: true,
        package: true,
      }
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    console.error('Create Order Error:', error);
    return NextResponse.json({ message: error.message || 'Failed to create order' }, { status: 500 });
  }
}

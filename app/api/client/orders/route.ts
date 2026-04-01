import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveClientSessionCustomer } from '@/lib/client-session';

const prismaAny = prisma as any;

export async function GET(request: NextRequest) {
  try {
    const session = await resolveClientSessionCustomer();

    if (!session?.email) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const [websiteOrders, serviceOrders] = await Promise.all([
      prisma.order.findMany({
        where: {
          customerEmail: session.email,
        },
        include: {
          domain: true,
          template: true,
          package: true,
          promo: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prismaAny.serviceOrder.findMany({
        where: {
          customerEmail: session.email,
        },
        include: {
          service: {
            select: {
              id: true,
              name: true,
              description: true,
              priceType: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    const normalizedServiceOrders = serviceOrders.map((item: any) => ({
      id: item.id,
      invoiceId: item.invoiceId,
      domainName: item.service?.name || 'Layanan Pendukung',
      customerName: item.customerName,
      customerEmail: item.customerEmail,
      total: item.total,
      status: item.status,
      createdAt: item.createdAt,
      domain: { extension: '' },
      template: null,
      package: {
        name: item.packageName || 'Paket Layanan',
        duration: null,
      },
      notes: item.notes || null,
      progressNotes: item.progressNotes || null,
      etaLabel: item.etaLabel || null,
      serviceFlow: true,
      service: item.service || null,
    }));

    const combinedOrders = [...websiteOrders, ...normalizedServiceOrders].sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return NextResponse.json(combinedOrders);
  } catch (error) {
    console.error('Get Client Orders Error:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan' },
      { status: 500 }
    );
  }
}

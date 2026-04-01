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

    const websiteOrderServices = await prisma.orderService.findMany({
      where: {
        order: {
          customerEmail: session.email,
        },
      },
      include: {
        service: true,
        order: {
          select: {
            id: true,
            invoiceId: true,
            domainName: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        order: {
          createdAt: 'desc',
        },
      },
    });

    const serviceOrders = await prismaAny.serviceOrder.findMany({
      where: {
        customerEmail: session.email,
      },
      include: {
        service: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const normalizedWebsiteServices = websiteOrderServices.map((item) => ({
      id: item.id,
      source: 'WEBSITE_ORDER',
      status: item.order ? 'PAID' : 'PENDING',
      progressNotes: null,
      packageName: null,
      etaLabel: null,
      price: item.price,
      service: {
        id: item.service.id,
        name: item.service.name,
        description: item.service.description,
        priceType: item.service.priceType,
      },
      order: {
        id: item.order.id,
        invoiceId: item.order.invoiceId,
        domainName: item.order.domainName,
        createdAt: item.order.createdAt,
      },
    }));

    const normalizedServiceOrders = serviceOrders.map((item: any) => ({
      id: item.id,
      source: 'SERVICE_ORDER',
      status: item.status,
      progressNotes: item.progressNotes || null,
      packageName: item.packageName || null,
      etaLabel: item.etaLabel || null,
      price: item.total,
      service: {
        id: item.service.id,
        name: item.service.name,
        description: item.service.description,
        priceType: item.service.priceType,
      },
      order: {
        id: item.id,
        invoiceId: item.invoiceId,
        domainName: item.packageName || 'Layanan Pendukung',
        createdAt: item.createdAt,
      },
    }));

    const combined = [...normalizedServiceOrders, ...normalizedWebsiteServices].sort(
      (a, b) => new Date(b.order.createdAt).getTime() - new Date(a.order.createdAt).getTime()
    );

    return NextResponse.json(combined);
  } catch (error) {
    console.error('Get Client Services Error:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan' },
      { status: 500 }
    );
  }
}

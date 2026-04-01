import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const prismaAny = prisma as any;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = String(searchParams.get('status') || '').trim();

    const where = status ? { status: status as any } : {};

    const orders = await prismaAny.serviceOrder.findMany({
      where,
      include: {
        service: {
          select: {
            id: true,
            name: true,
            priceType: true,
          },
        },
        servicePackage: {
          select: {
            id: true,
            code: true,
            name: true,
            price: true,
            etaLabel: true,
            durationMonths: true,
            isVisible: true,
            visibleInOrder: true,
            visibleInServices: true,
            internalOnly: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      orders,
      counts: {
        pending: orders.filter((item: any) => item.status === 'PENDING').length,
        paid: orders.filter((item: any) => item.status === 'PAID').length,
        processing: orders.filter((item: any) => item.status === 'PROCESSING').length,
        completed: orders.filter((item: any) => item.status === 'COMPLETED').length,
        cancelled: orders.filter((item: any) => item.status === 'CANCELLED').length,
      },
    });
  } catch (error) {
    console.error('Get Admin Service Orders Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const serviceId = String(body.serviceId || '').trim();
    const servicePackageId = String(body.servicePackageId || '').trim();
    const customerName = String(body.customerName || '').trim();
    const customerEmail = String(body.customerEmail || '').trim().toLowerCase();
    const customerPhone = String(body.customerPhone || '').trim();
    const company = String(body.company || '').trim();
    const notes = String(body.notes || '').trim();
    const manualPrice = body.manualPrice !== undefined && body.manualPrice !== null
      ? Number(body.manualPrice)
      : null;
    const packageNameOverride = body.packageNameOverride ? String(body.packageNameOverride).trim() : '';
    const etaLabelOverride = body.etaLabelOverride ? String(body.etaLabelOverride).trim() : '';

    if (!serviceId || !servicePackageId || !customerName || !customerEmail || !customerPhone) {
      return NextResponse.json({ message: 'serviceId, servicePackageId, customerName, customerEmail, dan customerPhone wajib diisi' }, { status: 400 });
    }

    if (manualPrice !== null && (Number.isNaN(manualPrice) || manualPrice < 0)) {
      return NextResponse.json({ message: 'manualPrice tidak valid' }, { status: 400 });
    }

    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      select: { id: true, name: true },
    });

    if (!service) {
      return NextResponse.json({ message: 'Service tidak ditemukan' }, { status: 404 });
    }

    const servicePackage = await prisma.servicePackage.findFirst({
      where: {
        id: servicePackageId,
        serviceId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        etaLabel: true,
        price: true,
      },
    });

    if (!servicePackage) {
      return NextResponse.json({ message: 'Paket layanan tidak valid untuk service yang dipilih' }, { status: 400 });
    }

    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    const invoiceId = `SRV-${day}${month}${year}-${hours}${minutes}${seconds}`;

    const created = await prismaAny.serviceOrder.create({
      data: {
        invoiceId,
        serviceId,
        servicePackageId: servicePackage.id,
        packageName: packageNameOverride || servicePackage.name,
        packageMultiplier: 1,
        packageDescription: servicePackage.description || null,
        etaLabel: etaLabelOverride || servicePackage.etaLabel || null,
        customerName,
        customerEmail,
        customerPhone,
        company: company || null,
        notes: notes || null,
        subtotal: manualPrice !== null ? Math.round(manualPrice) : servicePackage.price,
        total: manualPrice !== null ? Math.round(manualPrice) : servicePackage.price,
        status: 'PENDING',
      },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            priceType: true,
          },
        },
        servicePackage: {
          select: {
            id: true,
            code: true,
            name: true,
            price: true,
            etaLabel: true,
            durationMonths: true,
            isVisible: true,
            visibleInOrder: true,
            visibleInServices: true,
            internalOnly: true,
            isActive: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error('Create Admin Service Order Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/fonnte';

const prismaAny = prisma as any;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const status = body.status ? String(body.status) : undefined;
    const progressNotes = body.progressNotes !== undefined ? String(body.progressNotes || '') : undefined;
    const serviceId = body.serviceId ? String(body.serviceId).trim() : undefined;
    const servicePackageId = body.servicePackageId ? String(body.servicePackageId).trim() : undefined;
    const customPackageName = body.customPackageName ? String(body.customPackageName).trim() : undefined;
    const customEtaLabel = body.customEtaLabel !== undefined ? String(body.customEtaLabel || '').trim() : undefined;
    const customPrice = body.customPrice !== undefined && body.customPrice !== null
      ? Number(body.customPrice)
      : undefined;

    const updateData: Record<string, unknown> = {};

    if (status) {
      const normalizedStatus = status.toUpperCase();

      if (normalizedStatus === 'PAID') {
        return NextResponse.json(
          { message: 'Status PAID hanya dapat diubah oleh callback gateway pembayaran' },
          { status: 400 }
        );
      }

      updateData.status = status;

      if (normalizedStatus !== 'PAID') {
        updateData.paidAt = null;
      }
    }

    if (progressNotes !== undefined) {
      updateData.progressNotes = progressNotes || null;
    }

    if (serviceId) {
      updateData.serviceId = serviceId;
    }

    if (servicePackageId) {
      const targetServiceId = serviceId || (await prismaAny.serviceOrder.findUnique({
        where: { id },
        select: { serviceId: true },
      }))?.serviceId;

      const selectedPackage = await prisma.servicePackage.findFirst({
        where: {
          id: servicePackageId,
          serviceId: targetServiceId,
        },
        select: {
          id: true,
          name: true,
          description: true,
          etaLabel: true,
          price: true,
        },
      });

      if (!selectedPackage) {
        return NextResponse.json({ message: 'Paket layanan tidak valid untuk service terpilih' }, { status: 400 });
      }

      updateData.servicePackageId = selectedPackage.id;
      updateData.packageName = selectedPackage.name;
      updateData.packageDescription = selectedPackage.description || null;
      updateData.etaLabel = selectedPackage.etaLabel || null;
      updateData.subtotal = selectedPackage.price;
      updateData.total = selectedPackage.price;
      updateData.packageMultiplier = 1;
    }

    if (customPrice !== undefined) {
      if (Number.isNaN(customPrice) || customPrice < 0) {
        return NextResponse.json({ message: 'customPrice tidak valid' }, { status: 400 });
      }
      updateData.subtotal = Math.round(customPrice);
      updateData.total = Math.round(customPrice);
      updateData.packageMultiplier = 1;
    }

    if (customPackageName !== undefined) {
      updateData.packageName = customPackageName;
    }

    if (customEtaLabel !== undefined) {
      updateData.etaLabel = customEtaLabel || null;
    }

    const updated = await prismaAny.serviceOrder.update({
      where: { id },
      data: updateData,
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

    if (status) {
      const waMsg = `Halo ${updated.customerName},\n\nStatus pesanan Layanan ${updated.packageName} Anda (No Invoice: ${updated.invoiceId}) telah diperbarui menjadi *${status}*.\n\nSilakan cek dashboard klien untuk detail lebih lanjut.`;
      await sendWhatsAppMessage(updated.customerPhone, waMsg);
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update Service Order Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

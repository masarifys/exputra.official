import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/fonnte';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Delete related OrderService records first
    await prisma.orderService.deleteMany({
      where: { orderId: id },
    });

    // Delete the order
    await prisma.order.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete Order Error:', error);
    return NextResponse.json({ message: error.message || 'Failed to delete order' }, { status: 400 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { loginUrl, websiteUsername, websitePassword, websiteEmail, notes } = body;

    const updateData: any = {};

    if (loginUrl !== undefined) {
      updateData.loginUrl = loginUrl || null;
    }

    if (websiteUsername !== undefined) {
      updateData.websiteUsername = websiteUsername || null;
    }

    if (websitePassword !== undefined) {
      updateData.websitePassword = websitePassword || null;
    }

    if (websiteEmail !== undefined) {
      updateData.websiteEmail = websiteEmail || null;
    }

    if (notes !== undefined) {
      updateData.notes = notes || null;
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: order
    });
  } catch (error: any) {
    console.error('Update Order Credentials Error:', error);
    return NextResponse.json({ message: error.message || 'Failed to update credentials' }, { status: 400 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, total, templateId, packageId, serviceIds, expiredAt } = body;

    const updateData: any = {};

    if (status !== undefined) {
      updateData.status = status;
      if (status === 'PAID') {
        updateData.paidAt = new Date();
      }
    }

    if (total !== undefined && total >= 0) {
      updateData.total = total;
    }

    if (templateId) {
      updateData.templateId = templateId;
    }

    if (packageId) {
      updateData.packageId = packageId;
    }

    if (expiredAt) {
      updateData.expiredAt = new Date(expiredAt);
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        package: true,
        template: true,
        domain: true,
        services: {
          include: { service: true }
        }
      }
    });

    // Update services if provided
    if (serviceIds && Array.isArray(serviceIds)) {
      // Delete old services
      await prisma.orderService.deleteMany({
        where: { orderId: id }
      });

      // Add new services
      for (const serviceId of serviceIds) {
        const service = await prisma.service.findUnique({
          where: { id: serviceId }
        });
        if (service) {
          await prisma.orderService.create({
            data: {
              orderId: id,
              serviceId,
              price: service.price
            }
          });
        }
      }
    }

    // Fetch final order with all relations
    const finalOrder = await prisma.order.findUnique({
      where: { id },
      include: {
        package: true,
        template: true,
        domain: true,
        services: {
          include: { service: true }
        }
      }
    });

    if (status !== undefined && finalOrder) {
      const waMsg = `Halo ${finalOrder.customerName},\n\nStatus pesanan website Anda (No Invoice: ${finalOrder.invoiceId}) telah diperbarui menjadi *${status}*.\n\nSilakan cek dashboard klien untuk detail lebih lanjut.`;
      await sendWhatsAppMessage(finalOrder.customerPhone, waMsg);
    }

    return NextResponse.json({
      success: true,
      data: finalOrder
    });
  } catch (error: any) {
    console.error('Update Order Error:', error);
    return NextResponse.json({ message: error.message || 'Failed to update order' }, { status: 400 });
  }
}

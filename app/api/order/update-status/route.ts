import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/fonnte';

/**
 * Manual endpoint to check and update order status
 * Useful for debugging payment issues
 * 
 * Usage:
 * POST /api/order/update-status
 * Body: { invoiceId: "INV-..." }
 */
export async function POST(request: NextRequest) {
  try {
    const { invoiceId } = await request.json();

    if (!invoiceId) {
      return NextResponse.json(
        { message: 'Invoice ID required' },
        { status: 400 }
      );
    }

    console.log(`[Update Status] Checking order: ${invoiceId}`);

    // Determine table based on prefix
    const isServiceOrder = invoiceId.startsWith('SRV-');
    
    if (isServiceOrder) {
      const serviceOrder = await prisma.serviceOrder.findUnique({
        where: { invoiceId },
      });

      if (!serviceOrder) {
        return NextResponse.json({ message: 'Service Order not found', invoiceId }, { status: 404 });
      }

      if (serviceOrder.status === 'PENDING') {
        const updated = await prisma.serviceOrder.update({
          where: { invoiceId },
          data: { status: 'PAID', paidAt: new Date() },
        });

        // Send WA notification for service order
        const waMsg = `Halo ${serviceOrder.customerName},\n\nTerima kasih! Pembayaran untuk layanan Anda (No Invoice: ${invoiceId}) telah *BERHASIL* dikonfirmasi.\n\nTim kami akan segera memproses detail pesanan Anda.`;
        await sendWhatsAppMessage(serviceOrder.customerPhone, waMsg);

        return NextResponse.json({ success: true, message: 'Service Order status updated to PAID', order: updated });
      }

      return NextResponse.json({ success: false, message: `Status is ${serviceOrder.status}`, order: serviceOrder }, { status: 400 });
    }

    // Default to regular Order
    const order = await prisma.order.findUnique({
      where: { invoiceId },
      include: {
        domain: true,
        package: true,
      },
    });

    if (!order) {
      console.log(`[Update Status] Order not found: ${invoiceId}`);
      return NextResponse.json(
        { 
          message: 'Order not found',
          invoiceId,
        },
        { status: 404 }
      );
    }

    console.log(`[Update Status] Current order status: ${order.status}`);
    console.log(`[Update Status] Order data:`, {
      invoiceId: order.invoiceId,
      status: order.status,
      domainName: order.domainName,
      customerEmail: order.customerEmail,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
    });

    // If status is PENDING, try to update to PAID
    if (order.status === 'PENDING') {
      console.log(`[Update Status] Updating ${invoiceId} from PENDING to PAID`);
      
      const updated = await prisma.order.update({
        where: { invoiceId },
        data: {
          status: 'PAID',
          paidAt: new Date(),
        },
        include: {
          domain: true,
          package: true,
        },
      });

      // Try to create ClientDomain
      try {
        const fullDomainName = `${order.domainName}${order.domain?.extension || ''}`;
        const registeredAt = new Date();
        const expiredAt = new Date();
        expiredAt.setDate(expiredAt.getDate() + ((order.package?.duration || 1) * 365));

        const existingDomain = await prisma.clientDomain.findUnique({
          where: { domainName: fullDomainName }
        });

        if (!existingDomain) {
          await prisma.clientDomain.create({
            data: {
              clientEmail: order.customerEmail,
              domainName: fullDomainName,
              registeredAt: registeredAt,
              expiredAt: expiredAt,
              status: 'ACTIVE',
              autoRenew: false,
              notes: `Manual update from order ${invoiceId}`,
            },
          });
          console.log(`[Update Status] ClientDomain created: ${fullDomainName}`);
        }
      } catch (err) {
        console.error('[Update Status] Failed to create ClientDomain:', err);
      }

      // Send WA notification
      const waMsg = `Halo ${order.customerName},\n\nPembayaran untuk pesanan website Anda (No Invoice: ${invoiceId}) telah *BERHASIL* dikonfirmasi.\n\nTim Exputra akan segera memproses pesanan Anda!`;
      await sendWhatsAppMessage(order.customerPhone, waMsg);

      return NextResponse.json({
        success: true,
        message: 'Order status updated to PAID',
        order: updated,
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `Order status is already ${order.status}, cannot update`,
        order,
      }, { status: 400 });
    }

  } catch (error) {
    console.error('[Update Status] Error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to update status' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check order status without modifying
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = searchParams.get('invoiceId');

    if (!invoiceId) {
      return NextResponse.json(
        { message: 'Invoice ID required' },
        { status: 400 }
      );
    }

    const isServiceOrder = invoiceId.startsWith('SRV-');

    if (isServiceOrder) {
      const serviceOrder = await prisma.serviceOrder.findUnique({
        where: { invoiceId },
      });

      if (!serviceOrder) {
        return NextResponse.json({ message: 'Service Order not found', invoiceId }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        order: {
          invoiceId: serviceOrder.invoiceId,
          status: serviceOrder.status,
          customerEmail: serviceOrder.customerEmail,
          customerName: serviceOrder.customerName,
          total: serviceOrder.total,
          createdAt: serviceOrder.createdAt,
          paidAt: serviceOrder.paidAt,
          paymentRef: serviceOrder.paymentRef,
        }
      });
    }

    const order = await prisma.order.findUnique({
      where: { invoiceId },
      include: {
        domain: true,
        package: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { message: 'Order not found', invoiceId },
        { status: 404 }
      );
    }

    // Also check for ClientDomain
    const fullDomainName = `${order.domainName}${order.domain?.extension || ''}`;
    const clientDomain = await prisma.clientDomain.findUnique({
      where: { domainName: fullDomainName }
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      order: {
        invoiceId: order.invoiceId,
        status: order.status,
        domainName: order.domainName,
        fullDomainName: fullDomainName,
        customerEmail: order.customerEmail,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        paymentRef: order.paymentRef,
      },
      clientDomain: clientDomain ? {
        domainName: clientDomain.domainName,
        status: clientDomain.status,
        registeredAt: clientDomain.registeredAt,
        expiredAt: clientDomain.expiredAt,
      } : null,
    });

  } catch (error) {
    console.error('[Check Status] Error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to check status' },
      { status: 500 }
    );
  }
}

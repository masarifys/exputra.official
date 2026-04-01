import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { sendWhatsAppMessage } from '@/lib/fonnte';

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export async function POST(request: NextRequest) {
  try {
    const { invoiceId, reference } = await request.json();

    if (!invoiceId) {
      return NextResponse.json(
        { message: 'Invoice ID required' },
        { status: 400 }
      );
    }

    console.log(`[Confirm Payment] Processing invoiceId: ${invoiceId}, reference: ${reference}`);

    // Find website order by invoiceId
    const order = await prisma.order.findUnique({
      where: { invoiceId },
      include: {
        domain: true,
        package: true,
      },
    });

    if (!order) {
      const serviceOrder = await prisma.serviceOrder.findUnique({
        where: { invoiceId },
      });

      if (!serviceOrder) {
        console.log(`[Confirm Payment] Order not found: ${invoiceId}`);
        return NextResponse.json(
          { message: 'Order not found' },
          { status: 404 }
        );
      }

      // If service order is PENDING, update to PAID
      if (serviceOrder.status === 'PENDING') {
        const updatedServiceOrder = await prisma.serviceOrder.update({
          where: { invoiceId },
          data: {
            status: 'PAID',
            paymentRef: reference || null,
            paidAt: new Date(),
          },
        });

        console.log(`[Confirm Payment] Service Order ${invoiceId} updated to PAID`);

        // Send WA notification for service order - don't let this failure block the success response
        try {
          const waMsg = `Halo ${serviceOrder.customerName},\n\nTerima kasih! Pembayaran untuk layanan Anda (No Invoice: ${invoiceId}) telah *BERHASIL* dikonfirmasi.\n\nTim kami akan segera memproses detail pesanan Anda.`;
          await sendWhatsAppMessage(serviceOrder.customerPhone, waMsg);
        } catch (waError) {
          console.error('[Confirm Payment] WA Notification failed for Service Order:', waError);
        }

        // Auto-login for Service Order
        try {
          const normalizedEmail = serviceOrder.customerEmail.toLowerCase();
          const normalizedPhone = serviceOrder.customerPhone;
          const normalizedName = serviceOrder.customerName;

          let customer = await prisma.customer.findUnique({
            where: { email: normalizedEmail },
          });

          if (!customer) {
            customer = await prisma.customer.create({
              data: {
                email: normalizedEmail,
                phone: normalizedPhone,
                name: normalizedName,
              },
            });
          }

          const cookieStore = await cookies();
          cookieStore.set('client_session', JSON.stringify({
            customerId: customer.id,
            email: customer.email,
            name: customer.name,
          }), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: SESSION_MAX_AGE,
          });
        } catch (sessionError) {
          console.error('[Confirm Payment] Failed to set session for Service Order:', sessionError);
        }

        return NextResponse.json({
          success: true,
          message: 'Service order confirmed and updated to PAID',
          status: 'PAID',
          total: serviceOrder.total,
          customerName: serviceOrder.customerName,
          packageName: serviceOrder.packageName,
        });
      }

      // Fallback auto-login if already PAID
      try {
        const normalizedEmail = serviceOrder.customerEmail.toLowerCase();
        let customer = await prisma.customer.findUnique({
          where: { email: normalizedEmail },
        });

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              email: normalizedEmail,
              phone: serviceOrder.customerPhone,
              name: serviceOrder.customerName,
            },
          });
        }

        if (customer) {
          const cookieStore = await cookies();
          cookieStore.set('client_session', JSON.stringify({
            customerId: customer.id,
            email: customer.email,
            name: customer.name,
          }), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: SESSION_MAX_AGE,
          });
        }
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `Service order status: ${serviceOrder.status}`,
        status: serviceOrder.status,
      });
    }

    console.log(`[Confirm Payment] Current order status: ${order.status}`);

    // Only update if status is PENDING
    if (order.status === 'PENDING') {
      const updatedOrder = await prisma.order.update({
        where: { invoiceId },
        data: {
          status: 'PAID',
          paymentRef: reference || null,
          paidAt: new Date(),
        },
      });

      if (order.affiliateLinkId) {
        await prisma.affiliateLink.update({
          where: { id: order.affiliateLinkId },
          data: {
            conversions: {
              increment: 1,
            },
          },
        });
      }

      console.log(`[Confirm Payment] Order ${invoiceId} updated to PAID`);

      // Auto-create ClientDomain record if not exists AND we have domain info
      if (order.domain && order.domainName) {
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
                notes: `Auto-created from order ${invoiceId}`,
              },
            });
            console.log(`[Confirm Payment] ClientDomain created: ${fullDomainName}`);
          }
        } catch (domainError) {
          console.error('[Confirm Payment] Failed to create ClientDomain:', domainError);
          // Don't fail if domain creation fails
        }
      } else {
        console.warn(`[Confirm Payment] Skipping ClientDomain creation - missing domain info for order ${invoiceId}`);
      }

      // Send WA notification - don't let this failure block the success response
      try {
        const waMsg = `Halo ${order.customerName},\n\nPembayaran untuk pesanan website Anda (No Invoice: ${invoiceId}) telah *BERHASIL* dikonfirmasi.\n\nTim Exputra akan segera memproses pesanan Anda!`;
        await sendWhatsAppMessage(order.customerPhone, waMsg);
      } catch (waError) {
        console.error('[Confirm Payment] WA Notification failed:', waError);
      }

      // Auto-login for Website Order
      try {
        const normalizedEmail = order.customerEmail.toLowerCase();
        const normalizedPhone = order.customerPhone;
        const normalizedName = order.customerName;

        let customer = await prisma.customer.findUnique({
          where: { email: normalizedEmail },
        });

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              email: normalizedEmail,
              phone: normalizedPhone,
              name: normalizedName,
            },
          });
        }

        const cookieStore = await cookies();
        cookieStore.set('client_session', JSON.stringify({
          customerId: customer.id,
          email: customer.email,
          name: customer.name,
        }), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: SESSION_MAX_AGE,
        });
      } catch (sessionError) {
        console.error('[Confirm Payment] Failed to set session for Order:', sessionError);
      }

      return NextResponse.json({ 
        success: true,
        message: 'Payment confirmed and order updated',
        total: updatedOrder.total,
        customerName: updatedOrder.customerName,
        packageName: order.package?.name || '-',
      });
    } else {
      // Also try to set login session even if payment was already PAID
      try {
        const normalizedEmail = order.customerEmail.toLowerCase();
        let customer = await prisma.customer.findUnique({
          where: { email: normalizedEmail },
        });

        if (!customer) {
          customer = await prisma.customer.create({
            data: {
              email: normalizedEmail,
              phone: order.customerPhone,
              name: order.customerName,
            },
          });
        }

        if (customer) {
          const cookieStore = await cookies();
          cookieStore.set('client_session', JSON.stringify({
            customerId: customer.id,
            email: customer.email,
            name: customer.name,
          }), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: SESSION_MAX_AGE,
          });
        }
      } catch (e) {}

      console.log(`[Confirm Payment] Order status is ${order.status}, skipping update`);
      return NextResponse.json({ 
        success: true,
        message: `Order already has status: ${order.status}`,
        total: order.total,
        customerName: order.customerName,
        packageName: order.package?.name || '-',
      });
    }

  } catch (error) {
    console.error('[Confirm Payment] Error:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}

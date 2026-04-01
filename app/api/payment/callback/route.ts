import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import prisma from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/fonnte';

const prismaAny = prisma as any;

const MERCHANT_CODE = process.env.DUITKU_MERCHANT_CODE || '';
const API_KEY = process.env.DUITKU_API_KEY || '';

export async function POST(request: NextRequest) {
  try {
    console.log('[Duitku Callback] POST request received');
    
    let body;
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      // Handle x-www-form-urlencoded (standard for many callbacks)
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    }

    console.log('[Duitku Callback] Received body:', body);

    const {
      amount,
      merchantOrderId,
      resultCode,
      reference,
      signature,
    } = body;

    if (!merchantOrderId) {
      console.error('[Duitku Callback] Missing merchantOrderId');
      return NextResponse.json({
        statusCode: '01',
        statusMessage: 'Missing merchantOrderId'
      }, { status: 400 });
    }

    const expectedSignature = createHash('md5')
      .update(MERCHANT_CODE + amount + merchantOrderId + API_KEY)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('[Duitku Callback] Invalid signature!');
      console.error('   Expected:', expectedSignature);
      console.error('   Received:', signature);
      console.error('   MerchantCode:', MERCHANT_CODE);
      console.error('   Amount:', amount);
      console.error('   MerchantOrderId:', merchantOrderId);
      return NextResponse.json({
        statusCode: '01',
        statusMessage: 'Invalid Signature'
      }, { status: 400 });
    }

    if (resultCode === '00') {
      console.log(`[Duitku Callback] ✅ Payment SUCCESS for order ${merchantOrderId}`);
      console.log(`   Reference: ${reference}`);
      console.log(`   Amount: ${amount}`);

      // Find and update order status to PAID
      try {
        const existingOrder = await prisma.order.findUnique({
          where: { invoiceId: merchantOrderId },
          include: {
            domain: true,
            package: true,
          },
        });

        if (!existingOrder) {
          const existingServiceOrder = await prismaAny.serviceOrder.findUnique({
            where: { invoiceId: merchantOrderId },
          });

          if (!existingServiceOrder) {
            console.error(`[Duitku Callback] Order not found: ${merchantOrderId}`);
            return NextResponse.json({
              statusCode: '01',
              statusMessage: 'Order not found'
            }, { status: 404 });
          }

          const callbackAmount = Number(amount || 0);
          if (Number.isNaN(callbackAmount) || callbackAmount <= 0 || callbackAmount !== existingServiceOrder.total) {
            console.error(`[Duitku Callback] Amount mismatch for service order ${merchantOrderId}`, {
              callbackAmount,
              expectedAmount: existingServiceOrder.total,
            });
            return NextResponse.json({
              statusCode: '01',
              statusMessage: 'Amount mismatch'
            }, { status: 400 });
          }

          const wasPaid = existingServiceOrder.status === 'PAID';

          await prismaAny.serviceOrder.update({
            where: { invoiceId: merchantOrderId },
            data: {
              status: 'PAID',
              paymentRef: reference,
              paidAt: new Date(),
            },
          });

          if (!wasPaid && existingServiceOrder.affiliateServiceLinkId) {
            await prismaAny.affiliateServiceLink.update({
              where: { id: existingServiceOrder.affiliateServiceLinkId },
              data: {
                conversions: { increment: 1 },
              },
            });
          }

          console.log(`[Duitku Callback] ✅ Service order ${merchantOrderId} updated to PAID`);
          
          if (!wasPaid) {
            const waMsg = `Halo ${existingServiceOrder.customerName},\n\nTerima kasih, pembayaran sebesar Rp${amount.toLocaleString('id-ID')} untuk No Invoice: ${merchantOrderId} (Layanan: ${existingServiceOrder.packageName}) telah *BERHASIL* kami terima.\n\nPesanan Anda akan segera diproses tim Exputra!`;
            await sendWhatsAppMessage(existingServiceOrder.customerPhone, waMsg);
          }

          return NextResponse.json({
            statusCode: '00',
            statusMessage: 'Success'
          });
        }

        const callbackAmount = Number(amount || 0);
        if (Number.isNaN(callbackAmount) || callbackAmount <= 0 || callbackAmount !== existingOrder.total) {
          console.error(`[Duitku Callback] Amount mismatch for order ${merchantOrderId}`, {
            callbackAmount,
            expectedAmount: existingOrder.total,
          });
          return NextResponse.json({
            statusCode: '01',
            statusMessage: 'Amount mismatch'
          }, { status: 400 });
        }

        const updatedOrder = await prisma.order.update({
          where: { invoiceId: merchantOrderId },
          data: {
            status: 'PAID',
            paymentRef: reference,
            paidAt: new Date(),
          },
          include: {
            domain: true,
            package: true,
          },
        });

        console.log(`[Duitku Callback] ✅ Order ${merchantOrderId} updated to PAID`);
        
        if (existingOrder.status !== 'PAID') {
          const waMsg = `Halo ${existingOrder.customerName},\n\nTerima kasih, pembayaran sebesar Rp${amount.toLocaleString('id-ID')} untuk pesanan website (No Invoice: ${merchantOrderId}) telah *BERHASIL* kami terima.\n\nTim Exputra akan segera memproses website Anda!`;
          await sendWhatsAppMessage(existingOrder.customerPhone, waMsg);
        }

        // Auto-create ClientDomain record
        try {
          const fullDomainName = `${updatedOrder.domainName}${updatedOrder.domain.extension}`;
          const registeredAt = new Date();
          const expiredAt = new Date();
          if (updatedOrder.package) {
            expiredAt.setDate(expiredAt.getDate() + (updatedOrder.package.duration * 365));
          } else {
            expiredAt.setDate(expiredAt.getDate() + 365); // Default 1 year if no package
          }

          // Check if domain already exists
          const existingDomain = await prisma.clientDomain.findUnique({
            where: { domainName: fullDomainName }
          });

          if (!existingDomain) {
            await prisma.clientDomain.create({
              data: {
                clientEmail: updatedOrder.customerEmail,
                domainName: fullDomainName,
                registeredAt: registeredAt,
                expiredAt: expiredAt,
                status: 'ACTIVE',
                autoRenew: false,
                notes: `Auto-created from order ${merchantOrderId}`,
              },
            });
            console.log(`[Duitku Callback] ✅ ClientDomain created: ${fullDomainName}`);
          } else {
            console.log(`[Duitku Callback] ⚠️ Domain already exists: ${fullDomainName}`);
          }
        } catch (domainError) {
          console.error('[Duitku Callback] ❌ Failed to create ClientDomain:', domainError);
          // Don't fail the payment callback if domain creation fails
        }

        return NextResponse.json({
          statusCode: '00',
          statusMessage: 'Success'
        });

      } catch (updateError) {
        console.error('[Duitku Callback] Error updating order:', updateError);
        throw updateError;
      }

    } else {
      console.log(`[Duitku Callback] ❌ Payment FAILED for order ${merchantOrderId}: ${resultCode}`);

      // Update order status to CANCELLED if payment failed
      try {
        const existingOrder = await prisma.order.findUnique({ where: { invoiceId: merchantOrderId } });

        if (existingOrder) {
          if (existingOrder.status === 'PAID') {
            console.log(`[Duitku Callback] Ignore failed callback for already PAID order ${merchantOrderId}`);
            return NextResponse.json({
              statusCode: '00',
              statusMessage: 'Already paid'
            });
          }
          await prisma.order.update({
            where: { invoiceId: merchantOrderId },
            data: {
              status: 'CANCELLED',
            },
          });
          console.log(`[Duitku Callback] Order ${merchantOrderId} marked as CANCELLED`);
          
          if (existingOrder.status !== 'CANCELLED') {
            const waMsg = `Mohon maaf ${existingOrder.customerName},\n\nPembayaran untuk pesanan (No Invoice: ${merchantOrderId}) telah gagal atau dibatalkan.\nSilakan mencoba melakukan pemesanan ulang melalui platform kami.`;
            await sendWhatsAppMessage(existingOrder.customerPhone, waMsg);
          }
        } else {
          const existingServiceOrder = await prismaAny.serviceOrder.findUnique({
            where: { invoiceId: merchantOrderId },
          });

          if (existingServiceOrder?.status === 'PAID') {
            console.log(`[Duitku Callback] Ignore failed callback for already PAID service order ${merchantOrderId}`);
            return NextResponse.json({
              statusCode: '00',
              statusMessage: 'Already paid'
            });
          }

          await prismaAny.serviceOrder.update({
            where: { invoiceId: merchantOrderId },
            data: {
              status: 'CANCELLED',
            },
          });
          console.log(`[Duitku Callback] Service order ${merchantOrderId} marked as CANCELLED`);
          
          if (existingServiceOrder.status !== 'CANCELLED') {
            const waMsg = `Mohon maaf ${existingServiceOrder.customerName},\n\nPembayaran untuk Layanan ${existingServiceOrder.packageName} (No Invoice: ${merchantOrderId}) telah gagal atau dibatalkan.\nSilakan memesan kembali dari website kami.`;
            await sendWhatsAppMessage(existingServiceOrder.customerPhone, waMsg);
          }
        }
      } catch (updateError) {
        console.error('[Duitku Callback] Failed to update order to CANCELLED:', updateError);
      }

      return NextResponse.json({
        statusCode: '01',
        statusMessage: 'Payment failed'
      });
    }

  } catch (error) {
    console.error('[Duitku Callback] FATAL ERROR:', error);
    return NextResponse.json({
      statusCode: '01',
      statusMessage: 'Error processing callback'
    }, { status: 500 });
  }
}

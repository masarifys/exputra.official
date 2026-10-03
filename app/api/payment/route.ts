import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/fonnte';
import { countedOrderWhere } from '@/lib/package-order-limit';

const prismaAny = prisma as any;

const DUITKU_API_URL = process.env.DUITKU_BASE_URL ? `${process.env.DUITKU_BASE_URL}/api/merchant/v2/inquiry` : 'https://passport.duitku.com/webapi/api/merchant/v2/inquiry';
const MERCHANT_CODE = process.env.DUITKU_MERCHANT_CODE || 'D9808';
const API_KEY = process.env.DUITKU_API_KEY || '9329b1b8af27f2d3f9330075391fc250';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

class PackageLimitReachedError extends Error {
  constructor(readonly packageName: string) {
    super(`Limit order paket ${packageName} sudah habis`);
    this.name = 'PackageLimitReachedError';
  }
}

async function getPackageOrderAvailability(packageId: string) {
  const [pkg, orderCount] = await Promise.all([
    prisma.package.findUnique({
      where: { id: packageId },
      select: { id: true, name: true, isActive: true, orderLimit: true },
    }),
    prisma.order.count({
      where: { packageId, ...countedOrderWhere },
    }),
  ]);

  return {
    pkg,
    orderCount,
    isSoldOut: Boolean(pkg?.orderLimit !== null && pkg?.orderLimit !== undefined && orderCount >= pkg.orderLimit),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      orderId,
      amount,
      customerName,
      customerEmail,
      customerPhone,
      productDetails,
      paymentMethod,
      orderData,
      returnUrl,
    } = body;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const resolvedReturnUrl = typeof returnUrl === 'string' && returnUrl.trim().length > 0
      ? returnUrl
      : `${baseUrl}/order/payment/success`;

    if (orderData?.packageId && !orderData?.serviceFlow) {
      const availability = await getPackageOrderAvailability(orderData.packageId);
      if (!availability.pkg || !availability.pkg.isActive) {
        return NextResponse.json({
          success: false,
          error: 'Paket tidak tersedia atau sudah dinonaktifkan',
        }, { status: 400 });
      }
      if (availability.isSoldOut) {
        return NextResponse.json({
          success: false,
          error: `Limit order paket ${availability.pkg.name} sudah habis`,
        }, { status: 409 });
      }
    }

    const signature = createHash('md5')
      .update(MERCHANT_CODE + orderId + amount + API_KEY)
      .digest('hex');

    const payload = {
      merchantCode: MERCHANT_CODE,
      paymentAmount: amount,
      paymentMethod: paymentMethod,
      merchantOrderId: orderId,
      productDetails: productDetails || 'Website Package',
      customerVaName: customerName,
      email: customerEmail,
      phoneNumber: customerPhone,
      itemDetails: [
        {
          name: productDetails || 'Website Package',
          price: amount,
          quantity: 1
        }
      ],
      customerDetail: {
        firstName: customerName?.split(' ')[0] || 'Customer',
        lastName: customerName?.split(' ').slice(1).join(' ') || '',
        email: customerEmail,
        phoneNumber: customerPhone
      },
      callbackUrl: `${baseUrl}/api/payment/callback`,
      returnUrl: resolvedReturnUrl,
      signature: signature,
      expiryPeriod: 60
    };

    console.log('Duitku API Request:', {
      url: DUITKU_API_URL,
      merchantCode: MERCHANT_CODE,
      orderId,
      amount,
      paymentMethod,
      signatureInput: `${MERCHANT_CODE}${orderId}${amount}${API_KEY.substring(0, 8)}...`,
      signature: signature.substring(0, 20) + '...'
    });

    const response = await fetch(DUITKU_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const responseText = await response.text();
    console.log('Duitku API Response Status:', response.status);
    console.log('Duitku API Raw Response:', responseText);

    if (response.status === 401 || responseText === 'Unauthorized') {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Periksa Merchant Code dan API Key'
      }, { status: 401 });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse Duitku response:', responseText);
      return NextResponse.json({
        success: false,
        error: 'Invalid response from payment gateway: ' + responseText
      }, { status: 500 });
    }

    console.log('Duitku API Parsed Response:', data);

    if (data.statusCode === '00' || data.paymentUrl) {
      // Save order to database
      console.log('Order Data received:', orderData);
      const isServiceFlow = Boolean(orderData?.serviceFlow);
      const serviceOrderPayload = orderData?.serviceOrder;

      if (orderData && orderData.domainId && orderData.templateId && orderData.packageId) {
        try {
          let affiliateLinkId: string | null = null;

          if (orderData.affiliateCode) {
            const affiliateLink = await prisma.affiliateLink.findUnique({
              where: { code: orderData.affiliateCode },
              select: { id: true, isActive: true },
            });

            if (affiliateLink?.isActive) {
              affiliateLinkId = affiliateLink.id;
            }
          }

          // Check if order already exists
          const existingOrder = await prisma.order.findUnique({
            where: { invoiceId: orderId }
          });

          if (!existingOrder) {
            console.log('Saving new order to database:', orderId);
            await prisma.$transaction(async (transaction) => {
              await transaction.$queryRaw`
                SELECT id FROM \`package\`
                WHERE id = ${orderData.packageId}
                FOR UPDATE
              `;

              const [lockedPackage, orderCount] = await Promise.all([
                transaction.package.findUnique({
                  where: { id: orderData.packageId },
                  select: { name: true, isActive: true, orderLimit: true },
                }),
                transaction.order.count({
                  where: { packageId: orderData.packageId, ...countedOrderWhere },
                }),
              ]);

              if (
                !lockedPackage
                || !lockedPackage.isActive
                || (lockedPackage.orderLimit !== null && orderCount >= lockedPackage.orderLimit)
              ) {
                throw new PackageLimitReachedError(lockedPackage?.name || 'dipilih');
              }

              await transaction.order.create({
                data: {
                  invoiceId: orderId,
                  domainName: orderData.domainName,
                  domainId: orderData.domainId,
                  templateId: orderData.templateId,
                  packageId: orderData.packageId,
                  promoId: orderData.promoId || null,
                  customerName: customerName,
                  customerEmail: customerEmail,
                  customerPhone: customerPhone,
                  subtotal: orderData.subtotal,
                  discount: orderData.discount || 0,
                  total: amount,
                  affiliateLinkId,
                  paymentMethod: paymentMethod,
                  paymentRef: data.reference,
                  status: 'PENDING',
                  services: orderData.services?.length > 0 ? {
                    create: orderData.services.map((service: { id: string; price: number }) => ({
                      serviceId: service.id,
                      price: service.price,
                    })),
                  } : undefined,
                },
              });
            });
            console.log('New order saved:', orderId);

            // Auto-login / Session handling for Website Order
            try {
              const normalizedEmail = String(customerEmail || '').trim().toLowerCase();
              const normalizedName = String(customerName || '').trim();
              const normalizedPhone = String(customerPhone || '').trim();

              if (normalizedEmail && normalizedName && normalizedPhone) {
                let customer = await prisma.customer.findUnique({
                  where: { email: normalizedEmail },
                });

                if (customer) {
                  customer = await prisma.customer.update({
                    where: { id: customer.id },
                    data: {
                      name: normalizedName,
                      phone: normalizedPhone,
                    },
                  });
                } else {
                  customer = await prisma.customer.create({
                    data: {
                      email: normalizedEmail,
                      phone: normalizedPhone,
                      name: normalizedName,
                    },
                  });
                }

                const cookieStore = await cookies();
                cookieStore.set(
                  'client_session',
                  JSON.stringify({
                    customerId: customer.id,
                    email: customer.email,
                    name: customer.name,
                  }),
                  {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    maxAge: SESSION_MAX_AGE,
                  }
                );
              }
            } catch (sessionError) {
              console.error('Failed to set session for website order:', sessionError);
            }
            
            // Send WA Notification
            const waMsg = `Halo ${customerName},\n\nTerima kasih telah memesan website di Exputra!\nNo Invoice: ${orderId}\nTotal Tagihan: Rp${amount.toLocaleString('id-ID')}\n\nPeriksa status pembayaran Anda dan lakukan pelunasan. Terima kasih!`;
            await sendWhatsAppMessage(customerPhone, waMsg);
          } else {
            console.log('Order already exists, updating payment ref:', orderId);
            await prisma.order.update({
              where: { invoiceId: orderId },
              data: {
                affiliateLinkId: affiliateLinkId || existingOrder.affiliateLinkId,
                paymentMethod: paymentMethod,
                paymentRef: data.reference,
              }
            });
          }
        } catch (dbError) {
          if (dbError instanceof PackageLimitReachedError) {
            return NextResponse.json({
              success: false,
              error: dbError.message,
            }, { status: 409 });
          }
          console.error('Failed to save/update order:', dbError);
        }
      } else if (isServiceFlow && serviceOrderPayload?.serviceId) {
        try {
          let affiliateServiceLinkId: string | null = null;

          if (orderData?.affiliateCode) {
            const serviceAffiliateLink = await prismaAny.affiliateServiceLink.findUnique({
              where: { code: orderData.affiliateCode },
              select: {
                id: true,
                isActive: true,
                servicePackageId: true,
              },
            });

            if (
              serviceAffiliateLink?.isActive &&
              serviceOrderPayload?.servicePackageId &&
              serviceAffiliateLink.servicePackageId === serviceOrderPayload.servicePackageId
            ) {
              affiliateServiceLinkId = serviceAffiliateLink.id;
            }
          }

          const normalizedEmail = String(customerEmail || '').trim().toLowerCase();
          const normalizedName = String(customerName || '').trim();
          const normalizedPhone = String(customerPhone || '').trim();

          if (normalizedEmail && normalizedName && normalizedPhone) {
            let customer = await prisma.customer.findUnique({
              where: { email: normalizedEmail },
              select: { id: true, email: true, name: true, phone: true, company: true },
            });

            if (customer) {
              customer = await prisma.customer.update({
                where: { id: customer.id },
                data: {
                  name: normalizedName,
                  phone: normalizedPhone,
                  company: serviceOrderPayload.company || customer.company || null,
                },
                select: { id: true, email: true, name: true, phone: true, company: true },
              });
            } else {
              customer = await prisma.customer.create({
                data: {
                  email: normalizedEmail,
                  phone: normalizedPhone,
                  name: normalizedName,
                  company: serviceOrderPayload.company || null,
                },
                select: { id: true, email: true, name: true, phone: true, company: true },
              });
            }

            const cookieStore = await cookies();
            cookieStore.set(
              'client_session',
              JSON.stringify({
                customerId: customer.id,
                email: customer.email,
                name: customer.name,
              }),
              {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: SESSION_MAX_AGE,
              }
            );
          }

          const existingServiceOrder = await prismaAny.serviceOrder.findUnique({
            where: { invoiceId: orderId },
          });

          const serviceOrderData = {
            serviceId: serviceOrderPayload.serviceId,
            servicePackageId: serviceOrderPayload.servicePackageId || null,
            packageName: serviceOrderPayload.packageName || 'Paket Layanan',
            packageMultiplier: Number(serviceOrderPayload.packageMultiplier || 1),
            packageDescription: serviceOrderPayload.packageDescription || null,
            etaLabel: serviceOrderPayload.etaLabel || null,
            customerName,
            customerEmail,
            customerPhone,
            company: serviceOrderPayload.company || null,
            notes: serviceOrderPayload.notes || null,
            subtotal: Number(serviceOrderPayload.subtotal || amount),
            total: amount,
            affiliateServiceLinkId,
            paymentMethod,
            paymentRef: data.reference || null,
          };

          if (existingServiceOrder) {
            await prismaAny.serviceOrder.update({
              where: { invoiceId: orderId },
              data: serviceOrderData,
            });
          } else {
            await prismaAny.serviceOrder.create({
              data: {
                invoiceId: orderId,
                ...serviceOrderData,
              },
            });
            
            // Send WA Notification for Service Order
            const waMsg = `Halo ${customerName},\n\nTerima kasih telah memesan layanan ${serviceOrderData.packageName} di Exputra!\nNo Invoice: ${orderId}\nTotal Tagihan: Rp${amount.toLocaleString('id-ID')}\n\nSilakan selesaikan pembayaran Anda.`;
            await sendWhatsAppMessage(customerPhone, waMsg);
          }
        } catch (serviceOrderError) {
          console.error('Failed to save service order:', serviceOrderError);
        }
      } else if (!isServiceFlow) {
        console.error('Missing required order data:', {
          hasOrderData: !!orderData,
          domainId: orderData?.domainId,
          templateId: orderData?.templateId,
          packageId: orderData?.packageId,
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          paymentUrl: data.paymentUrl,
          reference: data.reference,
          vaNumber: data.vaNumber,
          amount: data.amount,
          statusCode: data.statusCode,
          statusMessage: data.statusMessage
        }
      });
    } else {
      const errorMessage = data.statusMessage || data.Message || 'Payment creation failed';

      // Localhost / Webhook failure gracefully handle: Duitku says "Bill already paid"
      if (errorMessage.includes('Bill already paid')) {
        console.log(`[Auto-Sync] Duitku indicates ${orderId} is paid. Syncing DB...`);
        try {
          // Sync Order
          await prisma.order.updateMany({
            where: { invoiceId: orderId, status: { not: 'PAID' } },
            data: { status: 'PAID', paidAt: new Date(), paymentMethod }
          });
          // Sync Service Order
          await prismaAny.serviceOrder.updateMany({
            where: { invoiceId: orderId, status: { not: 'PAID' } },
            data: { status: 'PAID', paidAt: new Date(), paymentMethod }
          });
          // Sync Admin Invoice
          await prisma.invoice.updateMany({
            where: { invoiceNumber: orderId, status: { not: 'PAID' } },
            data: { status: 'PAID', amountPaid: amount }
          });
        } catch (syncError) {
          console.error('[Auto-Sync] Failed to sync paid status:', syncError);
        }
      }

      return NextResponse.json({
        success: false,
        error: errorMessage,
        details: data
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Payment API Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

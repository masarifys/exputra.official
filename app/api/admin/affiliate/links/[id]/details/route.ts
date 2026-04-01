import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Try finding in AffiliateLink
    const affiliateLink = await prisma.affiliateLink.findUnique({
      where: { id },
      include: {
        package: true,
        customer: true,
        visits: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        orders: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            invoiceId: true,
            customerName: true,
            customerEmail: true,
            total: true,
            status: true,
            paidAt: true,
            createdAt: true,
          }
        }
      }
    });

    if (affiliateLink) {
      const linkData = affiliateLink as any;
      return NextResponse.json({
        success: true,
        type: 'package',
        link: {
          id: linkData.id,
          code: linkData.code,
          packageName: linkData.package.name,
          owner: linkData.customer.name,
          ownerEmail: linkData.customer.email,
        },
        visits: linkData.visits,
        conversions: linkData.orders.map((order: any) => ({
            id: order.id,
            invoiceId: order.invoiceId,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            total: order.total,
            status: order.status,
            createdAt: order.createdAt,
            paidAt: order.paidAt,
        }))
      });
    }

    // Try finding in AffiliateServiceLink
    const serviceLink = await prisma.affiliateServiceLink.findUnique({
      where: { id },
      include: {
        servicePackage: true,
        customer: true,
        visits: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        serviceOrders: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            invoiceId: true,
            customerName: true,
            customerEmail: true,
            total: true,
            status: true,
            paidAt: true,
            createdAt: true,
          }
        }
      }
    });

    if (serviceLink) {
      const linkData = serviceLink as any;
      return NextResponse.json({
        success: true,
        type: 'service',
        link: {
          id: linkData.id,
          code: linkData.code,
          packageName: linkData.servicePackage.name,
          owner: linkData.customer.name,
          ownerEmail: linkData.customer.email,
        },
        visits: linkData.visits,
        conversions: linkData.serviceOrders.map((order: any) => ({
            id: order.id,
            invoiceId: order.invoiceId,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            total: order.total,
            status: order.status,
            createdAt: order.createdAt,
            paidAt: order.paidAt,
        }))
      });
    }

    return NextResponse.json({ message: 'Link details not found' }, { status: 404 });
  } catch (error) {
    console.error('[Admin Affiliate Details] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

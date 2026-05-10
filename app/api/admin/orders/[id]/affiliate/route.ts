import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { affiliatorId } = body;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { package: true }
    });

    if (!order) {
      return NextResponse.json({ message: 'Order not found' }, { status: 404 });
    }

    if (!order.packageId) {
      return NextResponse.json({ message: 'Order must have a package to be assigned to an affiliator' }, { status: 400 });
    }

    if (!affiliatorId) {
      // Remove affiliate assignment
      const updated = await prisma.order.update({
        where: { id },
        data: { affiliateLinkId: null }
      });
      return NextResponse.json({ success: true, data: updated });
    }

    // Check if the affiliator has an active request
    const customer = await prisma.customer.findUnique({
      where: { id: affiliatorId },
      include: {
        affiliateRequests: { where: { status: 'APPROVED' } }
      }
    });

    if (!customer || customer.affiliateRequests.length === 0) {
      return NextResponse.json({ message: 'Affiliator not found or not active' }, { status: 404 });
    }

    const affiliateCode = customer.affiliateRequests[0].affiliateCode;

    // Find or create AffiliateLink for this package
    let affiliateLink = await prisma.affiliateLink.findFirst({
      where: {
        customerId: affiliatorId,
        packageId: order.packageId
      }
    });

    if (!affiliateLink) {
      // Create it
      // Generate a unique code combining the affiliator's base code and package ID suffix
      const shortPkgId = order.packageId.substring(0, 4);
      let newCode = `${affiliateCode}-${shortPkgId}`;
      
      // Ensure code is unique
      let codeExists = await prisma.affiliateLink.findUnique({ where: { code: newCode } });
      let counter = 1;
      while (codeExists) {
        newCode = `${affiliateCode}-${shortPkgId}-${counter}`;
        codeExists = await prisma.affiliateLink.findUnique({ where: { code: newCode } });
        counter++;
      }

      affiliateLink = await prisma.affiliateLink.create({
        data: {
          customerId: affiliatorId,
          packageId: order.packageId,
          code: newCode,
          isActive: true,
        }
      });
    }

    // Update the order with the new affiliateLinkId
    const updated = await prisma.order.update({
      where: { id },
      data: { affiliateLinkId: affiliateLink.id }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Assign Affiliate Error:', error);
    return NextResponse.json({ message: error.message || 'Failed to assign affiliate' }, { status: 500 });
  }
}

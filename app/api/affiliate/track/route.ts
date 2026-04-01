import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ message: 'Missing affiliate code' }, { status: 400 });
    }

    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const referrer = request.headers.get('referrer') || request.headers.get('referer') || 'direct';

    // Try to find in regular AffiliateLink
    const affiliateLink = await prisma.affiliateLink.findUnique({
      where: { code },
    });

    if (affiliateLink) {
      await prisma.$transaction([
        prisma.affiliateLink.update({
          where: { id: affiliateLink.id },
          data: { clicks: { increment: 1 } },
        }),
        prisma.affiliateVisit.create({
          data: {
            affiliateLinkId: affiliateLink.id,
            ipAddress,
            userAgent,
            referrer,
          },
        }),
      ]);

      return NextResponse.json({ success: true, type: 'package' });
    }

    // Try to find in AffiliateServiceLink
    const serviceLink = await prisma.affiliateServiceLink.findUnique({
      where: { code },
    });

    if (serviceLink) {
      await prisma.$transaction([
        prisma.affiliateServiceLink.update({
          where: { id: serviceLink.id },
          data: { clicks: { increment: 1 } },
        }),
        prisma.affiliateVisit.create({
          data: {
            affiliateServiceLinkId: serviceLink.id,
            ipAddress,
            userAgent,
            referrer,
          },
        }),
      ]);

      return NextResponse.json({ success: true, type: 'service' });
    }

    return NextResponse.json({ message: 'Invalid affiliate code' }, { status: 404 });
  } catch (error) {
    console.error('[Affiliate Track] Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

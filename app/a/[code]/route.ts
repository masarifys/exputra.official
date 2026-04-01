import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

function extractClientIp(request: NextRequest): string | null {
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    return xForwardedFor.split(',')[0]?.trim() || null;
  }

  return request.headers.get('x-real-ip');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;

  if (!code) {
    return NextResponse.redirect(new URL('/order', request.url));
  }

  const link = await prisma.affiliateLink.findUnique({
    where: { code },
    include: {
      package: {
        select: {
          id: true,
          isActive: true,
        },
      },
    },
  });

  if (!link || !link.isActive || !link.package.isActive) {
    return NextResponse.redirect(new URL('/order', request.url));
  }

  await prisma.$transaction([
    prisma.affiliateVisit.create({
      data: {
        affiliateLinkId: link.id,
        ipAddress: extractClientIp(request),
        userAgent: request.headers.get('user-agent'),
        referrer: request.headers.get('referer'),
      },
    }),
    prisma.affiliateLink.update({
      where: { id: link.id },
      data: {
        clicks: {
          increment: 1,
        },
      },
    }),
  ]);

  const redirectUrl = new URL('/order', request.url);
  redirectUrl.searchParams.set('aff', code);
  redirectUrl.searchParams.set('pkg', link.packageId);

  return NextResponse.redirect(redirectUrl);
}

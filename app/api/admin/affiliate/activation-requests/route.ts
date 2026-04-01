import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const requests = await prisma.affiliateRequest.findMany({
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    const counts = requests.reduce(
      (acc, item) => {
        if (item.status === 'PENDING') acc.PENDING += 1;
        if (item.status === 'APPROVED') acc.APPROVED += 1;
        if (item.status === 'REJECTED') acc.REJECTED += 1;
        return acc;
      },
      { PENDING: 0, APPROVED: 0, REJECTED: 0 }
    );

    return NextResponse.json({
      requests,
      counts,
      total: requests.length,
    });
  } catch (error) {
    console.error('Get Affiliate Activation Requests Error:', error);
    return NextResponse.json({ message: 'Failed to fetch activation requests' }, { status: 500 });
  }
}

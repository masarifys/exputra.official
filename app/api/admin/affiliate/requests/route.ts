import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where = status && status !== 'ALL'
      ? { status: status as 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID' }
      : {};

    const requests = await prisma.affiliatePayoutRequest.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        bankAccount: {
          select: {
            id: true,
            bankName: true,
            accountNumber: true,
            accountHolderName: true,
            branch: true,
            ktpImageUrl: true,
            isVerified: true,
            verifiedAt: true,
            verifiedBy: true,
            rejectedAt: true,
            rejectedBy: true,
            rejectionReason: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { requestedAt: 'desc' },
      ],
    });

    const counts = requests.reduce(
      (acc, item) => {
        acc[item.status] += 1;
        return acc;
      },
      { PENDING: 0, APPROVED: 0, REJECTED: 0, PAID: 0 }
    );

    return NextResponse.json({
      requests,
      counts,
      total: requests.length,
    });
  } catch (error) {
    console.error('Get Affiliate Payout Requests Error:', error);
    return NextResponse.json({ message: 'Failed to fetch affiliate requests' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const onlyPending = searchParams.get('pending') === 'true';

    const where = onlyPending ? { isVerified: false, rejectedAt: null } : {};

    const bankAccounts = await prisma.affiliateBankAccount.findMany({
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
        payoutRequests: {
          orderBy: { requestedAt: 'desc' },
          take: 1,
          select: {
            id: true,
            status: true,
            requestedAmount: true,
            requestedAt: true,
          },
        },
      },
      orderBy: [{ isVerified: 'asc' }, { updatedAt: 'desc' }],
    });

    return NextResponse.json({
      bankAccounts,
      total: bankAccounts.length,
      pendingCount: bankAccounts.filter((item: { isVerified: boolean; rejectedAt?: Date | null }) => !item.isVerified && !item.rejectedAt).length,
    });
  } catch (error) {
    console.error('Get Affiliate Bank Accounts Error:', error);
    return NextResponse.json({ message: 'Failed to fetch bank accounts' }, { status: 500 });
  }
}

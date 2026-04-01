import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveClientSessionCustomer } from '@/lib/client-session';
import { getCommissionPercentByTarget, parseAffiliateSyncConfig } from '@/lib/affiliate-config';

const prismaAny = prisma as any;

async function getAvailableAffiliateBalance(customerId: string): Promise<number> {
  const [settingsRow] = await prisma.$queryRaw<Array<{ commissionPercent: number; syncedPackageIds: string | null }>>`
    SELECT commissionPercent, syncedPackageIds
    FROM affiliatesetting
    ORDER BY createdAt DESC
    LIMIT 1
  `;

  const commissionPercent = Number(settingsRow?.commissionPercent ?? process.env.AFFILIATE_COMMISSION_PERCENT ?? '10');
  const parsedConfig = parseAffiliateSyncConfig(settingsRow?.syncedPackageIds ?? null);

  const [links, serviceLinks, payoutRequests] = await Promise.all([
    prisma.affiliateLink.findMany({
      where: { customerId },
      include: {
        package: {
          select: {
            id: true,
          },
        },
        orders: {
          where: { status: 'PAID' },
          select: { total: true },
        },
      },
    }),
    prismaAny.affiliateServiceLink.findMany({
      where: { customerId },
      include: {
        servicePackage: {
          select: {
            id: true,
          },
        },
        serviceOrders: {
          where: { status: 'PAID' },
          select: { total: true },
        },
      },
    }),
    prisma.affiliatePayoutRequest.findMany({
      where: { customerId },
      select: {
        status: true,
        requestedAmount: true,
        approvedAmount: true,
      },
    }),
  ]);

  const packageCommission = links.reduce((sum, link) => {
    const linkRevenue = link.orders.reduce((orderSum, order) => orderSum + order.total, 0);
    const linkCommissionPercent = getCommissionPercentByTarget({
      defaultPercent: commissionPercent,
      config: parsedConfig,
      packageId: link.packageId,
    });
    return sum + Math.round((linkRevenue * linkCommissionPercent) / 100);
  }, 0);

  const serviceCommission = serviceLinks.reduce((sum, link) => {
    const linkRevenue = link.serviceOrders.reduce((orderSum, order) => orderSum + order.total, 0);
    const linkCommissionPercent = getCommissionPercentByTarget({
      defaultPercent: commissionPercent,
      config: parsedConfig,
      servicePackageId: link.servicePackageId,
    });
    return sum + Math.round((linkRevenue * linkCommissionPercent) / 100);
  }, 0);

  const totalCommission = packageCommission + serviceCommission;

  const reservedBalance = payoutRequests
    .filter((item) => item.status !== 'REJECTED')
    .reduce((sum, item) => sum + (item.approvedAmount ?? item.requestedAmount), 0);

  return Math.max(totalCommission - reservedBalance, 0);
}

export async function POST(request: NextRequest) {
  try {
    const session = await resolveClientSessionCustomer();
    const customerId = session?.customerId;

    if (!customerId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const amount = Number(body.amount || 0);
    const bankName = String(body.bankName || '').trim();
    const accountNumber = String(body.accountNumber || '').trim();
    const accountHolderName = String(body.accountHolderName || '').trim();
    const branch = String(body.branch || '').trim();
    const customerNote = String(body.customerNote || '').trim();

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ message: 'Jumlah payout tidak valid' }, { status: 400 });
    }

    if (!bankName || !accountNumber || !accountHolderName) {
      return NextResponse.json({ message: 'Data rekening wajib dilengkapi' }, { status: 400 });
    }

    const availableBalance = await getAvailableAffiliateBalance(customerId);

    if (amount > availableBalance) {
      return NextResponse.json(
        { message: `Saldo affiliate tidak cukup. Saldo tersedia: IDR ${availableBalance.toLocaleString('id-ID')}` },
        { status: 400 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const bankAccount = await tx.affiliateBankAccount.upsert({
        where: { customerId },
        update: {
          bankName,
          accountNumber,
          accountHolderName,
          branch: branch || null,
          isVerified: false,
          verifiedAt: null,
          verifiedBy: null,
        },
        create: {
          customerId,
          bankName,
          accountNumber,
          accountHolderName,
          branch: branch || null,
        },
      });

      const payoutRequest = await tx.affiliatePayoutRequest.create({
        data: {
          customerId,
          bankAccountId: bankAccount.id,
          requestedAmount: Math.round(amount),
          status: 'PENDING',
          customerNote: customerNote || null,
        },
      });

      return { bankAccount, payoutRequest };
    });

    return NextResponse.json({
      success: true,
      message: 'Permintaan payout berhasil dikirim dan menunggu konfirmasi admin',
      data: result,
    });
  } catch (error) {
    console.error('Create Affiliate Payout Request Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

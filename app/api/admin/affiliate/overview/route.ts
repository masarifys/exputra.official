import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCommissionPercentByTarget, parseAffiliateSyncConfig } from '@/lib/affiliate-config';

const prismaAny = prisma as any;

type AffiliateSettingRow = {
  id: string;
  commissionPercent: number;
  minPayout: number;
  adminFeePercent: number;
  rules: string | null;
  syncedPackageIds: string | null;
};

type AffiliateServiceLinkRow = {
  id: string;
  code: string;
  servicePackageId: string;
  customerId: string;
  isActive: boolean;
  clicks: number;
  conversions: number;
  createdAt: Date;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: 'ACTIVE' | 'INACTIVE';
  };
  servicePackage: {
    id: string;
    name: string;
    service: {
      id: string;
      name: string;
    };
  };
  serviceOrders: Array<{
    id: string;
    invoiceId: string;
    total: number;
    status: string;
    createdAt: Date;
    paidAt: Date | null;
  }>;
};

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function getLastMonths(total: number) {
  const result: string[] = [];
  const now = new Date();

  for (let i = total - 1; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(getMonthKey(date));
  }

  return result;
}

export async function GET() {
  try {
    const [setting] = await prisma.$queryRaw<AffiliateSettingRow[]>`
      SELECT id, commissionPercent, minPayout, adminFeePercent, rules, syncedPackageIds
      FROM affiliatesetting
      ORDER BY createdAt DESC
      LIMIT 1
    `;

    const commissionPercent = Number(setting?.commissionPercent ?? process.env.AFFILIATE_COMMISSION_PERCENT ?? '10');
    const minPayout = Number(setting?.minPayout ?? 50000);
    const adminFeePercent = Number(setting?.adminFeePercent ?? 0);
    const rules = setting?.rules || 'Affiliate wajib menggunakan rekening atas nama sendiri dan dilarang melakukan fraud traffic.';
    const parsedConfig = parseAffiliateSyncConfig(setting?.syncedPackageIds ?? null);

    const [links, rawServiceLinks, visits, payouts, bankAccounts, packages] = await Promise.all([
      prisma.affiliateLink.findMany({
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              status: true,
            },
          },
          package: {
            select: {
              id: true,
              name: true,
              price: true,
              price1Year: true,
            },
          },
          orders: {
            select: {
              id: true,
              invoiceId: true,
              total: true,
              status: true,
              createdAt: true,
              paidAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prismaAny.affiliateServiceLink.findMany({
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              status: true,
            },
          },
          servicePackage: {
            select: {
              id: true,
              name: true,
              service: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          serviceOrders: {
            select: {
              id: true,
              invoiceId: true,
              total: true,
              status: true,
              createdAt: true,
              paidAt: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.affiliateVisit.findMany({
        select: {
          id: true,
          createdAt: true,
        },
      }),
      prisma.affiliatePayoutRequest.findMany({
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
              isVerified: true,
              rejectedAt: true,
              rejectionReason: true,
            },
          },
        },
        orderBy: { requestedAt: 'desc' },
      }),
      prisma.affiliateBankAccount.findMany({
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
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.package.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          price: true,
          price1Year: true,
          isActive: true,
          isPopular: true,
        },
        orderBy: [{ isPopular: 'desc' }, { name: 'asc' }],
      }),
    ]);

    const serviceLinks = rawServiceLinks as AffiliateServiceLinkRow[];

    const usersMap = new Map<string, {
      id: string;
      name: string;
      email: string;
      phone: string;
      status: 'ACTIVE' | 'INACTIVE';
      linkCount: number;
      clicks: number;
      conversions: number;
      revenue: number;
      totalCommission: number;
    }>();

    const transactions: Array<{
      id: string;
      invoiceId: string;
      customerId: string;
      customerName: string;
      packageName: string;
      orderTotal: number;
      commission: number;
      status: 'PENDING' | 'VERIFIED' | 'PAID';
      createdAt: Date;
    }> = [];

    links.forEach((link) => {
      const paidOrders = link.orders.filter((order) => ['PAID', 'PROCESSING', 'COMPLETED'].includes(order.status));
      const revenue = paidOrders.reduce((sum, order) => sum + order.total, 0);
      const linkCommissionPercent = getCommissionPercentByTarget({
        defaultPercent: commissionPercent,
        config: parsedConfig,
        packageId: link.packageId,
      });
      const commission = Math.round((revenue * linkCommissionPercent) / 100);

      const current = usersMap.get(link.customerId);

      if (current) {
        current.linkCount += 1;
        current.clicks += link.clicks;
        current.conversions += link.conversions;
        current.revenue += revenue;
        current.totalCommission += commission;
      } else {
        usersMap.set(link.customerId, {
          id: link.customer.id,
          name: link.customer.name,
          email: link.customer.email,
          phone: link.customer.phone,
          status: link.customer.status,
          linkCount: 1,
          clicks: link.clicks,
          conversions: link.conversions,
          revenue,
          totalCommission: commission,
        });
      }

      link.orders.forEach((order) => {
        const txCommission = Math.round((order.total * linkCommissionPercent) / 100);
        transactions.push({
          id: order.id,
          invoiceId: order.invoiceId,
          customerId: link.customer.id,
          customerName: link.customer.name,
          packageName: link.package.name,
          orderTotal: order.total,
          commission: txCommission,
          status: ['PAID', 'PROCESSING', 'COMPLETED'].includes(order.status) ? 'VERIFIED' : 'PENDING',
          createdAt: order.createdAt,
        });
      });
    });

    serviceLinks.forEach((link) => {
      const paidOrders = link.serviceOrders.filter((order) => ['PAID', 'PROCESSING', 'COMPLETED'].includes(order.status));
      const revenue = paidOrders.reduce((sum, order) => sum + order.total, 0);
      const serviceCommissionPercent = getCommissionPercentByTarget({
        defaultPercent: commissionPercent,
        config: parsedConfig,
        servicePackageId: link.servicePackageId,
      });
      const commission = Math.round((revenue * serviceCommissionPercent) / 100);

      const current = usersMap.get(link.customerId);

      if (current) {
        current.linkCount += 1;
        current.clicks += link.clicks;
        current.conversions += link.conversions;
        current.revenue += revenue;
        current.totalCommission += commission;
      } else {
        usersMap.set(link.customerId, {
          id: link.customer.id,
          name: link.customer.name,
          email: link.customer.email,
          phone: link.customer.phone,
          status: link.customer.status,
          linkCount: 1,
          clicks: link.clicks,
          conversions: link.conversions,
          revenue,
          totalCommission: commission,
        });
      }

      link.serviceOrders.forEach((order) => {
        const txCommission = Math.round((order.total * serviceCommissionPercent) / 100);
        transactions.push({
          id: order.id,
          invoiceId: order.invoiceId,
          customerId: link.customer.id,
          customerName: link.customer.name,
          packageName: `${link.servicePackage.service.name} - ${link.servicePackage.name}`,
          orderTotal: order.total,
          commission: txCommission,
          status: ['PAID', 'PROCESSING', 'COMPLETED'].includes(order.status) ? 'VERIFIED' : 'PENDING',
          createdAt: order.createdAt,
        });
      });
    });

    const users = Array.from(usersMap.values()).sort((a, b) => b.totalCommission - a.totalCommission);

    const paidPayoutTotal = payouts
      .filter((item) => item.status === 'PAID')
      .reduce((sum, item) => sum + (item.approvedAmount ?? item.requestedAmount), 0);

    const unpaidPayoutTotal = payouts
      .filter((item) => item.status === 'PENDING' || item.status === 'APPROVED')
      .reduce((sum, item) => sum + (item.approvedAmount ?? item.requestedAmount), 0);

    const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);
    const totalConversions = links.reduce((sum, link) => sum + link.conversions, 0);
    const totalRevenue = transactions
      .filter((item) => item.status === 'VERIFIED' || item.status === 'PAID')
      .reduce((sum, item) => sum + item.orderTotal, 0);

    const allCommission = transactions.reduce((sum, item) => sum + item.commission, 0);

    const months = getLastMonths(6);
    const clickMap = new Map<string, number>();
    const conversionMap = new Map<string, number>();
    const revenueMap = new Map<string, number>();

    months.forEach((month) => {
      clickMap.set(month, 0);
      conversionMap.set(month, 0);
      revenueMap.set(month, 0);
    });

    visits.forEach((visit) => {
      const key = getMonthKey(new Date(visit.createdAt));
      if (!clickMap.has(key)) return;
      clickMap.set(key, (clickMap.get(key) || 0) + 1);
    });

    transactions.forEach((tx) => {
      if (tx.status !== 'VERIFIED' && tx.status !== 'PAID') return;
      const key = getMonthKey(new Date(tx.createdAt));
      if (!conversionMap.has(key)) return;
      conversionMap.set(key, (conversionMap.get(key) || 0) + 1);
      revenueMap.set(key, (revenueMap.get(key) || 0) + tx.orderTotal);
    });

    const performance = months.map((month) => ({
      month,
      clicks: clickMap.get(month) || 0,
      conversions: conversionMap.get(month) || 0,
      revenue: revenueMap.get(month) || 0,
    }));

    const campaignLinks = links.map((link) => {
      const revenue = link.orders
        .filter((order) => ['PAID', 'PROCESSING', 'COMPLETED'].includes(order.status))
        .reduce((sum, order) => sum + order.total, 0);
      const linkCommissionPercent = getCommissionPercentByTarget({
        defaultPercent: commissionPercent,
        config: parsedConfig,
        packageId: link.packageId,
      });
      const commission = Math.round((revenue * linkCommissionPercent) / 100);

      return {
        id: link.id,
        code: link.code,
        packageId: link.packageId,
        packageName: link.package.name,
        customerId: link.customer.id,
        customerName: link.customer.name,
        isActive: link.isActive,
        clicks: link.clicks,
        conversions: link.conversions,
        revenue,
        commission,
        commissionPercent: linkCommissionPercent,
        createdAt: link.createdAt,
      };
    });

    const serviceCampaignLinks = serviceLinks.map((link) => {
      const revenue = link.serviceOrders
        .filter((order) => ['PAID', 'PROCESSING', 'COMPLETED'].includes(order.status))
        .reduce((sum, order) => sum + order.total, 0);
      const appliedCommissionPercent = getCommissionPercentByTarget({
        defaultPercent: commissionPercent,
        config: parsedConfig,
        servicePackageId: link.servicePackageId,
      });
      const commission = Math.round((revenue * appliedCommissionPercent) / 100);

      return {
        id: link.id,
        code: link.code,
        packageId: link.servicePackageId,
        packageName: link.servicePackage.name,
        serviceName: link.servicePackage.service.name,
        customerId: link.customer.id,
        customerName: link.customer.name,
        isActive: link.isActive,
        clicks: link.clicks,
        conversions: link.conversions,
        revenue,
        commission,
        commissionPercent: appliedCommissionPercent,
        createdAt: link.createdAt,
      };
    });

    return NextResponse.json({
      dashboard: {
        totalAffiliates: users.length,
        totalClicks,
        totalConversions,
        totalCommission: allCommission,
        totalRevenue,
        commissionPending: unpaidPayoutTotal,
        commissionPaid: paidPayoutTotal,
        performance,
      },
      users,
      campaignLinks: [...campaignLinks, ...serviceCampaignLinks],
      packages,
      transactions: transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
      payouts,
      bankAccounts,
      counts: {
        payoutPending: payouts.filter((item) => item.status === 'PENDING').length,
        payoutApproved: payouts.filter((item) => item.status === 'APPROVED').length,
        payoutRejected: payouts.filter((item) => item.status === 'REJECTED').length,
        payoutPaid: payouts.filter((item) => item.status === 'PAID').length,
        bankPending: bankAccounts.filter((item) => !item.isVerified && !item.rejectedAt).length,
      },
      config: {
        commissionPercent,
        minPayout,
        adminFeePercent,
        rules,
        syncedPackageIds: parsedConfig.syncedPackageIds,
        syncedServicePackageIds: parsedConfig.syncedServicePackageIds,
        packageCommissions: parsedConfig.packageCommissions,
        serviceCommissions: parsedConfig.serviceCommissions,
      },
    });
  } catch (error) {
    console.error('Get Affiliate Overview Error:', error);
    return NextResponse.json({ message: 'Failed to fetch affiliate overview' }, { status: 500 });
  }
}

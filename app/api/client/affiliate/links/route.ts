import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveClientSessionCustomer } from '@/lib/client-session';
import { getCommissionPercentByTarget, parseAffiliateSyncConfig } from '@/lib/affiliate-config';

const prismaAny = prisma as any;

function buildBaseUrl(request: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    `${request.nextUrl.protocol}//${request.nextUrl.host}`
  );
}

function randomCode(prefix: string): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 8; i += 1) {
    suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `${prefix}${suffix}`;
}

export async function GET(request: NextRequest) {
  try {
    const [settingsRow] = await prisma.$queryRaw<Array<{ commissionPercent: number; syncedPackageIds: string | null }>>`
      SELECT commissionPercent, syncedPackageIds
      FROM affiliatesetting
      ORDER BY createdAt DESC
      LIMIT 1
    `;

    const commissionPercent = Number(settingsRow?.commissionPercent ?? process.env.AFFILIATE_COMMISSION_PERCENT ?? '10');
    const parsedConfig = parseAffiliateSyncConfig(settingsRow?.syncedPackageIds ?? null);
    const syncedPackageIds = parsedConfig.syncedPackageIds;
    const syncedServicePackageIds = parsedConfig.syncedServicePackageIds;
    const session = await resolveClientSessionCustomer();
    const customerId = session?.customerId;

    const [packages, servicePackages, links, serviceLinks, bankAccount, payoutRequests] = await Promise.all([
      prisma.package.findMany({
        where: {
          id: { in: syncedPackageIds },
        },
        select: {
          id: true,
          name: true,
          price: true,
          price1Year: true,
          isPopular: true,
          discountBadge: true,
        },
        orderBy: [{ isPopular: 'desc' }, { duration: 'asc' }, { name: 'asc' }],
      }),
      prisma.servicePackage.findMany({
        where: {
          id: { in: syncedServicePackageIds },
        },
        select: {
          id: true,
          name: true,
          price: true,
          service: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: [{ service: { name: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
      }),
      prisma.affiliateLink.findMany({
        where: { customerId },
        include: {
          package: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: { visits: true, orders: true },
          },
          orders: {
            where: { status: 'PAID' },
            select: { total: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prismaAny.affiliateServiceLink.findMany({
        where: { customerId },
        include: {
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
            where: { status: 'PAID' },
            select: { total: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.affiliateBankAccount.findFirst({
        where: { customerId },
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
          updatedAt: true,
        },
      }),
      prisma.affiliatePayoutRequest.findMany({
        where: { customerId },
        include: {
          bankAccount: {
            select: {
              id: true,
              bankName: true,
              accountNumber: true,
              accountHolderName: true,
              isVerified: true,
            },
          },
        },
        orderBy: { requestedAt: 'desc' },
      }),
    ]);

    const baseUrl = buildBaseUrl(request);

    const packageItems = packages.map(pkg => {
      const appliedCommissionPercent = getCommissionPercentByTarget({
        defaultPercent: commissionPercent,
        config: parsedConfig,
        packageId: pkg.id,
      });
      const price = pkg.price1Year || pkg.price || 0;
      return {
        ...pkg,
        estimatedCommission: Math.round((price * appliedCommissionPercent) / 100),
      };
    });

    const servicePackageItems = servicePackages.map(pkg => {
      const appliedCommissionPercent = getCommissionPercentByTarget({
        defaultPercent: commissionPercent,
        config: parsedConfig,
        servicePackageId: pkg.id,
      });
      return {
        ...pkg,
        estimatedCommission: Math.round((pkg.price * appliedCommissionPercent) / 100),
      };
    });

    const packageLinkItems = links.map((link: (typeof links)[number]) => {
      const paidOrders = link.orders.length;
      const revenue = link.orders.reduce((sum: number, item: { total: number }) => sum + item.total, 0);
      const appliedCommissionPercent = getCommissionPercentByTarget({
        defaultPercent: commissionPercent,
        config: parsedConfig,
        packageId: link.packageId,
      });
      const commission = Math.round((revenue * appliedCommissionPercent) / 100);

      return {
        id: link.id,
        linkType: 'PACKAGE' as const,
        code: link.code,
        packageId: link.packageId,
        packageName: link.package.name,
        servicePackageId: null,
        serviceName: null,
        isActive: link.isActive,
        clicks: link.clicks || link._count.visits,
        conversions: link.conversions || paidOrders,
        paidOrders,
        revenue,
        commission,
        commissionPercent: appliedCommissionPercent,
        createdAt: link.createdAt,
        shareUrl: `${baseUrl}/order?aff=${encodeURIComponent(link.code)}&pkg=${encodeURIComponent(link.packageId)}`,
      };
    });

    const serviceLinkItems = serviceLinks.map((link: (typeof serviceLinks)[number]) => {
      const paidOrders = link.serviceOrders.length;
      const revenue = link.serviceOrders.reduce((sum: number, item: { total: number }) => sum + item.total, 0);
      const appliedCommissionPercent = getCommissionPercentByTarget({
        defaultPercent: commissionPercent,
        config: parsedConfig,
        servicePackageId: link.servicePackageId,
      });
      const commission = Math.round((revenue * appliedCommissionPercent) / 100);

      return {
        id: link.id,
        linkType: 'SERVICE' as const,
        code: link.code,
        packageId: null,
        packageName: link.servicePackage.name,
        servicePackageId: link.servicePackageId,
        serviceName: link.servicePackage.service.name,
        isActive: link.isActive,
        clicks: link.clicks,
        conversions: link.conversions || paidOrders,
        paidOrders,
        revenue,
        commission,
        commissionPercent: appliedCommissionPercent,
        createdAt: link.createdAt,
        shareUrl: `${baseUrl}/services?aff=${encodeURIComponent(link.code)}&spkg=${encodeURIComponent(link.servicePackageId)}`,
      };
    });

    const linkItems = [...packageLinkItems, ...serviceLinkItems].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const totalCommission = linkItems.reduce((sum, item) => sum + item.commission, 0);
    const reservedBalance = payoutRequests
      .filter((item) => item.status !== 'REJECTED')
      .reduce((sum, item) => sum + (item.approvedAmount ?? item.requestedAmount), 0);
    const availableBalance = Math.max(totalCommission - reservedBalance, 0);

    return NextResponse.json({
      packages: packageItems,
      servicePackages: servicePackageItems,
      links: linkItems,
      syncInfo: {
        packageCount: parsedConfig.syncedPackageIds.length,
        servicePackageCount: parsedConfig.syncedServicePackageIds.length,
      },
      wallet: {
        totalCommission,
        reservedBalance,
        availableBalance,
      },
      bankAccount,
      payoutRequests,
    });
  } catch (error) {
    console.error('Get Affiliate Links Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const [settingsRow] = await prisma.$queryRaw<Array<{ syncedPackageIds: string | null }>>`
      SELECT syncedPackageIds
      FROM affiliatesetting
      ORDER BY createdAt DESC
      LIMIT 1
    `;

    const parsedConfig = parseAffiliateSyncConfig(settingsRow?.syncedPackageIds ?? null);
    const syncedPackageIds = parsedConfig.syncedPackageIds;
    const syncedServicePackageIds = parsedConfig.syncedServicePackageIds;

    const session = await resolveClientSessionCustomer();
    const customerId = session?.customerId;

    if (!customerId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const packageId = body?.packageId ? String(body.packageId) : '';
    const servicePackageId = body?.servicePackageId ? String(body.servicePackageId) : '';

    if (!packageId && !servicePackageId) {
      return NextResponse.json({ message: 'packageId atau servicePackageId wajib diisi' }, { status: 400 });
    }

    if (packageId) {
      if (!syncedPackageIds.includes(packageId)) {
        return NextResponse.json({ message: 'Paket belum tersedia untuk affiliate saat ini' }, { status: 403 });
      }

      const pkg = await prisma.package.findFirst({
        where: {
          id: packageId,
        },
        select: { id: true, name: true },
      });

      if (!pkg) {
        return NextResponse.json({ message: 'Paket tidak ditemukan' }, { status: 404 });
      }

      const existing = await prisma.affiliateLink.findUnique({
        where: {
          customerId_packageId: {
            customerId,
            packageId,
          },
        },
      });

      let link = existing;

      if (!link) {
        const customerPrefix = customerId.slice(0, 4).toUpperCase();
        let code = randomCode(`${customerPrefix}-`);

        for (let i = 0; i < 6; i += 1) {
          const duplicate = await prisma.affiliateLink.findUnique({ where: { code } });
          if (!duplicate) break;
          code = randomCode(`${customerPrefix}-`);
        }

        link = await prisma.affiliateLink.create({
          data: {
            code,
            customerId,
            packageId,
            isActive: true,
          },
        });
      }

      const baseUrl = buildBaseUrl(request);

      return NextResponse.json({
        success: true,
        link: {
          id: link.id,
          code: link.code,
          linkType: 'PACKAGE',
          packageId,
          packageName: pkg.name,
          shareUrl: `${baseUrl}/order?aff=${encodeURIComponent(link.code)}&pkg=${encodeURIComponent(packageId)}`,
        },
      });
    }

    if (!syncedServicePackageIds.includes(servicePackageId)) {
      return NextResponse.json({ message: 'Service package belum tersedia untuk affiliate saat ini' }, { status: 403 });
    }

    const servicePackage = await prisma.servicePackage.findFirst({
      where: { id: servicePackageId },
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
    });

    if (!servicePackage) {
      return NextResponse.json({ message: 'Service package tidak ditemukan' }, { status: 404 });
    }

    const existingServiceLink = await prismaAny.affiliateServiceLink.findUnique({
      where: {
        customerId_servicePackageId: {
          customerId,
          servicePackageId,
        },
      },
    });

    let serviceLink = existingServiceLink;

    if (!serviceLink) {
      const customerPrefix = customerId.slice(0, 4).toUpperCase();
      let code = randomCode(`${customerPrefix}-S`);

      for (let i = 0; i < 6; i += 1) {
        const duplicate = await prismaAny.affiliateServiceLink.findUnique({ where: { code } });
        if (!duplicate) break;
        code = randomCode(`${customerPrefix}-S`);
      }

      serviceLink = await prismaAny.affiliateServiceLink.create({
        data: {
          code,
          customerId,
          servicePackageId,
          isActive: true,
        },
      });
    }

    const baseUrl = buildBaseUrl(request);

    return NextResponse.json({
      success: true,
      link: {
        id: serviceLink.id,
        code: serviceLink.code,
        linkType: 'SERVICE',
        servicePackageId,
        packageName: `${servicePackage.service.name} - ${servicePackage.name}`,
        shareUrl: `${baseUrl}/services?aff=${encodeURIComponent(serviceLink.code)}&spkg=${encodeURIComponent(servicePackageId)}`,
      },
    });
  } catch (error) {
    console.error('Create Affiliate Link Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

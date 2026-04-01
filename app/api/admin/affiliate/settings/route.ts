import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseAffiliateSyncConfig, serializeAffiliateSyncConfig } from '@/lib/affiliate-config';

type AffiliateSettingRow = {
  id: string;
  commissionPercent: number;
  minPayout: number;
  adminFeePercent: number;
  rules: string | null;
  syncedPackageIds: string | null;
};

export async function GET() {
  try {
    const [settings, packages, servicePackages] = await Promise.all([
      prisma.affiliateSetting.findFirst({
        orderBy: { createdAt: 'desc' },
      }),
      prisma.package.findMany({
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
      prisma.servicePackage.findMany({
        select: {
          id: true,
          serviceId: true,
          name: true,
          price: true,
          isActive: true,
          sortOrder: true,
          service: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
          },
        },
        orderBy: [{ service: { name: 'asc' } }, { sortOrder: 'asc' }, { name: 'asc' }],
      }),
    ]);

    console.log('GET Affiliate Settings [DEBUG]:', {
      hasSettings: !!settings,
      packageCount: packages.length,
      serviceCount: servicePackages.length,
      dbUrl: process.env.DATABASE_URL?.split('@')[1] || 'hidden',
    });

    const parsedConfig = parseAffiliateSyncConfig(settings?.syncedPackageIds ?? null);

    // Dummy item for debugging visibility
    const debugPackages = [
      { id: 'debug_1', name: 'DEBUG PACKAGE (Check if Visible)', price: 0, price1Year: 0, isActive: true, isPopular: false },
      ...packages
    ];

    const response = NextResponse.json({
      settings: {
        commissionPercent: settings?.commissionPercent ?? 10,
        minPayout: settings?.minPayout ?? 50000,
        adminFeePercent: settings?.adminFeePercent ?? 0,
        rules: settings?.rules || 'Affiliate wajib menggunakan rekening atas nama sendiri dan dilarang melakukan fraud traffic.',
        syncedPackageIds: parsedConfig.syncedPackageIds,
        syncedServicePackageIds: parsedConfig.syncedServicePackageIds,
        packageCommissions: parsedConfig.packageCommissions,
        serviceCommissions: parsedConfig.serviceCommissions,
      },
      packages: debugPackages,
      servicePackages,
    });

    // Cache busting
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    
    return response;
  } catch (error) {
    console.error('Get Affiliate Settings Error:', error);
    return NextResponse.json({ message: 'Failed to fetch affiliate settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const commissionPercent = Number(body.commissionPercent ?? 10);
    const minPayout = Number(body.minPayout ?? 50000);
    const adminFeePercent = Number(body.adminFeePercent ?? 0);
    const rules = String(body.rules || '').trim();
    const syncedPackageIds = Array.isArray(body.syncedPackageIds)
      ? body.syncedPackageIds.map((id: unknown) => String(id)).filter(Boolean)
      : [];
    const syncedServicePackageIds = Array.isArray(body.syncedServicePackageIds)
      ? body.syncedServicePackageIds.map((id: unknown) => String(id)).filter(Boolean)
      : [];
    const packageCommissions = body.packageCommissions && typeof body.packageCommissions === 'object'
      ? body.packageCommissions
      : {};
    const serviceCommissions = body.serviceCommissions && typeof body.serviceCommissions === 'object'
      ? body.serviceCommissions
      : {};

    const normalizedCommission = Math.round(commissionPercent);
    const normalizedMinPayout = Math.round(minPayout);
    const normalizedAdminFee = Math.round(adminFeePercent);
    const normalizedRules = rules || null;
    const serializedSyncConfig = serializeAffiliateSyncConfig({
      syncedPackageIds,
      syncedServicePackageIds,
      packageCommissions,
      serviceCommissions,
    });

    const existing = await prisma.affiliateSetting.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    let saved;
    if (existing) {
      saved = await prisma.affiliateSetting.update({
        where: { id: existing.id },
        data: {
          commissionPercent: normalizedCommission,
          minPayout: normalizedMinPayout,
          adminFeePercent: normalizedAdminFee,
          rules: normalizedRules,
          syncedPackageIds: serializedSyncConfig,
          updatedAt: new Date(),
        },
      });
    } else {
      saved = await prisma.affiliateSetting.create({
        data: {
          commissionPercent: normalizedCommission,
          minPayout: normalizedMinPayout,
          adminFeePercent: normalizedAdminFee,
          rules: normalizedRules,
          syncedPackageIds: serializedSyncConfig,
        },
      });
    }

    console.log('PUT Affiliate Settings Success:', saved.id);

    return NextResponse.json({ success: true, data: saved });
  } catch (error) {
    console.error('Update Affiliate Settings Error:', error);
    return NextResponse.json({ message: 'Failed to update affiliate settings' }, { status: 500 });
  }
}

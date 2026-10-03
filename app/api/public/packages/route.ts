import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { countedOrderWhere, withPackageAvailability } from '@/lib/package-order-limit';

export async function GET() {
  try {
    const packages = await prisma.package.findMany({
      where: { isActive: true },
      include: {
        freeDomains: true,
        freeTemplates: true,
        _count: {
          select: { orders: { where: countedOrderWhere } },
        },
      },
      orderBy: { duration: 'asc' },
    });
    return NextResponse.json(packages.map(withPackageAvailability));
  } catch (error) {
    console.error('Get Public Packages Error:', error);
    return NextResponse.json([]);
  }
}

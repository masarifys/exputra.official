import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const channel = searchParams.get('channel');

    const where: Record<string, unknown> = {
      isActive: true,
      isVisible: true,
    };

    if (channel === 'order') {
      where.availableInOrder = true;
    }

    if (channel === 'services') {
      where.availableInServices = true;
    }

    const packageWhere: Record<string, unknown> = {
      isActive: true,
      isVisible: true,
      internalOnly: false,
    };

    if (channel === 'order') {
      packageWhere.visibleInOrder = true;
    }

    if (channel === 'services') {
      packageWhere.visibleInServices = true;
    }

    const services = await prisma.service.findMany({
      where,
      include: {
        packages: {
          where: packageWhere,
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
      orderBy: { price: 'asc' },
    });

    return NextResponse.json(services);
  } catch (error) {
    console.error('Get Public Services Error:', error);
    return NextResponse.json([]);
  }
}

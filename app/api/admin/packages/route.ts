import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { packageSchema } from '@/lib/validations';
import { countedOrderWhere, withPackageAvailability } from '@/lib/package-order-limit';

export async function GET() {
  try {
    const packages = await prisma.package.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        freeDomains: true,
        freeTemplates: true,
        _count: {
          select: { orders: { where: countedOrderWhere } },
        },
      },
    });
    return NextResponse.json(packages.map(withPackageAvailability));
  } catch (error) {
    console.error('Get Packages Error:', error);
    return NextResponse.json({ message: 'Failed to fetch packages' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = packageSchema.parse(body);

    const { freeDomainIds, freeTemplateIds, ...data } = validated;

    const pkg = await prisma.package.create({
      data: {
        ...data,
        freeDomains: freeDomainIds && freeDomainIds.length > 0
          ? { connect: freeDomainIds.map((id) => ({ id })) }
          : undefined,
        freeTemplates: freeTemplateIds && freeTemplateIds.length > 0
          ? { connect: freeTemplateIds.map((id) => ({ id })) }
          : undefined,
      },
    });

    return NextResponse.json(pkg, { status: 201 });
  } catch (error: any) {
    console.error('Create Package Error:', error);
    return NextResponse.json({ message: error.message || 'Failed to create package' }, { status: 400 });
  }
}

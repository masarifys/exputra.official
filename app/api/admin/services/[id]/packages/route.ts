import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { servicePackageSchema } from '@/lib/validations';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const packages = await prisma.servicePackage.findMany({
      where: { serviceId: id },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json(packages);
  } catch (error) {
    console.error('Get Service Packages Error:', error);
    return NextResponse.json({ message: 'Failed to fetch service packages' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const validated = servicePackageSchema.parse({
      ...body,
      serviceId: id,
    });

    const existing = await prisma.servicePackage.findFirst({
      where: {
        serviceId: id,
        code: validated.code,
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ message: 'Code package sudah digunakan untuk layanan ini' }, { status: 400 });
    }

    const created = await prisma.servicePackage.create({
      data: validated,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Create Service Package Error:', error);
    return NextResponse.json({ message: error.message || 'Failed to create service package' }, { status: 400 });
  }
}

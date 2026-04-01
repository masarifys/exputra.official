import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { servicePackageSchema } from '@/lib/validations';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ packageId: string }> }
) {
  try {
    const { packageId } = await params;
    const body = await request.json();

    const existing = await prisma.servicePackage.findUnique({
      where: { id: packageId },
      select: { id: true, serviceId: true },
    });

    if (!existing) {
      return NextResponse.json({ message: 'Service package not found' }, { status: 404 });
    }

    const validated = servicePackageSchema.parse({
      ...body,
      serviceId: existing.serviceId,
    });

    const duplicateCode = await prisma.servicePackage.findFirst({
      where: {
        serviceId: existing.serviceId,
        code: validated.code,
        NOT: { id: packageId },
      },
      select: { id: true },
    });

    if (duplicateCode) {
      return NextResponse.json({ message: 'Code package sudah digunakan untuk layanan ini' }, { status: 400 });
    }

    const updated = await prisma.servicePackage.update({
      where: { id: packageId },
      data: validated,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Update Service Package Error:', error);
    return NextResponse.json({ message: error.message || 'Failed to update service package' }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ packageId: string }> }
) {
  try {
    const { packageId } = await params;

    await prisma.servicePackage.delete({
      where: { id: packageId },
    });

    return NextResponse.json({ message: 'Service package deleted' });
  } catch (error) {
    console.error('Delete Service Package Error:', error);
    return NextResponse.json({ message: 'Failed to delete service package' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { serviceSchema } from '@/lib/validations';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = serviceSchema.parse(body);

    const service = await prisma.service.update({
      where: { id },
      data: validated,
      include: {
        packages: true,
      },
    });

    // Auto-sync default extension package prices to keep monthly extension options consistent.
    await prisma.servicePackage.updateMany({
      where: { serviceId: id, code: 'EXT_1M' },
      data: { price: validated.price },
    });

    await prisma.servicePackage.updateMany({
      where: { serviceId: id, code: 'EXT_2M' },
      data: { price: Math.round(validated.price * 2) },
    });

    await prisma.servicePackage.updateMany({
      where: { serviceId: id, code: 'EXT_3M' },
      data: { price: Math.round(validated.price * 3) },
    });

    return NextResponse.json(service);
  } catch (error: any) {
    console.error('Update Service Error:', error);
    return NextResponse.json({ message: error.message || 'Failed to update service' }, { status: 400 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Manual cascade delete for related order items
    await prisma.orderService.deleteMany({
      where: { serviceId: id },
    });

    await prisma.service.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Service deleted' });
  } catch (error) {
    console.error('Delete Service Error:', error);
    return NextResponse.json({ message: 'Failed to delete service' }, { status: 500 });
  }
}

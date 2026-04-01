import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ message: 'ID user wajib diisi' }, { status: 400 });
    }

    const body = await request.json();
    const status = String(body.status || '').toUpperCase();

    if (!['ACTIVE', 'INACTIVE'].includes(status)) {
      return NextResponse.json({ message: 'Status tidak valid' }, { status: 400 });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: { status: status as 'ACTIVE' | 'INACTIVE' },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update Affiliate User Status Error:', error);
    return NextResponse.json({ message: 'Failed to update affiliate user status' }, { status: 500 });
  }
}

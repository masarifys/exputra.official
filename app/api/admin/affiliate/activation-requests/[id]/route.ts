import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ message: 'ID request wajib diisi' }, { status: 400 });
    }

    const body = await request.json();
    const action = String(body.action || '').toUpperCase();
    const notes = String(body.notes || '').trim();

    if (!['APPROVE', 'REJECT', 'SUSPEND', 'ACTIVATE'].includes(action)) {
      return NextResponse.json({ message: 'Aksi tidak valid' }, { status: 400 });
    }

    if (action === 'SUSPEND' && !notes) {
      return NextResponse.json({ message: 'Alasan suspend wajib diisi' }, { status: 400 });
    }

    const target = await prisma.affiliateRequest.findUnique({ where: { id } });

    if (!target) {
      return NextResponse.json({ message: 'Request tidak ditemukan' }, { status: 404 });
    }

    const mappedStatus =
      action === 'APPROVE' || action === 'ACTIVATE'
        ? 'APPROVED'
        : 'REJECTED';

    const updated = await prisma.affiliateRequest.update({
      where: { id },
      data: {
        status: mappedStatus,
        notes: notes || null,
      },
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
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update Affiliate Activation Request Error:', error);
    return NextResponse.json({ message: 'Failed to update activation request' }, { status: 500 });
  }
}

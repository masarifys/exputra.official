import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const prismaAny = prisma as any;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ message: 'ID link wajib diisi' }, { status: 400 });
    }

    const body = await request.json();

    if (typeof body.isActive !== 'boolean') {
      return NextResponse.json({ message: 'isActive wajib boolean' }, { status: 400 });
    }

    let updated;

    const packageLink = await prisma.affiliateLink.findUnique({
      where: { id },
      select: { id: true },
    });

    if (packageLink) {
      updated = await prisma.affiliateLink.update({
        where: { id },
        data: {
          isActive: body.isActive,
        },
        select: {
          id: true,
          code: true,
          isActive: true,
          updatedAt: true,
        },
      });
    } else {
      updated = await prismaAny.affiliateServiceLink.update({
        where: { id },
        data: {
          isActive: body.isActive,
        },
        select: {
          id: true,
          code: true,
          isActive: true,
          updatedAt: true,
        },
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update Affiliate Link Error:', error);
    return NextResponse.json({ message: 'Failed to update affiliate link' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const prismaAny = prisma as any;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const invoiceId = String(searchParams.get('invoiceId') || '').trim();

    if (!invoiceId) {
      return NextResponse.json({ message: 'invoiceId wajib diisi' }, { status: 400 });
    }

    const serviceOrder = await prismaAny.serviceOrder.findUnique({
      where: { invoiceId },
      include: {
        service: {
          select: {
            id: true,
            name: true,
            description: true,
            priceType: true,
          },
        },
      },
    });

    if (!serviceOrder) {
      return NextResponse.json({ message: 'Service order tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: serviceOrder,
    });
  } catch (error) {
    console.error('Get Service Order Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

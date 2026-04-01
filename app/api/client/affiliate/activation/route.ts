import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveClientSessionCustomer } from '@/lib/client-session';

function generateAffiliateCode() {
  return `AFF-${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function GET() {
  try {
    const session = await resolveClientSessionCustomer();

    if (!session?.customerId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const latestRequest = await prisma.affiliateRequest.findFirst({
      where: { customerId: session.customerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        affiliateCode: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      isActive: latestRequest?.status === 'APPROVED',
      request: latestRequest || null,
    });
  } catch (error) {
    console.error('Get Affiliate Activation Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST() {
  try {
    const session = await resolveClientSessionCustomer();

    if (!session?.customerId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const latestRequest = await prisma.affiliateRequest.findFirst({
      where: { customerId: session.customerId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
      },
    });

    if (latestRequest?.status === 'PENDING') {
      return NextResponse.json({ message: 'Request aktivasi Anda masih diproses admin.' }, { status: 400 });
    }

    if (latestRequest?.status === 'APPROVED') {
      return NextResponse.json({
        success: true,
        isActive: true,
        message: 'Akun affiliate Anda sudah aktif.',
      });
    }

    let affiliateCode = generateAffiliateCode();
    for (let i = 0; i < 6; i += 1) {
      const duplicate = await prisma.affiliateRequest.findUnique({ where: { affiliateCode } });
      if (!duplicate) break;
      affiliateCode = generateAffiliateCode();
    }

    const request = await prisma.affiliateRequest.create({
      data: {
        customerId: session.customerId,
        affiliateCode,
        status: 'PENDING',
      },
      select: {
        id: true,
        affiliateCode: true,
        status: true,
        notes: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      isActive: false,
      message: 'Request aktivasi affiliate berhasil dikirim.',
      request,
    });
  } catch (error) {
    console.error('Create Affiliate Activation Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

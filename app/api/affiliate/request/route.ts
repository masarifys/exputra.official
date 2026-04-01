import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveClientSessionCustomer } from '@/lib/client-session';

export async function POST(request: NextRequest) {
  try {
    const session = await resolveClientSessionCustomer();
    if (!session?.customerId || !session.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { invoiceId } = await request.json();

    // Verify order exists and is paid
    const order = await prisma.order.findUnique({
      where: { invoiceId },
      select: { status: true, customerEmail: true }
    });
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.status !== 'PAID') {
      return NextResponse.json({ error: 'Invoice belum dibayar' }, { status: 400 });
    }
    if (order.customerEmail.toLowerCase() !== session.email.toLowerCase()) {
      return NextResponse.json({ error: 'Invoice tidak sesuai akun Anda' }, { status: 403 });
    }

    // Generate unique affiliate code
    const affiliateCode = `AFF-${Date.now().toString(36).toUpperCase()}`;

    await prisma.affiliateRequest.create({
      data: {
        affiliateCode,
        customerId: session.customerId,
        status: 'PENDING'
      }
    });

    return NextResponse.json({ success: true, affiliateCode });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

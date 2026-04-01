import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const requests = await prisma.affiliateRequest.findMany({
      include: { customer: { select: { email: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(requests);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

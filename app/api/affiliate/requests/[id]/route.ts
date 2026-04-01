import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { action } = await request.json(); // action: 'APPROVE' | 'REJECT'
    const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
    await prisma.affiliateRequest.update({
      where: { id },
      data: { status }
    });
    return NextResponse.json({ success: true, status });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { notes } = await request.json();
    await prisma.affiliateRequest.update({
      where: { id },
      data: { notes }
    });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

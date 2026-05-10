import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const affiliators = await prisma.customer.findMany({
      where: {
        affiliateRequests: {
          some: {
            status: 'APPROVED'
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        affiliateRequests: {
          where: { status: 'APPROVED' },
          select: { affiliateCode: true },
          take: 1
        }
      },
      orderBy: { name: 'asc' }
    });

    const formatted = affiliators.map(a => ({
      id: a.id,
      name: a.name,
      email: a.email,
      phone: a.phone,
      affiliateCode: a.affiliateRequests[0]?.affiliateCode || ''
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Get Affiliators Error:', error);
    return NextResponse.json({ message: 'Failed to fetch affiliators' }, { status: 500 });
  }
}

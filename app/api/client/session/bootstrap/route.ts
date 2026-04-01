import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = String(body.fullName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const company = String(body.company || '').trim();

    if (!name || !email || !phone) {
      return NextResponse.json({ message: 'Nama, email, dan nomor HP wajib diisi' }, { status: 400 });
    }

    let customer = await prisma.customer.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, phone: true, company: true },
    });

    if (customer) {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name,
          phone,
          company: company || customer.company || null,
        },
        select: { id: true, email: true, name: true, phone: true, company: true },
      });
    } else {
      customer = await prisma.customer.create({
        data: {
          email,
          phone,
          name,
          company: company || null,
        },
        select: { id: true, email: true, name: true, phone: true, company: true },
      });
    }

    const cookieStore = await cookies();
    cookieStore.set(
      'client_session',
      JSON.stringify({
        customerId: customer.id,
        email: customer.email,
        name: customer.name,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
      }
    );

    return NextResponse.json({
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
      },
    });
  } catch (error) {
    console.error('Bootstrap Client Session Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const nextPath = String(searchParams.get('next') || '/client/dashboard').trim();
    const { email, phone } = await request.json();

    if (!email || !phone) {
      return NextResponse.json(
        { message: 'Email dan nomor HP wajib diisi' },
        { status: 400 }
      );
    }

    // 1. Check Customer table first (Primary Authentication)
    let customer = await prisma.customer.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (customer) {
      if (customer.status === 'INACTIVE') {
        return NextResponse.json(
          { message: 'Akun Anda telah dinonaktifkan (banned). Silakan hubungi tim Admin.' },
          { status: 403 }
        );
      }
      
      // If customer exists, verify credentials
      let isVerified = false;
      if (customer.password) {
        // If password is set via reset, use bcrypt
        isVerified = await bcrypt.compare(phone, customer.password);
      } else {
        // Fallback: use phone number as password (legacy behavior)
        isVerified = customer.phone === phone;
      }

      if (!isVerified) {
        return NextResponse.json(
          { message: 'Email atau password tidak sesuai' },
          { status: 401 }
        );
      }
    } else {
      // 2. Fallback: Check website orders (legacy support)
      const orders = await prisma.order.findMany({
        where: {
          customerEmail: email.toLowerCase(),
          customerPhone: phone,
        },
        include: {
          domain: true, // Keep includes if needed by logic, though we just need existence here or name
        },
      });

      // 3. Fallback: Check service orders (service-only checkout)
      const serviceOrders = orders.length > 0
        ? []
        : await prisma.serviceOrder.findMany({
            where: {
              customerEmail: email.toLowerCase(),
              customerPhone: phone,
            },
            orderBy: { createdAt: 'desc' },
          });

      if (orders.length === 0 && serviceOrders.length === 0) {
        return NextResponse.json(
          { message: 'Email atau nomor HP tidak ditemukan' },
          { status: 401 }
        );
      }

      const latestName = orders[0]?.customerName || serviceOrders[0]?.customerName || 'Client';

      // Create new customer from Order data
      customer = await prisma.customer.create({
        data: {
          email: email.toLowerCase(),
          phone: phone,
          name: latestName,
        },
      });
    }

    // Set session cookie
    const cookieStore = await cookies();
    cookieStore.set('client_session', JSON.stringify({
      customerId: customer.id,
      email: customer.email,
      name: customer.name,
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return NextResponse.json({
      success: true,
      nextPath,
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
      },
    });
  } catch (error) {
    console.error('Client Login Error:', error);
    return NextResponse.json(
      { message: 'Terjadi kesalahan saat login' },
      { status: 500 }
    );
  }
}

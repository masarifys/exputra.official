import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendWhatsAppMessage } from '@/lib/fonnte';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, phone, whatsapp, company, address } = body;

    if (!name || !email || !phone || !whatsapp || !address) {
      return NextResponse.json({ message: 'Semua field kecuali Nama Bisnis wajib diisi' }, { status: 400 });
    }

    const phoneRegex = /^[0-9]+$/;
    if (!phoneRegex.test(phone) || phone.length < 10) {
      return NextResponse.json({ message: 'Nomor HP tidak valid. Harus berupa angka dan minimal 10 digit.' }, { status: 400 });
    }
    
    if (!phoneRegex.test(whatsapp) || whatsapp.length < 10) {
      return NextResponse.json({ message: 'Nomor WhatsApp tidak valid. Harus berupa angka dan minimal 10 digit.' }, { status: 400 });
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { email }
    });

    if (existingCustomer) {
      return NextResponse.json({ message: 'Email sudah terdaftar. Silakan login.' }, { status: 400 });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone,
        whatsapp,
        company: company || null,
        address,
        status: 'ACTIVE'
      }
    });

    // Send WhatsApp notification
    const waMessage = `Halo ${name},\n\nPendaftaran Anda di platform kami berhasil!\nEmail: ${email}\n\nSilakan cek dashboard klien untuk layanan lebih lanjut.`;
    await sendWhatsAppMessage(whatsapp || phone, waMessage);

    const response = NextResponse.json({ 
      success: true, 
      message: 'Registrasi berhasil',
      redirect: '/client/dashboard'
    });
    
    response.cookies.set('client_session', JSON.stringify({
      customerId: customer.id,
      email: customer.email,
      name: customer.name
    }), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}

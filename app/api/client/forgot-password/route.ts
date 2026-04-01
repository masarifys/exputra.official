import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import { sendWhatsAppMessage } from '@/lib/fonnte';

export async function POST(request: NextRequest) {
  try {
    const { phone } = await request.json();

    if (!phone) {
      return NextResponse.json({ message: 'Nomor WhatsApp wajib diisi' }, { status: 400 });
    }

    // Find customer by phone or whatsapp
    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { phone: phone },
          { whatsapp: phone }
        ]
      }
    });

    if (!customer) {
      return NextResponse.json({ message: 'Akun dengan nomor tersebut tidak ditemukan' }, { status: 404 });
    }

    // Generate reset token
    const token = uuidv4();
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        resetToken: token,
        resetTokenExpiry: expiry,
      }
    });

    // Determine Base URL
    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host');
    const baseUrl = `${protocol}://${host}`;
    
    const resetLink = `${baseUrl}/client/reset-password?token=${token}`;

    // Send WhatsApp
    const message = `Halo ${customer.name},\n\nAnda menerima pesan ini karena ada permintaan untuk mengatur ulang password akun Anda.\n\nSilakan klik link berikut untuk membuat password baru:\n${resetLink}\n\nLink ini akan kadaluarsa dalam 1 jam.\nJika Anda tidak merasa melakukan permintaan ini, silakan abaikan pesan ini.`;
    
    await sendWhatsAppMessage(phone, message);

    return NextResponse.json({ 
      success: true, 
      message: 'Link reset password telah dikirim ke WhatsApp Anda' 
    });

  } catch (error) {
    console.error('[Forgot Password Error]:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan sistem' }, { status: 500 });
  }
}

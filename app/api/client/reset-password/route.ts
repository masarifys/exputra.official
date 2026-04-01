import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ message: 'Token dan password wajib diisi' }, { status: 400 });
    }

    // Find customer with valid token and expiry
    const customer = await prisma.customer.findFirst({
        where: {
            resetToken: token,
            resetTokenExpiry: {
                gt: new Date(),
            }
        }
    });

    if (!customer) {
      return NextResponse.json({ message: 'Token tidak valid atau sudah kadaluarsa' }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update customer and clear reset token
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      }
    });

    return NextResponse.json({ 
        success: true, 
        message: 'Password Anda berhasil diperbarui.' 
    });

  } catch (error) {
    console.error('[Reset Password Error]:', error);
    return NextResponse.json({ message: 'Terjadi kesalahan saat memproses password baru' }, { status: 500 });
  }
}

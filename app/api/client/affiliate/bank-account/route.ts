import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { resolveClientSessionCustomer } from '@/lib/client-session';

export async function POST(request: NextRequest) {
  try {
    const session = await resolveClientSessionCustomer();

    if (!session?.customerId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const bankName = String(body.bankName || '').trim();
    const accountNumber = String(body.accountNumber || '').trim();
    const accountHolderName = String(body.accountHolderName || '').trim();
    const branch = String(body.branch || '').trim();
    const ktpImageUrl = String(body.ktpImageUrl || '').trim();

    if (!bankName || !accountNumber || !accountHolderName || !ktpImageUrl) {
      return NextResponse.json({ message: 'Data rekening dan upload KTP wajib dilengkapi' }, { status: 400 });
    }

    const bankAccount = await prisma.affiliateBankAccount.upsert({
      where: { customerId: session.customerId },
      update: {
        bankName,
        accountNumber,
        accountHolderName,
        branch: branch || null,
        ktpImageUrl,
        isVerified: false,
        verifiedAt: null,
        verifiedBy: null,
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null,
      },
      create: {
        customerId: session.customerId,
        bankName,
        accountNumber,
        accountHolderName,
        branch: branch || null,
        ktpImageUrl,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Rekening berhasil disubmit, menunggu verifikasi admin',
      data: bankAccount,
    });
  } catch (error) {
    console.error('Submit Affiliate Bank Account Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

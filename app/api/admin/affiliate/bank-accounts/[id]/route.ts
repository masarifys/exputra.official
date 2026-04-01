import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ message: 'ID rekening wajib diisi' }, { status: 400 });
    }

    const body = await request.json();
    const action = String(body.action || '').toLowerCase();
    const adminNote = String(body.adminNote || '').trim();
    const isVerifiedFlag = body.isVerified;

    const resolvedAction = action || (isVerifiedFlag === true ? 'verify' : 'reject');

    if (!['verify', 'reject', 'edit'].includes(resolvedAction)) {
      return NextResponse.json({ message: 'Aksi tidak valid' }, { status: 400 });
    }

    if (resolvedAction === 'edit') {
      const bankName = String(body.bankName || '').trim();
      const accountNumber = String(body.accountNumber || '').trim();
      const accountHolderName = String(body.accountHolderName || '').trim();
      const branch = String(body.branch || '').trim();

      if (!bankName || !accountNumber || !accountHolderName) {
        return NextResponse.json({ message: 'Data rekening tidak lengkap' }, { status: 400 });
      }

      const updated = await prisma.affiliateBankAccount.update({
        where: { id },
        data: {
          bankName,
          accountNumber,
          accountHolderName,
          branch: branch || null,
          isVerified: false,
          verifiedAt: null,
          verifiedBy: null,
        },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    const now = new Date();

    const updated = await prisma.affiliateBankAccount.update({
      where: { id },
      data:
        resolvedAction === 'verify'
          ? {
              isVerified: true,
              verifiedAt: now,
              verifiedBy: session?.email || 'admin',
              rejectedAt: null,
              rejectedBy: null,
              rejectionReason: null,
            }
          : {
              isVerified: false,
              verifiedAt: null,
              verifiedBy: null,
              rejectedAt: now,
              rejectedBy: session?.email || 'admin',
              rejectionReason: adminNote || null,
            },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Verify Affiliate Bank Account Error:', error);
    return NextResponse.json({ message: 'Failed to update bank account verification' }, { status: 500 });
  }
}

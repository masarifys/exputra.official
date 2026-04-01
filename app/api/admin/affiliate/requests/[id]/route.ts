import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

type AffiliateAction = 'approve' | 'reject' | 'paid';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ message: 'ID request wajib diisi' }, { status: 400 });
    }

    const body = await request.json();
    const action = String(body.action || '') as AffiliateAction;
    const adminNote = String(body.adminNote || '').trim();
    const approvedAmountRaw = body.approvedAmount;
    const verifyBankAccount = Boolean(body.verifyBankAccount);

    if (!['approve', 'reject', 'paid'].includes(action)) {
      return NextResponse.json({ message: 'Aksi tidak valid' }, { status: 400 });
    }

    const existing = await prisma.affiliatePayoutRequest.findUnique({
      where: { id },
      include: {
        bankAccount: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ message: 'Request tidak ditemukan' }, { status: 404 });
    }

    const now = new Date();

    if (action === 'approve') {
      const approvedAmount = Number(approvedAmountRaw ?? existing.requestedAmount);

      if (!Number.isFinite(approvedAmount) || approvedAmount <= 0) {
        return NextResponse.json({ message: 'Nominal approved tidak valid' }, { status: 400 });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const payout = await tx.affiliatePayoutRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            approvedAmount: Math.round(approvedAmount),
            adminNote: adminNote || null,
            reviewedAt: now,
          },
          include: {
            customer: {
              select: {
                name: true,
                email: true,
              },
            },
            bankAccount: true,
          },
        });

        if (verifyBankAccount || !existing.bankAccount.isVerified) {
          await tx.affiliateBankAccount.update({
            where: { id: existing.bankAccountId },
            data: {
              isVerified: true,
              verifiedAt: now,
              verifiedBy: session?.email || 'admin',
              rejectedAt: null,
              rejectedBy: null,
              rejectionReason: null,
            },
          });
        }

        return payout;
      });

      return NextResponse.json({ success: true, data: updated });
    }

    if (action === 'reject') {
      const updated = await prisma.affiliatePayoutRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          adminNote: adminNote || null,
          reviewedAt: now,
        },
      });

      return NextResponse.json({ success: true, data: updated });
    }

    const updated = await prisma.affiliatePayoutRequest.update({
      where: { id },
      data: {
        status: 'PAID',
        paidAt: now,
        reviewedAt: existing.reviewedAt ?? now,
        approvedAmount: existing.approvedAmount ?? existing.requestedAmount,
        adminNote: adminNote || existing.adminNote || null,
      },
      include: {
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Update Affiliate Payout Request Error:', error);
    return NextResponse.json({ message: 'Failed to update affiliate request' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // 1. Fetch Website Orders
    const websiteOrders = await prisma.order.findMany({
      select: {
        invoiceId: true,
        status: true,
        total: true,
        paymentRef: true,
        customerEmail: true,
        createdAt: true,
        paidAt: true,
        paymentMethod: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // 2. Fetch Service Orders
    const serviceOrders = await (prisma as any).serviceOrder.findMany({
      select: {
        invoiceId: true,
        status: true,
        total: true,
        paymentRef: true,
        customerEmail: true,
        createdAt: true,
        paidAt: true,
        paymentMethod: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // 3. Fetch Manual Payments (linked to Invoice)
    const manualPayments = await prisma.payment.findMany({
      include: {
        invoice: {
          select: {
            invoiceNumber: true,
            customerEmail: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    // Transform Website Orders to logs
    const websiteLogs = websiteOrders.map((order) => ({
      id: `WEB-${order.invoiceId}`,
      invoiceId: order.invoiceId,
      type: order.status === 'PAID' ? 'SUCCESS' : 
            order.status === 'CANCELLED' ? 'CANCELLED' : 
            order.status === 'PENDING' ? 'INITIATED' : 'FAILED',
      amount: order.total,
      reference: order.paymentRef,
      customerEmail: order.customerEmail,
      message: `${order.paymentMethod ? `[${order.paymentMethod}] ` : ''}Website Order: ${getStatusMessage(order.status)}`,
      timestamp: order.paidAt || order.createdAt,
      source: 'WEBSITE'
    }));

    // Transform Service Orders to logs
    const serviceLogs = serviceOrders.map((order: any) => ({
      id: `SRV-${order.invoiceId}`,
      invoiceId: order.invoiceId,
      type: order.status === 'PAID' ? 'SUCCESS' : 
            order.status === 'CANCELLED' ? 'CANCELLED' : 
            order.status === 'PENDING' ? 'INITIATED' : 'FAILED',
      amount: order.total,
      reference: order.paymentRef,
      customerEmail: order.customerEmail,
      message: `${order.paymentMethod ? `[${order.paymentMethod}] ` : ''}Service Order: ${getStatusMessage(order.status)}`,
      timestamp: order.paidAt || order.createdAt,
      source: 'SERVICE'
    }));

    // Transform Manual Payments to logs
    const manualLogs = manualPayments.map((p) => ({
      id: `MAN-${p.id}`,
      invoiceId: p.invoice?.invoiceNumber || 'Manual',
      type: p.status === 'VERIFIED' ? 'SUCCESS' : 
            p.status === 'FAILED' ? 'FAILED' : 'INITIATED',
      amount: p.amount,
      reference: p.referenceNumber,
      customerEmail: p.invoice?.customerEmail || 'Manual',
      message: `Manual Payment: ${p.notes || 'Pembayaran dikonfirmasi admin'}`,
      timestamp: p.paymentDate || p.createdAt,
      source: 'MANUAL'
    }));

    // Combine and Sort
    const logs = [...websiteLogs, ...serviceLogs, ...manualLogs]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 200); // Limit total logs for performance

    return NextResponse.json({ 
      success: true,
      logs 
    });
  } catch (error) {
    console.error('Failed to fetch payment logs:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch logs' },
      { status: 500 }
    );
  }
}

function getStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    'PAID': 'Pembayaran berhasil',
    'PENDING': 'Menunggu pembayaran',
    'CANCELLED': 'Pembayaran dibatalkan',
    'FAILED': 'Pembayaran gagal',
    'PROCESSING': 'Pembayaran sedang diproses',
    'COMPLETED': 'Pesanan selesai',
  };
  return messages[status] || 'Status tidak diketahui';
}

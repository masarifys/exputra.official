import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';

export interface ClientSessionIdentity {
  customerId: string;
  email: string;
  name: string;
}

const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export async function resolveClientSessionCustomer(): Promise<ClientSessionIdentity | null> {
  const cookieStore = await cookies();
  const sessionRaw = cookieStore.get('client_session')?.value;

  if (!sessionRaw) return null;

  let parsed: { customerId?: string; email?: string; name?: string };

  try {
    parsed = JSON.parse(sessionRaw);
  } catch {
    return null;
  }

  const sessionEmail = String(parsed.email || '').trim().toLowerCase();

  let customer = parsed.customerId
    ? await prisma.customer.findUnique({
        where: { id: parsed.customerId },
        select: { id: true, email: true, name: true, status: true },
      })
    : null;

  if (!customer && sessionEmail) {
    customer = await prisma.customer.findUnique({
      where: { email: sessionEmail },
      select: { id: true, email: true, name: true, status: true },
    });
  }

  if (!customer && sessionEmail) {
    const latestOrder = await prisma.order.findFirst({
      where: { customerEmail: sessionEmail },
      orderBy: { createdAt: 'desc' },
      select: { customerName: true, customerPhone: true },
    });

    const latestServiceOrder = !latestOrder
      ? await prisma.serviceOrder.findFirst({
          where: { customerEmail: sessionEmail },
          orderBy: { createdAt: 'desc' },
          select: { customerName: true, customerPhone: true },
        })
      : null;

    customer = await prisma.customer.upsert({
      where: { email: sessionEmail },
      update: {},
      create: {
        email: sessionEmail,
        name: latestOrder?.customerName || latestServiceOrder?.customerName || parsed.name || 'Client',
        phone: latestOrder?.customerPhone || latestServiceOrder?.customerPhone || '-',
      },
      select: { id: true, email: true, name: true, status: true },
    });
  }

  if (!customer) return null;

  if (customer.status === 'INACTIVE') {
    try {
      cookieStore.delete('client_session');
    } catch {
      // Ignored if called inside Server Component directly
    }
    return null;
  }

  const normalizedName = customer.name || parsed.name || 'Client';

  if (
    parsed.customerId !== customer.id ||
    sessionEmail !== customer.email ||
    (parsed.name || '') !== normalizedName
  ) {
    cookieStore.set(
      'client_session',
      JSON.stringify({
        customerId: customer.id,
        email: customer.email,
        name: normalizedName,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MAX_AGE,
      }
    );
  }

  return {
    customerId: customer.id,
    email: customer.email,
    name: normalizedName,
  };
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { DomainNotRegisteredError, lookupDomainDates } from '@/lib/domain-whois';

const CONCURRENCY = 4;

type WhoisResult = {
  id: string;
  domainName: string;
  success: boolean;
  provider?: string;
  registeredAt?: string;
  expiredAt?: string;
  status?: 'ACTIVE' | 'EXPIRED';
  error?: string;
};

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
) {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  );
  return results;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const ids = Array.isArray(body.ids)
      ? body.ids.filter((id: unknown): id is string => typeof id === 'string')
      : [];

    const domains = await prisma.clientDomain.findMany({
      where: ids.length > 0 ? { id: { in: ids } } : undefined,
      select: { id: true, domainName: true },
      orderBy: { domainName: 'asc' },
    });

    const results = await mapWithConcurrency(domains, CONCURRENCY, async (domain): Promise<WhoisResult> => {
      try {
        const dates = await lookupDomainDates(domain.domainName);
        const status = dates.expiredAt.getTime() <= Date.now() ? 'EXPIRED' : 'ACTIVE';

        await prisma.clientDomain.update({
          where: { id: domain.id },
          data: {
            registeredAt: dates.registeredAt,
            expiredAt: dates.expiredAt,
            status,
          },
        });

        return {
          id: domain.id,
          domainName: domain.domainName,
          success: true,
          provider: dates.provider,
          registeredAt: dates.registeredAt.toISOString(),
          expiredAt: dates.expiredAt.toISOString(),
          status,
        };
      } catch (error) {
        if (error instanceof DomainNotRegisteredError) {
          await prisma.clientDomain.update({
            where: { id: domain.id },
            data: { status: 'EXPIRED' },
          });
          return {
            id: domain.id,
            domainName: domain.domainName,
            success: true,
            provider: error.provider,
            status: 'EXPIRED',
          };
        }
        return {
          id: domain.id,
          domainName: domain.domainName,
          success: false,
          error: error instanceof Error ? error.message : 'Pengecekan WHOIS gagal',
        };
      }
    });

    const succeeded = results.filter((result) => result.success).length;
    return NextResponse.json({
      message: `Berhasil memperbarui ${succeeded} dari ${results.length} domain`,
      total: results.length,
      succeeded,
      failed: results.length - succeeded,
      results,
    });
  } catch (error) {
    console.error('Domain WHOIS check failed:', error);
    return NextResponse.json({ message: 'Gagal mengecek data WHOIS domain' }, { status: 500 });
  }
}

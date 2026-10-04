import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const bulkUpdateSchema = z.object({
  ids: z.array(z.string().min(1)).min(1),
  updates: z.object({
    clientEmail: z.string().email().optional(),
    registrarId: z.string().min(1).nullable().optional(),
    serverId: z.string().min(1).nullable().optional(),
    status: z.enum(['ACTIVE', 'EXPIRED', 'PENDING', 'SUSPENDED']).optional(),
  }).refine((updates) => Object.keys(updates).length > 0, {
    message: 'Pilih minimal satu field yang akan diubah',
  }),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const parsed = bulkUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({
        message: parsed.error.issues[0]?.message || 'Data quick edit tidak valid',
        errors: parsed.error.flatten(),
      }, { status: 400 });
    }

    const { ids, updates } = parsed.data;
    const uniqueIds = [...new Set(ids)];

    const [domains, client, registrar, server] = await Promise.all([
      prisma.clientDomain.findMany({
        where: { id: { in: uniqueIds } },
        select: { id: true },
      }),
      updates.clientEmail
        ? prisma.customer.findUnique({ where: { email: updates.clientEmail }, select: { email: true } })
        : null,
      updates.registrarId
        ? prisma.domainRegistrar.findUnique({ where: { id: updates.registrarId }, select: { id: true } })
        : null,
      updates.serverId
        ? prisma.clientServer.findUnique({ where: { id: updates.serverId }, select: { id: true } })
        : null,
    ]);

    if (domains.length === 0) {
      return NextResponse.json({ message: 'Domain yang dipilih tidak ditemukan' }, { status: 404 });
    }
    if (updates.clientEmail && !client) {
      return NextResponse.json({ message: 'Client yang dipilih tidak ditemukan' }, { status: 400 });
    }
    if (updates.registrarId && !registrar) {
      return NextResponse.json({ message: 'Registrar yang dipilih tidak ditemukan' }, { status: 400 });
    }
    if (updates.serverId && !server) {
      return NextResponse.json({ message: 'Server yang dipilih tidak ditemukan' }, { status: 400 });
    }

    const domainIds = domains.map((domain) => domain.id);
    await prisma.$transaction(async (transaction) => {
      const scalarUpdates: {
        clientEmail?: string;
        registrarId?: string | null;
        registrar?: null;
        status?: 'ACTIVE' | 'EXPIRED' | 'PENDING' | 'SUSPENDED';
      } = {};

      if (updates.clientEmail !== undefined) scalarUpdates.clientEmail = updates.clientEmail;
      if (updates.registrarId !== undefined) {
        scalarUpdates.registrarId = updates.registrarId;
        scalarUpdates.registrar = null;
      }
      if (updates.status !== undefined) scalarUpdates.status = updates.status;

      if (Object.keys(scalarUpdates).length > 0) {
        await transaction.clientDomain.updateMany({
          where: { id: { in: domainIds } },
          data: scalarUpdates,
        });
      }

      if (updates.serverId !== undefined) {
        await transaction.domainServer.deleteMany({
          where: { domainId: { in: domainIds } },
        });

        if (updates.serverId) {
          await transaction.domainServer.createMany({
            data: domainIds.map((domainId) => ({
              domainId,
              serverId: updates.serverId as string,
            })),
            skipDuplicates: true,
          });
        }
      }
    });

    return NextResponse.json({
      message: `${domainIds.length} domain berhasil diperbarui`,
      count: domainIds.length,
    });
  } catch (error) {
    console.error('Bulk Update Domains Error:', error);
    return NextResponse.json({
      message: error instanceof Error ? error.message : 'Quick edit domain gagal',
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

import { clientDomainSchema } from '@/lib/validations';

// GET /api/admin/client-domains - List all domains
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const clientEmail = searchParams.get('clientEmail');
        const status = searchParams.get('status');
        const expiringSoon = searchParams.get('expiringSoon');

        const where: any = {};

        if (clientEmail) {
            where.clientEmail = clientEmail;
        }

        if (status) {
            where.status = status;
        }

        if (expiringSoon === 'true') {
            const thirtyDaysFromNow = new Date();
            thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

            where.expiredAt = {
                lte: thirtyDaysFromNow,
                gte: new Date(),
            };
        }

        const domains = await prisma.clientDomain.findMany({
            where,
            include: {
                client: {
                    select: {
                        email: true,
                        name: true,
                        company: true,
                    },
                },
                registrarRel: {
                    select: { name: true }
                },
                servers: {
                    include: {
                        server: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json(domains);
    } catch (error: any) {
        console.error('Get Domains Error:', error);
        return NextResponse.json(
            { message: error.message || 'Failed to fetch domains' },
            { status: 500 }
        );
    }
}

// POST /api/admin/client-domains - Create domain
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        // Since the schema has z.string().datetime(), we parse it first, then convert to Date for Prisma
        const validated = clientDomainSchema.safeParse(body);

        if (!validated.success) {
            return NextResponse.json(
                { message: 'Validation Error', errors: validated.error.flatten() },
                { status: 400 }
            );
        }

        const data = validated.data;
        const serverId = data.serverId;

        const domain = await prisma.clientDomain.create({
            data: {
                clientEmail: data.clientEmail,
                domainName: data.domainName,
                registrarId: data.registrarId || null,
                registeredAt: new Date(data.registeredAt),
                expiredAt: new Date(data.expiredAt),
                status: data.status,
                autoRenew: data.autoRenew,
                notes: data.notes,

                servers: serverId ? {
                    create: [{
                        server: { connect: { id: serverId } }
                    }]
                } : undefined
            },
            include: {
                client: true,
                servers: {
                    include: {
                        server: true
                    }
                }
            },
        });

        return NextResponse.json(domain, { status: 201 });
    } catch (error: any) {
        console.error('Create Domain Error:', error);
        return NextResponse.json(
            { message: error.message || 'Failed to create domain' },
            { status: 400 }
        );
    }
}

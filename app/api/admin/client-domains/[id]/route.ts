import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { z } from 'zod';

const domainSchema = z.object({
    clientEmail: z.string().min(1),
    domainName: z.string().min(1),
    registrar: z.string().optional(),
    registrarId: z.string().nullable().optional(),
    registeredAt: z.string().transform((str) => new Date(str)),
    expiredAt: z.string().transform((str) => new Date(str)),
    status: z.enum(['ACTIVE', 'EXPIRED', 'PENDING', 'SUSPENDED']).optional(),
    autoRenew: z.boolean().optional(),
    notes: z.string().optional(),
    serverId: z.string().nullable().optional(),
});

// GET /api/admin/client-domains/[id]
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const domain = await prisma.clientDomain.findUnique({
            where: { id },
            include: {
                client: true,
                servers: {
                    include: {
                        server: true,
                    },
                },
            },
        });

        if (!domain) {
            return NextResponse.json(
                { message: 'Domain not found' },
                { status: 404 }
            );
        }

        return NextResponse.json(domain);
    } catch (error: any) {
        console.error('Get Domain Error:', error);
        return NextResponse.json(
            { message: error.message || 'Failed to fetch domain' },
            { status: 500 }
        );
    }
}

// PUT /api/admin/client-domains/[id]
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const validated = domainSchema.partial().parse(body);

        const { serverId, ...updateData } = validated;

        const domain = await prisma.clientDomain.update({
            where: { id },
            data: {
                ...updateData,
                registrarId: validated.registrarId === "" ? null : validated.registrarId,
                registrar: (validated.registrarId && validated.registrarId !== "") ? validated.registrar : (validated.registrar === "" ? null : validated.registrar),
                // Manage server link
                servers: serverId !== undefined ? {
                    deleteMany: {}, // Clear existing links
                    create: serverId ? [{ serverId }] : [] // Create new link if provided
                } : undefined
            },
        });

        return NextResponse.json(domain);
    } catch (error: any) {
        console.error('Update Domain Error:', error);
        return NextResponse.json(
            { message: error.message || 'Failed to update domain' },
            { status: 400 }
        );
    }
}

// DELETE /api/admin/client-domains/[id]
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.clientDomain.delete({
            where: { id },
        });

        return NextResponse.json({ message: 'Domain deleted successfully' });
    } catch (error: any) {
        console.error('Delete Domain Error:', error);
        return NextResponse.json(
            { message: error.message || 'Failed to delete domain' },
            { status: 500 }
        );
    }
}

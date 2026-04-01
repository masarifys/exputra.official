import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { resolveClientSessionCustomer } from '@/lib/client-session';

export async function GET(request: NextRequest) {
    try {
        const sessionIdentity = await resolveClientSessionCustomer();

        if (!sessionIdentity) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }

        const customer = await prisma.customer.findUnique({
            where: { id: sessionIdentity.customerId },
            select: {
                id: true,
                email: true,
                name: true,
                phone: true,
                whatsapp: true,
                company: true,
                address: true,
                createdAt: true,
                updatedAt: true,
            }
        });

        if (!customer) {
            return NextResponse.json({ message: 'Customer not found' }, { status: 404 });
        }

        const settings = await prisma.siteSetting.findFirst({
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({
            ...customer,
            adminWhatsapp: settings?.socialWhatsapp || settings?.contactPhone || ''
        });
    } catch (error) {
        console.error('Fetch Profile Error:', error);
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
    try {
        const cookieStore = await cookies();
        const sessionIdentity = await resolveClientSessionCustomer();

        if (!sessionIdentity) {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
        }
        const body = await request.json();

        // Minimal validation
        if (!body.name || !body.email) {
            return NextResponse.json({ message: 'Nama dan Email wajib diisi' }, { status: 400 });
        }

        const updatedCustomer = await prisma.customer.update({
            where: { id: sessionIdentity.customerId },
            data: {
                name: body.name,
                email: body.email.toLowerCase(),
                phone: body.phone,
                whatsapp: body.whatsapp,
                company: body.company,
                address: body.address,
            }
        });

        // Update session if email or name changed
        if (updatedCustomer.email !== sessionIdentity.email || updatedCustomer.name !== sessionIdentity.name) {
            cookieStore.set('client_session', JSON.stringify({
                customerId: updatedCustomer.id,
                email: updatedCustomer.email,
                name: updatedCustomer.name,
            }), {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 60 * 60 * 24 * 7,
            });
        }

        return NextResponse.json(updatedCustomer);
    } catch (error: any) {
        console.error('Update Profile Error:', error);
        return NextResponse.json({ message: error.message || 'Error updating profile' }, { status: 500 });
    }
}

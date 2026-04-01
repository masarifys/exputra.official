import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { serviceSchema } from '@/lib/validations';

function getDefaultPackages(price: number) {
  return [
    {
      code: 'REGULAR',
      name: 'Paket Reguler',
      description: 'Pengerjaan normal sesuai antrean.',
      etaLabel: '5-7 hari kerja',
      price,
      durationMonths: null,
      isVisible: true,
      isActive: true,
      sortOrder: 1,
    },
    {
      code: 'PRIORITY',
      name: 'Paket Priority',
      description: 'Prioritas antrean dan komunikasi lebih cepat.',
      etaLabel: '3-4 hari kerja',
      price: Math.round(price * 1.25),
      durationMonths: null,
      isVisible: true,
      isActive: true,
      sortOrder: 2,
    },
    {
      code: 'EXPRESS',
      name: 'Paket Express',
      description: 'Pengerjaan dipercepat untuk kebutuhan urgent.',
      etaLabel: '1-2 hari kerja',
      price: Math.round(price * 1.5),
      durationMonths: null,
      isVisible: true,
      isActive: true,
      sortOrder: 3,
    },
    {
      code: 'EXT_1M',
      name: 'Perpanjangan 1 Bulan',
      description: 'Perpanjangan layanan selama 1 bulan.',
      etaLabel: 'Aktif segera',
      price,
      durationMonths: 1,
      isVisible: true,
      isActive: true,
      sortOrder: 4,
    },
    {
      code: 'EXT_2M',
      name: 'Perpanjangan 2 Bulan',
      description: 'Perpanjangan layanan selama 2 bulan.',
      etaLabel: 'Aktif segera',
      price: Math.round(price * 2),
      durationMonths: 2,
      isVisible: true,
      isActive: true,
      sortOrder: 5,
    },
    {
      code: 'EXT_3M',
      name: 'Perpanjangan 3 Bulan',
      description: 'Perpanjangan layanan selama 3 bulan.',
      etaLabel: 'Aktif segera',
      price: Math.round(price * 3),
      durationMonths: 3,
      isVisible: true,
      isActive: true,
      sortOrder: 6,
    },
  ];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const includePackages = searchParams.get('includePackages') === 'true';

    const services = await prisma.service.findMany({
      include: {
        _count: {
          select: { serviceOrders: true },
        },
        packages: includePackages
          ? {
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
              include: {
                _count: {
                  select: { serviceOrders: true },
                },
              },
            }
          : false,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(services);
  } catch (error) {
    console.error('Get Services Error:', error);
    return NextResponse.json({ message: 'Failed to fetch services' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = serviceSchema.parse(body);

    const service = await prisma.service.create({
      data: {
        ...validated,
        packages: {
          create: getDefaultPackages(validated.price),
        },
      },
      include: {
        packages: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error: any) {
    console.error('Create Service Error:', error);
    return NextResponse.json({ message: error.message || 'Failed to create service' }, { status: 400 });
  }
}

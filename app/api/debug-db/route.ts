import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const packages = await prisma.package.findMany({ 
      select: { id: true, name: true } 
    });
    const services = await prisma.servicePackage.findMany({
      select: { id: true, name: true }
    });
    const settings = await prisma.affiliateSetting.findFirst();
    
    return NextResponse.json({
      env: process.env.DATABASE_URL?.split('@')[1] || 'hidden',
      packages: {
        count: packages.length,
        items: packages
      },
      services: {
        count: services.length,
        items: services
      },
      settings
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

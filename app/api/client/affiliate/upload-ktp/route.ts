import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { resolveClientSessionCustomer } from '@/lib/client-session';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png']);

function getExtensionFromMimeType(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg';
  if (mimeType === 'image/png') return 'png';
  return '';
}

export async function POST(request: NextRequest) {
  try {
    const session = await resolveClientSessionCustomer();

    if (!session?.customerId) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ message: 'File KTP tidak ditemukan' }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ message: 'Format file tidak didukung. Gunakan JPG atau PNG' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ message: 'Ukuran file terlalu besar. Maksimal 2MB' }, { status: 400 });
    }

    const extension = getExtensionFromMimeType(file.type);
    const fileName = `${session.customerId}-${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'ktp');
    const filePath = path.join(uploadDir, fileName);

    await fs.mkdir(uploadDir, { recursive: true });

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    const publicUrl = `/uploads/ktp/${fileName}`;

    return NextResponse.json({
      success: true,
      url: publicUrl,
    });
  } catch (error) {
    console.error('Upload KTP Error:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

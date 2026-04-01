import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(req: NextRequest) {
  try {
    const { ktpUrl } = await req.json();
    
    if (!ktpUrl) {
      return NextResponse.json({ is_success: false, message: 'URL KTP tidak valid' }, { status: 400 });
    }

    const apiKey = process.env.API_CO_ID_KEY;
    if (!apiKey) {
      return NextResponse.json({ is_success: false, message: 'API_CO_ID_KEY belum dikonfigurasi' }, { status: 500 });
    }

    const filePath = path.join(process.cwd(), 'public', ktpUrl.replace(/^\//, ''));
    
    let fileBuffer;
    try {
      fileBuffer = await fs.readFile(filePath);
    } catch (e) {
      return NextResponse.json({ is_success: false, message: 'File KTP tidak ditemukan di server' }, { status: 404 });
    }

    const formData = new FormData();
    const ext = path.extname(filePath).toLowerCase();
    const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
    
    // In Node.js FormData, passing a Blob works fine
    const blob = new Blob([fileBuffer], { type: mimeType });
    formData.append('file', blob, path.basename(filePath));

    const res = await fetch('https://use.api.co.id/ocr/ktp-extract', {
      method: 'POST',
      headers: {
        'x-api-co-id': apiKey
      },
      body: formData
    });

    const data = await res.json();
    
    if (!res.ok) {
        return NextResponse.json({ is_success: false, message: data.message || 'Gagal tersambung ke layanan API KTP' }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('OCR Error:', error);
    return NextResponse.json({ is_success: false, message: error.message }, { status: 500 });
  }
}

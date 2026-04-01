import { NextRequest, NextResponse } from 'next/server';
import { resolveClientSessionCustomer } from '@/lib/client-session';

export async function GET(req: NextRequest) {
  try {
    const session = await resolveClientSessionCustomer();
    if (!session?.customerId) {
        return NextResponse.json({ is_success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.API_CO_ID_KEY;
    if (!apiKey) {
      return NextResponse.json({ is_success: false, message: 'API_CO_ID_KEY belum dikonfigurasi' }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const bankCode = searchParams.get('bank_code');
    const accountNumber = searchParams.get('account_number');
    const accountName = searchParams.get('account_name');

    if (!bankCode || !accountNumber || !accountName) {
      return NextResponse.json({ is_success: false, message: 'Parameter tidak lengkap (bank_code, account_number, account_name)' }, { status: 400 });
    }

    const apiUrl = new URL('https://use.api.co.id/validation/bank');
    apiUrl.searchParams.set('bank_code', bankCode);
    apiUrl.searchParams.set('account_number', accountNumber);
    apiUrl.searchParams.set('account_name', accountName);

    const res = await fetch(apiUrl.toString(), {
      headers: {
        'x-api-co-id': apiKey
      }
    });

    const data = await res.json();
    
    if (!res.ok) {
        return NextResponse.json({ is_success: false, message: data.message || 'Gagal validasi rekening' }, { status: res.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Client Bank Validation Error:', error);
    return NextResponse.json({ is_success: false, message: error.message }, { status: 500 });
  }
}
